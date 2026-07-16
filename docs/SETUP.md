# Setup

[Русская версия](SETUP.ru.md)

## 1. Enable the supported Mattermost endpoint

A Mattermost administrator must:

1. Use Mattermost Server 11.2 or later.
2. Open **System Console > Plugins > Agents > Model Context Protocol (MCP)**.
3. Enable **Mattermost MCP Server (HTTP)**.
4. Enable OAuth 2.0 service-provider support and configure manual or dynamic client registration, or provide an approved PAT-based policy.
5. Review which Mattermost MCP tools are enabled and which require approval.

The endpoint is:

```text
https://YOUR-MATTERMOST-HOST/plugins/mattermost-ai/mcp-server/mcp
```

Mattermost's current admin guide lists MCP Support under Entry, Enterprise, and Enterprise Advanced. Confirm your deployment's entitlement with your Mattermost administrator.

## 2. Connect Codex

In ChatGPT desktop:

1. Open **Settings > MCP servers**.
2. Select **Add server**.
3. Name it `mattermost`.
4. Choose **Streamable HTTP**.
5. Enter the endpoint above.
6. Save and restart.
7. Select **Authenticate** and complete OAuth if prompted.

Codex CLI and the IDE extension share the same Codex-host MCP configuration. Do not put a PAT directly in project files. If your administrator requires bearer-token authentication, store the token in a protected environment variable and reference that variable from Codex's MCP configuration.

## 3. Install the plugin

During development:

```text
codex plugin marketplace add /absolute/path/to/codex-mattermost
codex plugin add mattermost-workflows@personal
```

Start a new task after installation.

## 4. Verify safely

Use read-only checks first:

1. “Resolve the Engineering team and Release channel, but do not read messages yet.”
2. “Read the latest five posts and list their IDs without summarizing.”
3. “Summarize those posts and include their source IDs.”
4. “Draft a one-line reply, but do not post it.”

Only test publishing in a non-sensitive test channel. Confirm the exact target and text when the plugin asks.

## Troubleshooting

- **No Mattermost tools:** verify the server is enabled, the URL includes `/plugins/mattermost-ai/mcp-server/mcp`, restart Codex, and complete authentication.
- **OAuth fails:** ask the Mattermost administrator whether the OAuth service provider and client registration are enabled.
- **Forbidden channel:** the connected Mattermost account does not have access; the plugin must not bypass this.
- **Write unavailable:** the administrator may have disabled `create_post` or set an approval policy. This is expected and should be respected.

Sources: [Mattermost Agents admin guide](https://docs.mattermost.com/agents/docs/admin_guide.html), [Mattermost MCP server](https://docs.mattermost.com/agents/mcpserver/README.html), and [Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp).
