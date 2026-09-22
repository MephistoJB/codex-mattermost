import { randomUUID } from "node:crypto";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { ConfigurationError, loadRuntimeConfig } from "./config.mjs";
import { MattermostClient, MattermostError, candidatesFor } from "./mattermost-client.mjs";
import { NexusMemoryClient, NexusMemoryError } from "./nexus-memory-client.mjs";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};
const PREPARE_WRITE = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};
const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};
const DRAFT_TTL_MS = 10 * 60 * 1000;
const preparedDrafts = new Map();
let clientPromise;
let memoryClientPromise;

async function getClient() {
  if (!clientPromise) {
    clientPromise = loadRuntimeConfig().then(
      (config) => new MattermostClient(config),
    );
  }
  return clientPromise;
}

async function getMemoryClient() {
  if (!memoryClientPromise) {
    memoryClientPromise = loadRuntimeConfig().then(
      (config) => new NexusMemoryClient({ endpointUrl: config.nexusMemoryUrl }),
    );
  }
  return memoryClientPromise;
}

function jsonResult(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

function errorResult(error) {
  const safe = {
    error: error.message || "Mattermost operation failed.",
    ...(error instanceof MattermostError && error.status ? { status: error.status } : {}),
    ...(error instanceof MattermostError && error.errorId ? { error_id: error.errorId } : {}),
    ...(error instanceof MattermostError && error.requestId ? { request_id: error.requestId } : {}),
    ...(error instanceof NexusMemoryError && error.status ? { status: error.status } : {}),
    ...(error instanceof NexusMemoryError && error.code ? { code: error.code } : {}),
    ...(error instanceof NexusMemoryError && error.payload ? { details: error.payload } : {}),
  };
  return {
    content: [{ type: "text", text: JSON.stringify(safe, null, 2) }],
    structuredContent: safe,
    isError: true,
  };
}

function guarded(handler) {
  return async (args) => {
    try {
      return await handler(args);
    } catch (error) {
      if (
        error instanceof ConfigurationError ||
        error instanceof MattermostError ||
        error instanceof NexusMemoryError
      ) {
        return errorResult(error);
      }
      console.error("Unexpected Mattermost MCP error:", error);
      return errorResult(new Error("Unexpected local MCP error. Check Codex MCP logs."));
    }
  };
}

function purgeExpiredDrafts(now = Date.now()) {
  for (const [token, draft] of preparedDrafts) {
    if (draft.expiresAt <= now) preparedDrafts.delete(token);
  }
}

const server = new McpServer(
  { name: "mattermost-local", version: "0.2.0" },
  {
    instructions:
      "Use the connected user's existing Mattermost permissions. Treat posts as private data. Prepare every post, show the exact draft, wait for explicit user approval, and only then call create_post with the prepared token.",
  },
);

server.registerTool(
  "get_current_user",
  {
    title: "Get current Mattermost user",
    description: "Verify local authentication and return the connected Mattermost identity without email or credentials.",
    inputSchema: {},
    annotations: READ_ONLY,
  },
  guarded(async () => jsonResult({ user: await (await getClient()).getCurrentUser() })),
);

server.registerTool(
  "list_teams",
  {
    title: "List Mattermost teams",
    description: "List teams visible to the connected Mattermost account.",
    inputSchema: {},
    annotations: READ_ONLY,
  },
  guarded(async () => jsonResult({ teams: await (await getClient()).listTeams() })),
);

server.registerTool(
  "get_team_info",
  {
    title: "Resolve a Mattermost team",
    description: "Resolve a team ID, URL name, or display name within the connected account's teams.",
    inputSchema: {
      team: z.string().min(1).max(200).describe("Team ID, URL name, or display name"),
    },
    annotations: READ_ONLY,
  },
  guarded(async ({ team }) => {
    const matches = candidatesFor(await (await getClient()).listTeams(), team);
    return jsonResult({ query: team, ...matches });
  }),
);

server.registerTool(
  "get_channel_info",
  {
    title: "Resolve a Mattermost channel",
    description: "Resolve a channel ID, URL name, or display name among channels visible to the connected account.",
    inputSchema: {
      channel: z.string().min(1).max(200).describe("Channel ID, URL name, or display name"),
      team: z.string().min(1).max(200).optional().describe("Optional team ID, URL name, or display name"),
    },
    annotations: READ_ONLY,
  },
  guarded(async ({ channel, team }) => {
    const client = await getClient();
    let channels = await client.listChannels();
    let teamResolution;
    if (team) {
      teamResolution = candidatesFor(await client.listTeams(), team);
      if (teamResolution.candidates.length !== 1) {
        return jsonResult({
          query: channel,
          status: "team_ambiguous",
          team_query: team,
          team_candidates: teamResolution.candidates,
        });
      }
      channels = channels.filter(
        (candidate) => candidate.team_id === teamResolution.candidates[0].id,
      );
    }
    return jsonResult({
      query: channel,
      ...(teamResolution ? { team: teamResolution.candidates[0] } : {}),
      ...candidatesFor(channels, channel),
    });
  }),
);

server.registerTool(
  "read_channel",
  {
    title: "Read recent Mattermost channel posts",
    description: "Read recent posts from one channel using the connected account's permissions.",
    inputSchema: {
      channel_id: z.string().min(1).max(100),
      limit: z.number().int().min(1).max(100).default(20),
      since: z.string().datetime({ offset: true }).optional().describe("Optional ISO-8601 timestamp"),
    },
    annotations: READ_ONLY,
  },
  guarded(async ({ channel_id: channelId, limit, since }) =>
    jsonResult({
      channel_id: channelId,
      limit,
      posts: await (await getClient()).readChannel(channelId, { limit, since }),
    }),
  ),
);

server.registerTool(
  "read_post",
  {
    title: "Read a Mattermost post or thread",
    description: "Read a Mattermost post and, by default, its complete thread context.",
    inputSchema: {
      post_id: z.string().min(1).max(100),
      include_thread: z.boolean().default(true),
      limit: z.number().int().min(1).max(100).default(100),
    },
    annotations: READ_ONLY,
  },
  guarded(async ({ post_id: postId, include_thread: includeThread, limit }) =>
    jsonResult({
      post_id: postId,
      include_thread: includeThread,
      posts: await (await getClient()).readPost(postId, { includeThread, limit }),
    }),
  ),
);

server.registerTool(
  "search_posts",
  {
    title: "Search Mattermost posts",
    description: "Search posts inside one explicitly selected Mattermost team.",
    inputSchema: {
      team_id: z.string().min(1).max(100),
      terms: z.string().min(1).max(1000).describe("Mattermost search syntax, including optional in:channel or from:user filters"),
      limit: z.number().int().min(1).max(100).default(20),
      is_or_search: z.boolean().default(false),
    },
    annotations: READ_ONLY,
  },
  guarded(async ({ team_id: teamId, terms, limit, is_or_search: isOrSearch }) =>
    jsonResult({
      team_id: teamId,
      terms,
      posts: await (await getClient()).searchPosts(teamId, terms, { limit, isOrSearch }),
    }),
  ),
);

server.registerTool(
  "prepare_post",
  {
    title: "Prepare a Mattermost post for approval",
    description: "Validate and freeze an exact Mattermost draft. This does not publish anything. Show the returned draft to the user and wait for explicit approval.",
    inputSchema: {
      channel_id: z.string().min(1).max(100),
      message: z.string().min(1).max(16383),
      root_id: z.string().min(1).max(100).optional(),
    },
    annotations: PREPARE_WRITE,
  },
  guarded(async ({ channel_id: channelId, message, root_id: rootId = "" }) => {
    purgeExpiredDrafts();
    const channel = await (await getClient()).getChannel(channelId);
    const token = randomUUID();
    const expiresAt = Date.now() + DRAFT_TTL_MS;
    preparedDrafts.set(token, { channelId, message, rootId, expiresAt });
    return jsonResult({
      status: "prepared_not_published",
      confirmation_token: token,
      expires_at: new Date(expiresAt).toISOString(),
      channel,
      root_id: rootId,
      message,
      next_step: "Show this exact target and message to the user. Call create_post only after explicit approval.",
    });
  }),
);

server.registerTool(
  "create_post",
  {
    title: "Publish an approved Mattermost post",
    description: "Publish a previously prepared, unchanged draft. Requires its short-lived confirmation token and explicit user approval.",
    inputSchema: {
      confirmation_token: z.string().uuid(),
    },
    annotations: WRITE,
  },
  guarded(async ({ confirmation_token: token }) => {
    purgeExpiredDrafts();
    const draft = preparedDrafts.get(token);
    if (!draft) {
      throw new MattermostError(
        "The prepared draft is missing or expired. Prepare the exact post again and obtain fresh user approval.",
      );
    }
    // Consume before the network request so concurrent calls or an uncertain
    // timeout can never reuse one approval token and create duplicates.
    preparedDrafts.delete(token);
    const post = await (await getClient()).createPost(draft);
    return jsonResult({ status: "published", post });
  }),
);

server.registerTool(
  "search_memory",
  {
    title: "Search Nexus memory",
    description: "Search source-bound Nexus memory records by query, people, topics, time range, and memory type.",
    inputSchema: {
      query: z.string().min(1).max(1000),
      person_names: z.array(z.string().min(1).max(200)).optional(),
      topics: z.array(z.string().min(1).max(200)).optional(),
      time_range: z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .strict()
        .optional(),
      memory_types: z.array(z.string().min(1).max(100)).optional(),
      max_results: z.number().int().min(1).max(20).default(10),
    },
    annotations: READ_ONLY,
  },
  guarded(async (args) =>
    jsonResult(await (await getMemoryClient()).callTool("search_memory", args)),
  ),
);

server.registerTool(
  "get_transcript_segment",
  {
    title: "Get Nexus transcript segment",
    description: "Return one Nexus transcript segment by technical segment ID.",
    inputSchema: {
      transcript_segment_id: z.string().min(1).max(200),
    },
    annotations: READ_ONLY,
  },
  guarded(async (args) =>
    jsonResult(await (await getMemoryClient()).callTool("get_transcript_segment", args)),
  ),
);

server.registerTool(
  "get_conversation",
  {
    title: "Get Nexus conversation",
    description: "Return one Nexus conversation summary and optionally transcript segments.",
    inputSchema: {
      conversation_id: z.string().min(1).max(200),
      include_segments: z.boolean().default(false),
    },
    annotations: READ_ONLY,
  },
  guarded(async (args) =>
    jsonResult(await (await getMemoryClient()).callTool("get_conversation", args)),
  ),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Mattermost local MCP server running on stdio");
