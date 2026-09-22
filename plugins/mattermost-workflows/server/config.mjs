import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export function defaultConfigPath(home = homedir()) {
  return join(home, ".config", "codex-mattermost", "config.json");
}

export function normalizeServerUrl(value) {
  if (!value || typeof value !== "string") {
    throw new ConfigurationError(
      "Mattermost is not configured. Set MATTERMOST_URL or run the local configuration helper.",
    );
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new ConfigurationError("MATTERMOST_URL must be an absolute HTTP(S) URL.");
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new ConfigurationError("MATTERMOST_URL must be an HTTP(S) URL without embedded credentials.");
  }
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !isLocal) {
    throw new ConfigurationError("Non-local Mattermost servers must use HTTPS.");
  }
  if (parsed.search || parsed.hash) {
    throw new ConfigurationError("MATTERMOST_URL must not include a query string or fragment.");
  }

  return parsed.toString().replace(/\/$/, "");
}

export function normalizeOptionalHttpUrl(value, label) {
  if (!value || typeof value !== "string" || !value.trim()) return undefined;

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new ConfigurationError(`${label} must be an absolute HTTP(S) URL.`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new ConfigurationError(`${label} must be an HTTP(S) URL without embedded credentials.`);
  }
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !isLocal) {
    throw new ConfigurationError(`${label} must use HTTPS unless it points to localhost.`);
  }
  if (parsed.hash) {
    throw new ConfigurationError(`${label} must not include a fragment.`);
  }

  return parsed.toString();
}

async function readConfigFile(path) {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new ConfigurationError(`Invalid Mattermost config at ${path}.`);
    }
    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    if (error instanceof ConfigurationError) throw error;
    if (error instanceof SyntaxError) {
      throw new ConfigurationError(`Mattermost config is not valid JSON: ${path}.`);
    }
    throw error;
  }
}

async function readMacOSKeychainToken(auth) {
  if (process.platform !== "darwin") {
    throw new ConfigurationError(
      "The configured macOS Keychain credential is only available on macOS. Use MATTERMOST_TOKEN on this platform.",
    );
  }
  const service = auth?.service || "codex-mattermost";
  const account = auth?.account;
  if (!account || typeof account !== "string") {
    throw new ConfigurationError("The Mattermost Keychain account is missing from local config.");
  }
  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/security",
      ["find-generic-password", "-s", service, "-a", account, "-w"],
      { encoding: "utf8", maxBuffer: 64 * 1024 },
    );
    const token = stdout.trim();
    if (!token) throw new Error("empty credential");
    return token;
  } catch {
    throw new ConfigurationError(
      "Mattermost authentication is not available in macOS Keychain. Run the local configuration helper again.",
    );
  }
}

export async function loadRuntimeConfig(env = process.env) {
  const configPath =
    env.CODEX_MATTERMOST_CONFIG || env.MATTERMOST_CONFIG || defaultConfigPath();
  const hasCompleteEnvironmentConfig = Boolean(
    env.MATTERMOST_URL?.trim() && env.MATTERMOST_TOKEN?.trim(),
  );
  const fileConfig = hasCompleteEnvironmentConfig
    ? {}
    : await readConfigFile(configPath);
  const serverUrl = normalizeServerUrl(env.MATTERMOST_URL || fileConfig.serverUrl);
  const nexusMemoryUrl = normalizeOptionalHttpUrl(
    env.NEXUS_MEMORY_MCP_URL || fileConfig.nexusMemoryMcpUrl,
    "NEXUS_MEMORY_MCP_URL",
  );

  const getToken = async () => {
    const environmentToken = env.MATTERMOST_TOKEN?.trim();
    if (environmentToken) return environmentToken;
    if (fileConfig.auth?.type === "macos-keychain") {
      return readMacOSKeychainToken(fileConfig.auth);
    }
    throw new ConfigurationError(
      "Mattermost authentication is not configured. Set MATTERMOST_TOKEN or run the local configuration helper.",
    );
  };

  return { configPath, serverUrl, getToken, nexusMemoryUrl };
}
