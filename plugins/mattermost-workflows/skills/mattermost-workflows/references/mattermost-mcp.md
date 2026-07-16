# Mattermost MCP reference

Use this reference for setup, authentication, compatibility, or tool-discovery questions.

## Bundled local server

The plugin includes a local stdio MCP server that calls the standard Mattermost REST API v4. It is the default path for Mattermost 10.11 and does not require administrator access or the Mattermost Agents plugin.

The plugin's `.mcp.json` launches `node ./dist/server.mjs`. The process reads configuration in this order:

1. `MATTERMOST_URL` and `MATTERMOST_TOKEN`, when both are set.
2. A JSON file selected by `CODEX_MATTERMOST_CONFIG`.
3. `~/.config/codex-mattermost/config.json`.

On macOS, use `scripts/configure-macos.mjs` from the plugin/repository to store a session token or personal access token in Keychain. The JSON file contains only the server URL and Keychain lookup metadata. Never ask the user to paste a token, password, OAuth code, or cookie into chat.

The server connects directly from the user's machine to the configured deployment and uses only the connected account's existing permissions. It does not proxy traffic through the publisher, persist post content, extract browser cookies, or send telemetry.

## Tools

- `get_current_user`: return a minimal identity summary for the connected account.
- `list_teams`: list teams visible to the connected account.
- `get_team_info`: resolve a team by ID, display name, or URL name.
- `get_channel_info`: resolve a channel visible to the account by ID, display name, or URL name.
- `read_channel`: retrieve recent channel posts; accepts a channel ID, limit, and optional ISO-8601 `since` timestamp.
- `read_post`: retrieve a post and optionally its thread.
- `search_posts`: search posts with optional team/channel filters.
- `prepare_post`: validate and freeze one post or reply without publishing it; returns a short-lived, single-use confirmation token.
- `create_post`: publish only the draft represented by a valid confirmation token. The skill still requires explicit user approval after `prepare_post` and before this call.

Tool namespaces vary by Codex host. Select tools by their advertised semantic name and schema rather than assuming a fixed namespace prefix.

## Authentication behavior

The API client sends the configured token as an HTTP Bearer token. A normal session token created through `/api/v4/users/login` works when the deployment permits password/API login. Personal access tokens also work when enabled for the account. SSO-only deployments may require an administrator-approved token method; the plugin does not bypass that policy.

Non-local deployments must use HTTPS. URLs containing credentials, query strings, or fragments are rejected. The server never returns the configured token in a tool response.

## Optional official endpoint

On Mattermost deployments that provide the official external Agents MCP endpoint, it may be connected separately as a Streamable HTTP server. Availability and authentication depend on the deployment's Mattermost version, license, and administrator configuration. The bundled local server is independent of that endpoint.

`scripts/check_mattermost_url.py` validates a base URL and derives the conventional official endpoint only for this optional setup. It never accepts credentials.

## Out of scope

Do not use development-mode tools, `create_post_as_user`, user/team/channel creation, membership changes, permission bypasses, browser-cookie extraction, or bulk posting.
