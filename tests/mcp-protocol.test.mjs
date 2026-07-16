import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { createInterface } from "node:readline";
import test from "node:test";

const DIST_SERVER = new URL(
  "../plugins/mattermost-workflows/dist/server.mjs",
  import.meta.url,
);

function json(response, status, value, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json", ...headers });
  response.end(JSON.stringify(value));
}

test("stdio MCP lists tools and enforces the prepared-draft write flow", async (t) => {
  let postedBody;
  const api = createServer(async (request, response) => {
    assert.equal(request.headers.authorization, "Bearer test-token");
    if (request.method === "GET" && request.url === "/api/v4/users/me") {
      json(response, 200, {
        id: "user-1",
        username: "example.user",
        first_name: "Example",
        last_name: "User",
      });
      return;
    }
    if (request.method === "GET" && request.url === "/api/v4/channels/channel-1") {
      json(response, 200, {
        id: "channel-1",
        team_id: "team-1",
        name: "example-announcements",
        display_name: "Example Announcements",
        type: "O",
      });
      return;
    }
    if (request.method === "POST" && request.url === "/api/v4/posts") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      postedBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      json(response, 201, {
        id: "post-1",
        create_at: 1_700_000_000_000,
        update_at: 1_700_000_000_000,
        user_id: "user-1",
        channel_id: postedBody.channel_id,
        root_id: postedBody.root_id || "",
        message: postedBody.message,
      });
      return;
    }
    json(response, 404, { message: "not found" });
  });
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  t.after(() => api.close());
  const address = api.address();

  const child = spawn(process.execPath, [DIST_SERVER.pathname], {
    env: {
      ...process.env,
      MATTERMOST_URL: `http://127.0.0.1:${address.port}`,
      MATTERMOST_TOKEN: "test-token",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  t.after(() => child.kill());
  child.stderr.resume();

  const lines = createInterface({ input: child.stdout });
  const pending = new Map();
  lines.on("line", (line) => {
    const message = JSON.parse(line);
    if (message.id !== undefined && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });

  let nextId = 1;
  const request = (method, params = {}) =>
    new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });

  const initialized = await request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" },
  });
  assert.equal(initialized.result.serverInfo.name, "mattermost-local");
  child.stdin.write(
    `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
  );

  const listed = await request("tools/list");
  const tools = listed.result.tools;
  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      "get_current_user",
      "list_teams",
      "get_team_info",
      "get_channel_info",
      "read_channel",
      "read_post",
      "search_posts",
      "prepare_post",
      "create_post",
    ],
  );
  assert.equal(tools.find((tool) => tool.name === "create_post").annotations.readOnlyHint, false);

  const identity = await request("tools/call", {
    name: "get_current_user",
    arguments: {},
  });
  assert.equal(identity.result.structuredContent.user.username, "example.user");

  const prepared = await request("tools/call", {
    name: "prepare_post",
    arguments: { channel_id: "channel-1", message: "Reviewed update" },
  });
  assert.equal(prepared.result.structuredContent.status, "prepared_not_published");
  assert.equal(postedBody, undefined);

  const published = await request("tools/call", {
    name: "create_post",
    arguments: {
      confirmation_token: prepared.result.structuredContent.confirmation_token,
    },
  });
  assert.equal(published.result.structuredContent.status, "published");
  assert.deepEqual(postedBody, {
    channel_id: "channel-1",
    message: "Reviewed update",
  });

  const replay = await request("tools/call", {
    name: "create_post",
    arguments: {
      confirmation_token: prepared.result.structuredContent.confirmation_token,
    },
  });
  assert.equal(replay.result.isError, true);
  child.stdin.end();
});
