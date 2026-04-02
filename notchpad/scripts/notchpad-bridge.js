#!/usr/bin/env node
/**
 * notchpad-bridge.js
 * Called by Claude Code (and other agents) as a hook command.
 * Reads hook JSON from stdin, forwards to NotchPad over Unix socket,
 * waits for response (for PreToolUse approvals), writes response to stdout.
 *
 * Usage in ~/.claude/settings.json:
 *   "command": "/path/to/notchpad-bridge.js --agent claude"
 */

const net = require("net");
const fs = require("fs");
const path = require("path");

const SOCKET_PATH = "/tmp/notchpad.sock";
const TIMEOUT_MS = 120_000; // 2 min - generous for human approval

// Parse --agent flag
const agentIdx = process.argv.indexOf("--agent");
const agent = agentIdx !== -1 ? process.argv[agentIdx + 1] : "claude";

// Read stdin
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => { raw += chunk; });
process.stdin.on("end", () => {
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    // Not JSON - silently exit, don't block the agent
    process.exit(0);
  }

  // Inject agent name
  event.agent = agent;

  // If NotchPad isn't running, pass through silently
  if (!fs.existsSync(SOCKET_PATH)) {
    process.exit(0);
  }

  const client = net.createConnection(SOCKET_PATH);
  let responded = false;

  const timeout = setTimeout(() => {
    if (!responded) {
      responded = true;
      // Timeout = approve by default (don't block agent forever)
      process.stdout.write(JSON.stringify({ decision: "approve", reason: "timeout" }) + "\n");
      client.destroy();
      process.exit(0);
    }
  }, TIMEOUT_MS);

  client.on("connect", () => {
    client.write(JSON.stringify(event) + "\n");
  });

  // For PreToolUse: wait for approval response
  let buf = "";
  client.on("data", data => {
    buf += data.toString();
    const lines = buf.split("\n");
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        clearTimeout(timeout);
        responded = true;
        // Write approval decision to stdout for Claude Code to read
        process.stdout.write(line + "\n");
        client.destroy();
        process.exit(0);
      }
    }
    buf = lines[lines.length - 1];
  });

  client.on("error", () => {
    // Socket error - pass through
    clearTimeout(timeout);
    process.exit(0);
  });

  client.on("close", () => {
    if (!responded) {
      clearTimeout(timeout);
      process.exit(0);
    }
  });
});
