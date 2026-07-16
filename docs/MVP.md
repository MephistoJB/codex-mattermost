# MVP scope

[Русская версия](MVP.ru.md)

## Goal

Give Codex a predictable, reviewable workflow for common Mattermost knowledge-work tasks on deployments that expose REST API v4, including Mattermost 10.11, without a hosted proxy or administrator-only Agents features.

## Included

1. **Local stdio MCP server** bundled with the plugin and launched by Codex.
2. **Identity and discovery** through `get_current_user`, `list_teams`, `get_team_info`, and `get_channel_info`.
3. **Channel/thread reading** through `read_channel` and `read_post`.
4. **Scoped post search** through `search_posts`, with optional team/channel filters.
5. **Reviewed posting** through a two-phase write: `prepare_post` freezes the exact target and message; `create_post` accepts only the resulting short-lived, single-use confirmation token after the user approves that exact draft.
6. **Local authentication** from environment variables or a user-owned configuration file. The macOS helper stores tokens in Keychain and never in the repository.
7. **English and Russian documentation**, public privacy/terms/support pages, marketplace copy, and reviewer test cases.

The server uses only the connected account's existing Mattermost permissions. It neither elevates access nor exposes administrator-only operations.

## Excluded

- A publisher-hosted MCP service, relay, or proxy.
- Committed tenant URLs, workspace names, user identifiers, credentials, cookies, or captured Mattermost content.
- Browser-session or cookie extraction.
- Creating users, teams, or channels.
- Membership or permission changes.
- `create_post_as_user`, impersonation, or development-mode identity tools.
- Attachments and local-file upload.
- Bulk or scheduled posting.
- Background sync, indexing, analytics, or telemetry.
- A custom ChatGPT UI.

## Success criteria

- Plugin and skill validators pass.
- Automated tests pass without network access or real credentials.
- A local Codex marketplace can install the plugin and launch its bundled MCP server.
- The server speaks the MCP stdio protocol and maps the MVP tools to REST API v4.
- Read workflows identify their source scope and do not fabricate results.
- A write cannot be published with a changed, expired, or already-used draft token.
- The public repository contains only generic examples and synthetic fixtures.
- The submission package contains exactly five positive and three negative reviewer tests.

## Distribution strategy

The GitHub repository is the distribution source. The plugin contains a local MCP executable, not a public HTTP endpoint, so no publisher-controlled Mattermost service or domain verification is required. Users authenticate directly to their own Mattermost deployment on their own machine.
