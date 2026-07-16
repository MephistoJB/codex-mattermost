#!/usr/bin/env python3
"""Validate a Mattermost base URL and print its production MCP endpoint."""

from __future__ import annotations

import argparse
import json
from urllib.parse import urlparse

MCP_PATH = "/plugins/mattermost-ai/mcp-server/mcp"


def derive_endpoint(value: str) -> str:
    candidate = value.strip().rstrip("/")
    parsed = urlparse(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("expected an absolute http(s) Mattermost URL")
    if parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("production Mattermost MCP endpoints must use HTTPS")
    if candidate.endswith(MCP_PATH):
        return candidate
    return f"{parsed.scheme}://{parsed.netloc}{MCP_PATH}"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate a Mattermost server URL and derive its MCP endpoint."
    )
    parser.add_argument("server_url", help="Mattermost base URL or full MCP endpoint")
    parser.add_argument("--json", action="store_true", help="emit machine-readable output")
    args = parser.parse_args()
    try:
        endpoint = derive_endpoint(args.server_url)
    except ValueError as exc:
        parser.error(str(exc))

    payload = {
        "endpoint": endpoint,
        "transport": "streamable_http",
        "authentication": "oauth_preferred",
    }
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True))
    else:
        print(endpoint)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
