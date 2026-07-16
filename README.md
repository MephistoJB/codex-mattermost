# Mattermost Workflows for Codex

[Русская версия](README.ru.md)

A local-first Codex plugin for working safely with Mattermost through a bundled MCP server. It uses the standard Mattermost REST API v4 and is compatible with Mattermost 10.11, so it does not require the official Agents MCP plugin or administrator access.

Codex can summarize channels and threads, search conversations, and publish a reviewed post. The MCP process runs locally and connects directly from the user's machine to the user's Mattermost deployment. The publisher never receives that traffic.

> This project is not affiliated with, endorsed by, or sponsored by Mattermost, Inc. or OpenAI.

## MVP

- Identify the connected user and list accessible teams.
- Resolve team and channel names using the account's existing permissions.
- Read and summarize a channel or thread.
- Search posts within a requested team or channel scope.
- Freeze a new post or reply, show the exact target and text, and publish it only after explicit approval.
- Store local credentials outside the repository, with macOS Keychain support.

Creating users, teams, or channels; membership changes; impersonation; attachments; bulk posting; background indexing; and browser-cookie reuse are outside the MVP. See [MVP scope](docs/MVP.md).

## Requirements

- Mattermost 10.11 or another deployment exposing the compatible REST API v4 endpoints.
- A normal Mattermost account with access to the channels you want to use. No admin access is required.
- Codex with plugin and local MCP support.
- Node.js 18 or later only when building from source. The plugin includes the built server.

## Install

From this repository marketplace:

```text
codex plugin marketplace add shanginn/codex-mattermost --ref main
codex plugin add mattermost-workflows@personal
```

Start a new task after installation so Codex loads the plugin and its MCP server.

## Connect your Mattermost account

On macOS, the recommended setup creates an ordinary Mattermost session and stores only the resulting token in Keychain. Run this from the cloned repository and substitute your own host and login locally:

```text
node plugins/mattermost-workflows/scripts/configure-macos.mjs \
  --server-url https://chat.example.com \
  --login-id YOUR_LOGIN
```

The password is entered interactively, is not printed, and is not saved. The generated config lives at `~/.config/codex-mattermost/config.json`; it contains the server URL and Keychain lookup metadata, but no secret.

You can alternatively supply an existing session token or personal access token through standard input, or use the `MATTERMOST_URL` and `MATTERMOST_TOKEN` environment variables. Never commit either value or paste secrets into chat. See the complete [setup guide](docs/SETUP.md).

## Example prompts

- “Who am I connected as, and which Mattermost teams can I access?”
- “Summarize decisions and action items from the channel I name since Monday.”
- “Find posts in this team about database connection exhaustion.”
- “Draft a maintenance notice for the channel I name. Do not post it until I approve.”

## Development and tests

The plugin lives at `plugins/mattermost-workflows`; the local marketplace is `.agents/plugins/marketplace.json`.

```text
npm install
npm test
```

The test suite builds the bundled server, exercises the MCP protocol and Mattermost API adapter against local fixtures, and validates the plugin, bilingual documentation, safety gates, attribution, and reviewer cases. It never connects to a real Mattermost deployment.

## Privacy, support, and terms

- [Privacy](PRIVACY.md) · [Конфиденциальность](PRIVACY.ru.md)
- [Terms](TERMS.md) · [Условия](TERMS.ru.md)
- [Support](SUPPORT.md) · [Поддержка](SUPPORT.ru.md)
- [Contributing](CONTRIBUTING.md) · [Участие](CONTRIBUTING.ru.md)
- [Third-party notices](plugins/mattermost-workflows/THIRD_PARTY_NOTICES.md)

## License and required attribution

This project uses the custom [Shangin Attribution License 1.0](LICENSE). Any use, deployment, derivative, or fork must include:

> Based on Mattermost Workflows for Codex by Nikolai Shangin (shanginn@gmail.com).

The custom license is source-available and attribution-required; it is not represented as an OSI-approved license. Third-party components remain under their own licenses.
