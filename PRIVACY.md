# Privacy policy

[Русская версия](PRIVACY.ru.md)

Effective date: July 16, 2026

Mattermost Workflows for Codex is a local-first plugin published by Nikolai Shangin (`shanginn@gmail.com`).

## Data handled by the plugin

The bundled MCP server runs on the user's machine and connects directly to the Mattermost URL configured by that user. It processes the minimum post, channel, team, and account fields needed to answer the requested tool call. It does not send Mattermost traffic or content to the publisher, and it has no analytics or telemetry.

The server does not maintain a message index or persist retrieved Mattermost content. It keeps only short-lived, in-memory pending post drafts for the reviewed-write flow; those drafts expire after ten minutes and disappear when the process exits.

Mattermost and the user's Codex/ChatGPT environment may process and log requests under their own administrator settings, privacy terms, permissions, and retention policies.

## Credentials and local configuration

The plugin accepts a server URL and bearer token from protected environment variables or user-owned local configuration. On macOS, the supplied helper stores the token in Keychain and writes only the server URL and Keychain lookup metadata to `~/.config/codex-mattermost/config.json` with restricted permissions.

The repository does not need and must never contain real tenant URLs, workspace names, account identifiers, credentials, cookies, or captured Mattermost content. Do not put passwords, tokens, OAuth codes, cookies, private posts, or confidential identifiers into GitHub issues or chat prompts.

## Network requests

The local server makes only user-requested HTTPS calls to the configured Mattermost deployment. It does not use a publisher-operated relay. Localhost HTTP is allowed for local development; non-local HTTP URLs and URLs containing embedded credentials are rejected.

## Support data

Public GitHub issues and pull requests are visible to anyone. Sanitize server URLs, team/channel names, post content, user IDs, and error output before sharing. GitHub processes account and activity data under GitHub's own terms.

## Changes and contact

Material changes will be recorded in the repository history. Privacy questions may be sent to Nikolai Shangin at `shanginn@gmail.com`.
