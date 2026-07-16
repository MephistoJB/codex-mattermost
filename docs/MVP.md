# MVP scope

[Русская версия](MVP.ru.md)

## Goal

Give Codex a predictable, reviewable workflow for common Mattermost knowledge-work tasks without operating a proxy or storing Mattermost credentials.

## Included

1. **Channel/thread summary** using `read_channel` or `read_post`.
2. **Scoped post search** using `search_posts`, with optional team/channel filters.
3. **Target resolution** using `get_team_info` and `get_channel_info`.
4. **Reviewed posting** using `create_post` only after the user approves the exact target and message.
5. **Setup fallback** that explains how to connect the official production Mattermost MCP endpoint.
6. **English and Russian documentation**, public privacy/terms/support pages, marketplace listing copy, and reviewer test cases.

## Excluded

- Hosting, proxying, or reimplementing an MCP server.
- Creating users, teams, or channels.
- Membership or permission changes.
- `create_post_as_user`, password use, or impersonation.
- Development-mode Mattermost tools.
- Attachments and local-file upload.
- Bulk or scheduled posting.
- Background sync, indexing, analytics, or telemetry.
- A custom ChatGPT UI.

## Success criteria

- Plugin and skill validators pass.
- Automated tests pass without network access or credentials.
- A local Codex marketplace can install the plugin.
- Read workflows identify their source scope and do not fabricate results.
- Write workflows cannot publish before explicit approval.
- The submission package contains exactly five positive and three negative reviewer tests.

## Marketplace strategy

The initial public submission is **Skills only**. A “With MCP” submission requires a single publisher-controlled production MCP URL and domain verification. Mattermost's supported MCP endpoint is tenant-specific and controlled by each user's Mattermost administrator, so this project does not claim or proxy that endpoint.
