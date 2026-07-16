# Repository guidance

- Keep the bundled MCP server local-first and deployment-neutral. Never commit tenant URLs,
  workspace names, account identifiers, credentials, cookies, or captured Mattermost content.
- Preserve the explicit-confirmation gate before every Mattermost write.
- Never add secrets, tokens, cookies, demo credentials, or real Mattermost content to tests or docs.
- Keep English and Russian user-facing documentation in sync.
- Run `python3 -m unittest discover -s tests -v` and the Codex plugin/skill validators before publishing.
- Keep generated image conversions reproducible from `assets/logo.svg`.
