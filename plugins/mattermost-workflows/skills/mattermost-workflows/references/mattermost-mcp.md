# Mattermost MCP reference

Use this reference only for setup or tool-discovery questions.

## Production endpoint

For supported production use, a Mattermost administrator enables the external HTTP endpoint in:

`System Console > Plugins > Agents > Model Context Protocol (MCP)`

The streamable HTTP URL is:

`https://<mattermost-host>/plugins/mattermost-ai/mcp-server/mcp`

Current Mattermost documentation lists Mattermost Server 11.2 or later and a valid OAuth or personal-access-token authentication method as external-client requirements. Prefer OAuth. Never ask the user to paste a token or OAuth code into chat.

In the ChatGPT desktop app or Codex, add a Streamable HTTP MCP server named `mattermost`, enter the endpoint, save, restart, and authenticate when prompted.

## MVP tools

- `get_team_info`: resolve a team by ID, display name, or URL name.
- `get_channel_info`: resolve a channel by ID, display name, or URL name.
- `read_channel`: retrieve recent channel posts; accepts a channel ID, limit, and optional ISO-8601 `since` timestamp.
- `read_post`: retrieve a post and optionally its thread.
- `search_posts`: search posts with optional team/channel filters.
- `create_post`: create a post or reply. This is a write and always requires explicit user approval in this skill.

Tool namespaces vary by host. Select tools by their advertised semantic name and schema rather than assuming a fixed namespace prefix.

## Out of scope

Do not use development-mode tools, `create_post_as_user`, user/team/channel creation, membership changes, or bulk posting. The standalone Mattermost MCP binary is for development/local tooling; production deployments should use the Agents plugin's embedded HTTP endpoint.

## Sources

- Mattermost MCP Server: https://docs.mattermost.com/agents/mcpserver/README.html
- Mattermost Agents Admin Guide: https://docs.mattermost.com/agents/docs/admin_guide.html
- Codex MCP configuration: https://learn.chatgpt.com/docs/extend/mcp
