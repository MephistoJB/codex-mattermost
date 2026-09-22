import { ConfigurationError } from "./config.mjs";

export class NexusMemoryError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "NexusMemoryError";
    Object.assign(this, details);
  }
}

export class NexusMemoryClient {
  constructor({ endpointUrl }) {
    if (!endpointUrl) {
      throw new ConfigurationError(
        "Nexus Memory MCP is not configured. Set NEXUS_MEMORY_MCP_URL or nexusMemoryMcpUrl in local config.",
      );
    }
    this.endpointUrl = endpointUrl;
    this.nextId = 1;
  }

  async callTool(name, args) {
    const response = await fetch(this.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: this.nextId++,
        method: "tools/call",
        params: { name, arguments: args },
      }),
    });

    if (!response.ok) {
      throw new NexusMemoryError("Nexus Memory MCP request failed.", {
        status: response.status,
      });
    }

    const payload = await response.json();
    if (payload.error) {
      throw new NexusMemoryError(payload.error.message || "Nexus Memory MCP returned an error.", {
        code: payload.error.code,
      });
    }

    const result = payload.result;
    if (result?.structuredContent) {
      if (result.isError) {
        throw new NexusMemoryError("Nexus Memory tool returned an error.", {
          payload: result.structuredContent,
        });
      }
      return result.structuredContent;
    }

    const text = result?.content?.find((item) => item.type === "text")?.text;
    if (text) return JSON.parse(text);
    throw new NexusMemoryError("Nexus Memory MCP returned an unsupported response.");
  }
}
