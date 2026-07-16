# Setup

[Русская версия](SETUP.ru.md)

This plugin runs its own local MCP process and calls Mattermost REST API v4 directly. It is designed for Mattermost 10.11 and does not require administrator access, the Mattermost Agents plugin, an external MCP endpoint, or browser-cookie extraction.

## 1. Install the plugin

From GitHub:

```text
codex plugin marketplace add shanginn/codex-mattermost --ref main
codex plugin add mattermost-workflows@personal
```

For development from an existing clone:

```text
codex plugin marketplace add /absolute/path/to/codex-mattermost
codex plugin add mattermost-workflows@personal
```

Start a new Codex task after installing or updating the plugin.

## 2. Configure authentication on macOS

Run the helper from a clone of this repository. The recommended method logs in as an ordinary Mattermost user, receives a normal session token, and stores that token in macOS Keychain:

```text
node plugins/mattermost-workflows/scripts/configure-macos.mjs \
  --server-url https://chat.example.com \
  --login-id YOUR_LOGIN
```

Enter the Mattermost password when prompted. It is used only for the login request and is not printed, saved, or placed in a command argument. If the deployment requires MFA, the helper asks for the current code. The resulting session token is stored as a Keychain generic password under service `codex-mattermost`.

The helper also creates `~/.config/codex-mattermost/config.json` with mode `0600`. That file contains only the server URL and Keychain lookup information:

```json
{
  "serverUrl": "https://chat.example.com",
  "auth": {
    "type": "macos-keychain",
    "service": "codex-mattermost",
    "account": "chat.example.com"
  }
}
```

Do not copy this local file into the repository even though it contains no token.

### Use an existing token instead

If the account already has a personal access token or session token, pass it through standard input so it does not appear in shell history:

```text
read -r -s "MM_TOKEN?Mattermost token: "; printf '\n'
printf '%s' "$MM_TOKEN" | node plugins/mattermost-workflows/scripts/configure-macos.mjs \
  --server-url https://chat.example.com \
  --token-stdin
unset MM_TOKEN
```

Do not put a token in a command-line argument, project file, issue, or chat prompt.

## 3. Environment-variable alternative

The MCP server first checks these environment variables:

```text
MATTERMOST_URL=https://chat.example.com
MATTERMOST_TOKEN=your-session-or-personal-access-token
```

Use this only when the Codex process inherits a protected environment. Do not save these values in `.env` files inside a repository. If the variables are absent, the server uses the local config and Keychain method above.

## 4. Verify safely

Open a new Codex task and start with read-only requests:

1. “Use Mattermost Workflows. Tell me which account is connected.”
2. “List the Mattermost teams I can access.”
3. “Resolve a channel I name, but do not read messages yet.”
4. “Read the latest five posts and include their post IDs.”
5. “Draft a one-line reply, but do not post it.”

For a write, the workflow first calls `prepare_post`, shows the exact frozen target and text, and asks for explicit approval. Only then may it call `create_post` with the short-lived confirmation token. Any text or target change requires a new preparation and approval.

## Configuration precedence

1. `MATTERMOST_URL` and `MATTERMOST_TOKEN`, when both are set.
2. `CODEX_MATTERMOST_CONFIG`, when it points to an alternate local JSON config.
3. `~/.config/codex-mattermost/config.json` and the referenced Keychain item.

Non-local deployments must use HTTPS. The server rejects URLs containing embedded credentials, query strings, or fragments.

## Revoke or replace access

- To replace a saved connection, rerun the helper; it updates the matching Keychain item.
- To remove the local config, delete `~/.config/codex-mattermost/config.json`.
- To remove the saved token, delete the `codex-mattermost` generic-password item in Keychain Access.
- A Mattermost administrator or account owner can separately revoke active sessions or personal access tokens in Mattermost.

## Troubleshooting

- **No Mattermost tools:** start a new task after installing, then check that the plugin is enabled and its local MCP process starts.
- **Missing configuration:** run the helper or provide both environment variables. A URL alone is not enough.
- **Login rejected:** verify the login ID and password. Some deployments disable API login methods or require SSO; in that case use an approved existing token with `--token-stdin`.
- **Forbidden channel:** the connected account does not have access. The plugin will not bypass permissions.
- **Session expired:** rerun the helper to create and save a fresh session.
- **Write rejected:** prepare the draft again. Confirmation tokens expire after ten minutes and are single-use.

When reporting a problem, sanitize the server URL, team/channel names, post content, user IDs, and all credentials.
