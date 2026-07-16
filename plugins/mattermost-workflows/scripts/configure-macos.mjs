#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { createInterface } from "node:readline/promises";

const execFileAsync = promisify(execFile);
const DEFAULT_CONFIG = join(homedir(), ".config", "codex-mattermost", "config.json");
const SERVICE = "codex-mattermost";

function usage() {
  return `Usage:
  node configure-macos.mjs --server-url https://chat.example.com --login-id USERNAME
  node configure-macos.mjs --server-url https://chat.example.com --token-stdin

The first form creates a normal Mattermost session and stores only the resulting session token.
The second reads a personal access token or session token from standard input.
Secrets are stored in macOS Keychain; the config file contains only the server URL and key name.`;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--server-url") result.serverUrl = argv[++index];
    else if (arg === "--login-id") result.loginId = argv[++index];
    else if (arg === "--token-stdin") result.tokenStdin = true;
    else if (arg === "--config") result.configPath = argv[++index];
    else if (arg === "--help" || arg === "-h") result.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return result;
}

function normalizeServerUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    throw new Error("Non-local Mattermost servers must use HTTPS.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("The server URL must not contain credentials, a query, or a fragment.");
  }
  return parsed.toString().replace(/\/$/, "");
}

async function readAllStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const value = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8").trim();
  if (!value) throw new Error("No token was provided on standard input.");
  return value;
}

async function readSecret(prompt) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("Interactive login requires a terminal.");
  }
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  let value = "";
  try {
    for await (const chunk of process.stdin) {
      for (const character of chunk) {
        if (character === "\u0003") throw new Error("Cancelled.");
        if (character === "\r" || character === "\n") {
          process.stdout.write("\n");
          return value;
        }
        if (character === "\u007f") {
          value = value.slice(0, -1);
        } else {
          value += character;
        }
      }
    }
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
  return value;
}

async function login(serverUrl, loginId, password, mfaToken = "") {
  const response = await fetch(`${serverUrl}/api/v4/users/login`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ login_id: loginId, password, ...(mfaToken ? { token: mfaToken } : {}) }),
  });
  const token = response.headers.get("token");
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !token) {
    const error = new Error(body.message || `Mattermost login failed with HTTP ${response.status}.`);
    error.status = response.status;
    error.errorId = body.id;
    throw error;
  }
  return token;
}

async function storeConfig(configPath, serverUrl, account, token) {
  await mkdir(dirname(configPath), { recursive: true, mode: 0o700 });
  const temporary = `${configPath}.tmp-${process.pid}`;
  const payload = {
    serverUrl,
    auth: { type: "macos-keychain", service: SERVICE, account },
  };
  await writeFile(temporary, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, configPath);
  await execFileAsync(
    "/usr/bin/security",
    ["add-generic-password", "-U", "-s", SERVICE, "-a", account, "-w", token],
    { encoding: "utf8", maxBuffer: 64 * 1024 },
  );
}

async function main() {
  if (process.platform !== "darwin") throw new Error("This helper uses macOS Keychain and only runs on macOS.");
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (!options.serverUrl || (!options.loginId && !options.tokenStdin)) {
    throw new Error(usage());
  }
  if (options.loginId && options.tokenStdin) {
    throw new Error("Choose either --login-id or --token-stdin.");
  }

  const serverUrl = normalizeServerUrl(options.serverUrl);
  let token;
  if (options.tokenStdin) {
    token = await readAllStdin();
  } else {
    const password = await readSecret("Mattermost password (not stored): ");
    try {
      token = await login(serverUrl, options.loginId, password);
    } catch (error) {
      const mfaRequired = /mfa|multi-factor|authentication code/i.test(`${error.errorId || ""} ${error.message}`);
      if (!mfaRequired) throw error;
      const mfaToken = await readSecret("Mattermost MFA code: ");
      token = await login(serverUrl, options.loginId, password, mfaToken);
    }
  }

  const account = new URL(serverUrl).host;
  const configPath = options.configPath || DEFAULT_CONFIG;
  await storeConfig(configPath, serverUrl, account, token);
  console.log(`Mattermost connection saved locally in ${configPath} and macOS Keychain.`);
  console.log("The token was not written to the repository or printed.");
}

main().catch((error) => {
  console.error(`Configuration failed: ${error.message}`);
  process.exitCode = 1;
});
