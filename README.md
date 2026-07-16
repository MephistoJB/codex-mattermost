# Mattermost Workflows for Codex

[Русская версия](README.ru.md)

An independent, skills-first Codex plugin for working safely with Mattermost through Mattermost's official MCP server.

It helps Codex summarize channels and threads, search workspace conversations, and prepare reviewed posts. The plugin does not proxy Mattermost data and does not operate an MCP server of its own.

> This project is not affiliated with, endorsed by, or sponsored by Mattermost, Inc. or OpenAI.

## MVP

- Summarize a channel or thread into decisions, action items, blockers, and unresolved questions.
- Search posts within the user's requested team or channel scope.
- Resolve human-readable team and channel names before acting.
- Draft a new post or reply and require explicit approval before publishing it.
- Guide setup when the official Mattermost MCP server is not connected.

Creating users, teams, or channels; changing membership; impersonation; development-mode tools; attachments; and bulk posting are intentionally outside the MVP. See [MVP scope](docs/MVP.md).

## Requirements

- A Mattermost deployment whose administrator has enabled the external Mattermost MCP endpoint. Current Mattermost documentation lists Server 11.2 or later for external clients and may require an eligible Mattermost license.
- A Mattermost account with access to the channels you want to use.
- ChatGPT desktop, Codex CLI, or the Codex IDE extension with MCP support.
- OAuth enabled by the Mattermost administrator, or a securely configured personal access token. OAuth is preferred.

## Install

### From the Codex plugin directory

After marketplace approval, open **Plugins**, find **Mattermost Workflows**, and select **Install**.

### From this repository

```text
codex plugin marketplace add shanginn/codex-mattermost --ref main
codex plugin add mattermost-workflows@personal
```

Start a new task after installation so Codex loads the skill.

## Connect Mattermost MCP

Ask a Mattermost administrator to enable **System Console > Plugins > Agents > Model Context Protocol (MCP) > Enable Mattermost MCP Server (HTTP)**.

The production endpoint is:

```text
https://YOUR-MATTERMOST-HOST/plugins/mattermost-ai/mcp-server/mcp
```

In ChatGPT desktop, open **Settings > MCP servers**, add a **Streamable HTTP** server named `mattermost`, enter the endpoint, save, restart, and authenticate. Never paste access tokens into a chat.

See the complete [setup guide](docs/SETUP.md).

## Example prompts

- “Summarize decisions and action items from the Engineering / Release channel since Monday.”
- “Find posts in the Operations team about database connection exhaustion.”
- “Draft a maintenance notice for Town Square. Do not post it until I approve.”

## Development and tests

The plugin lives at `plugins/mattermost-workflows`. It is distributed through the repository marketplace at `.agents/plugins/marketplace.json`.

```text
python3 -m unittest discover -s tests -v
python3 plugins/mattermost-workflows/skills/mattermost-workflows/scripts/check_mattermost_url.py https://chat.example.com
```

The test suite validates the plugin manifest, bilingual documentation, exact marketplace test-case counts, workflow safety gates, attribution notice, and endpoint derivation. It uses fixtures only and never connects to Mattermost.

## Privacy, support, and terms

- [Privacy](PRIVACY.md) · [Конфиденциальность](PRIVACY.ru.md)
- [Terms](TERMS.md) · [Условия](TERMS.ru.md)
- [Support](SUPPORT.md) · [Поддержка](SUPPORT.ru.md)
- [Contributing](CONTRIBUTING.md) · [Участие](CONTRIBUTING.ru.md)

## License and required attribution

This project uses the custom [Shangin Attribution License 1.0](LICENSE). Any use, deployment, derivative, or fork must include:

> Based on Mattermost Workflows for Codex by Nikolai Shangin (shanginn@gmail.com).

The custom license is source-available and attribution-required; it is not represented as an OSI-approved license.
