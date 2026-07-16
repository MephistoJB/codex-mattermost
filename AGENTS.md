# Repository guidance

- Keep the plugin skills-only until there is a publisher-controlled production MCP endpoint.
- Preserve the explicit-confirmation gate before every Mattermost write.
- Never add secrets, tokens, cookies, demo credentials, or real Mattermost content to tests or docs.
- Keep English and Russian user-facing documentation in sync.
- Run `python3 -m unittest discover -s tests -v` and the Codex plugin/skill validators before publishing.
- Keep generated image conversions reproducible from `assets/logo.svg`.
