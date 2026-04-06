#!/usr/bin/env node
/**
 * NotchOS Agent Adapter Template
 *
 * To create a plugin for a new AI agent:
 * 1. mkdir -p ~/.notchos/plugins/your-agent
 * 2. Copy this file to ~/.notchos/plugins/your-agent/adapter.cjs
 * 3. Create manifest.json (see below)
 * 4. Configure your agent's hooks to call this adapter
 *
 * manifest.json example:
 * {
 *   "name": "your-agent",
 *   "displayName": "Your Agent",
 *   "version": "1.0.0",
 *   "abbreviation": "YA",
 *   "hookFormat": "claude-compatible",
 *   "configPath": "~/.your-agent/config.json",
 *   "installInstructions": "Add hook commands to your agent's config",
 *   "author": "your-name"
 * }
 *
 * For claude-compatible agents (same JSON stdin/stdout protocol),
 * you can use the standard notchos-bridge.cjs directly:
 *   node ~/.notchos/bin/notchos-bridge.cjs --agent your-agent
 *
 * For custom protocols, modify the translation below.
 */

const net = require("net");
const fs = require("fs");

const AGENT_NAME = "your-agent"; // Change this
const SOCKET_PATH = process.platform === 'win32'
  ? '\\\\.\\pipe\\notchos'
  : '/tmp/notchos.sock';
const TIMEOUT_MS = 120_000;

const BLOCKING_EVENTS = new Set(["PreToolUse"]);

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => { raw += chunk; });
process.stdin.on("end", () => {
  let event;
  try {
    // === CUSTOMIZE HERE ===
    // If your agent sends a different JSON format, translate it
    // to the NotchOS format:
    // {
    //   hook_event_name: "PreToolUse" | "PostToolUse" | "Notification" | "Stop",
    //   session_id: "unique-session-id",
    //   tool_name: "ToolName",
    //   tool_input: { ... },
    //   tool_response: { ... }  // PostToolUse only
    // }
    event = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  event.agent = AGENT_NAME;
  event.cwd = process.cwd();

  if (!fs.existsSync(SOCKET_PATH)) {
    process.exit(0);
  }

  const isBlocking = BLOCKING_EVENTS.has(event.hook_event_name);
  const client = net.createConnection(SOCKET_PATH);
  let responded = false;

  const timeout = setTimeout(() => {
    if (!responded) {
      responded = true;
      process.stdout.write(JSON.stringify({ decision: "approve" }) + "\n");
      client.destroy();
      process.exit(0);
    }
  }, TIMEOUT_MS);

  client.on("connect", () => {
    client.write(JSON.stringify(event) + "\n");
    if (!isBlocking) {
      clearTimeout(timeout);
      client.destroy();
      process.exit(0);
    }
  });

  let buf = "";
  client.on("data", data => {
    buf += data.toString();
    const lines = buf.split("\n");
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        clearTimeout(timeout);
        responded = true;
        process.stdout.write(line + "\n");
        client.destroy();
        process.exit(0);
      }
    }
    buf = lines[lines.length - 1];
  });

  client.on("error", () => { clearTimeout(timeout); process.exit(0); });
  client.on("close", () => { if (!responded) { clearTimeout(timeout); process.exit(0); } });
});
