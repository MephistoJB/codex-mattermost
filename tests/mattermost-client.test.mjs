import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  MattermostClient,
  MattermostError,
  candidatesFor,
} from "../plugins/mattermost-workflows/server/mattermost-client.mjs";
import {
  ConfigurationError,
  loadRuntimeConfig,
  normalizeServerUrl,
} from "../plugins/mattermost-workflows/server/config.mjs";

test("server URL validation requires HTTPS outside localhost", () => {
  assert.equal(normalizeServerUrl("https://chat.example.com/"), "https://chat.example.com");
  assert.equal(normalizeServerUrl("http://127.0.0.1:8065"), "http://127.0.0.1:8065");
  assert.throws(
    () => normalizeServerUrl("http://chat.example.com"),
    ConfigurationError,
  );
  assert.throws(
    () => normalizeServerUrl("https://user:secret@chat.example.com"),
    ConfigurationError,
  );
});

test("complete environment configuration takes precedence over local files", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "codex-mattermost-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const invalidConfig = join(directory, "config.json");
  await writeFile(invalidConfig, "not-json", "utf8");

  const config = await loadRuntimeConfig({
    CODEX_MATTERMOST_CONFIG: invalidConfig,
    MATTERMOST_URL: "https://chat.example.com",
    MATTERMOST_TOKEN: "test-token",
  });
  assert.equal(config.serverUrl, "https://chat.example.com");
  assert.equal(await config.getToken(), "test-token");
});

test("candidate resolution prefers exact names before partial names", () => {
  const items = [
    { id: "team-1", name: "example-team", display_name: "Example Team" },
    { id: "team-2", name: "example-operations", display_name: "Example Operations" },
  ];
  assert.deepEqual(candidatesFor(items, "Example Team"), {
    match_type: "exact",
    candidates: [items[0]],
  });
  assert.deepEqual(candidatesFor(items, "operations"), {
    match_type: "partial",
    candidates: [items[1]],
  });
});

test("client sends bearer auth and returns a privacy-reduced user", async () => {
  let observedAuthorization;
  const client = new MattermostClient({
    serverUrl: "https://chat.example.com",
    getToken: async () => "test-token",
    fetchImpl: async (_url, options) => {
      observedAuthorization = options.headers.Authorization;
      return new Response(
        JSON.stringify({
          id: "user-1",
          username: "example.user",
          first_name: "Example",
          last_name: "User",
          email: "must-not-be-returned@example.com",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  assert.equal(observedAuthorization, undefined);
  assert.deepEqual(await client.getCurrentUser(), {
    id: "user-1",
    username: "example.user",
    first_name: "Example",
    last_name: "User",
    nickname: "",
  });
  assert.equal(observedAuthorization, "Bearer test-token");
});

test("channel reads preserve server order and omit arbitrary post props", async () => {
  const client = new MattermostClient({
    serverUrl: "https://chat.example.com",
    getToken: async () => "test-token",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          order: ["post-2", "post-1"],
          posts: {
            "post-1": {
              id: "post-1",
              create_at: 1_700_000_000_000,
              update_at: 1_700_000_000_000,
              user_id: "user-1",
              channel_id: "channel-1",
              root_id: "",
              message: "older",
              props: { secret_plugin_data: "omit-me" },
            },
            "post-2": {
              id: "post-2",
              create_at: 1_700_000_001_000,
              update_at: 1_700_000_001_000,
              user_id: "user-2",
              channel_id: "channel-1",
              root_id: "",
              message: "newer",
            },
          },
        }),
        { status: 200 },
      ),
  });

  const posts = await client.readChannel("channel-1", { limit: 2 });
  assert.deepEqual(posts.map((post) => post.id), ["post-2", "post-1"]);
  assert.equal(posts[0].permalink, "https://chat.example.com/_redirect/pl/post-2");
  assert.equal("props" in posts[1], false);
});

test("authentication errors never include the token", async () => {
  const client = new MattermostClient({
    serverUrl: "https://chat.example.com",
    getToken: async () => "highly-sensitive-token",
    fetchImpl: async () =>
      new Response(JSON.stringify({ id: "api.context.session_expired.app_error", message: "expired" }), {
        status: 401,
        headers: { "x-request-id": "request-1" },
      }),
  });

  await assert.rejects(
    client.getCurrentUser(),
    (error) =>
      error instanceof MattermostError &&
      error.status === 401 &&
      !error.message.includes("highly-sensitive-token"),
  );
});
