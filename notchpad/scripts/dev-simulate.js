#!/usr/bin/env node
/**
 * dev-simulate.js
 * Sends fake hook events to NotchPad over the Unix socket.
 * Use this to develop and test the UI without running Claude Code.
 *
 * Usage:
 *   node scripts/dev-simulate.js [scenario]
 *
 * Scenarios:
 *   basic       - one claude session, running then done
 *   approval    - triggers an approval request
 *   multi       - three agents running simultaneously
 *   stress      - rapid fire events
 */

const net = require("net");

const SOCKET_PATH = "/tmp/notchpad.sock";

function send(event) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(SOCKET_PATH);
    let response = "";

    client.on("connect", () => {
      client.write(JSON.stringify(event) + "\n");
    });

    client.on("data", d => {
      response += d.toString();
      // Got a response line - resolve
      if (response.includes("\n")) {
        client.destroy();
        resolve(response.trim());
      }
    });

    client.on("close", () => resolve(response.trim()));
    client.on("error", reject);

    // Auto-close after 200ms for non-approval events
    if (event.hookEventName !== "PreToolUse") {
      setTimeout(() => { client.destroy(); resolve(""); }, 150);
    }
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const SESSION_A = "session-claude-" + Date.now();
const SESSION_B = "session-codex-" + Date.now();
const SESSION_C = "session-gemini-" + Date.now();

async function scenario_basic() {
  console.log("▶ basic: claude session lifecycle");

  await send({ hookEventName: "Notification", sessionId: SESSION_A, agent: "claude", message: "Starting auth bug fix" });
  await sleep(800);

  await send({ hookEventName: "PostToolUse", sessionId: SESSION_A, agent: "claude", toolName: "Read", toolInput: { file_path: "src/auth/middleware.ts" } });
  await sleep(600);

  await send({ hookEventName: "PostToolUse", sessionId: SESSION_A, agent: "claude", toolName: "Read", toolInput: { file_path: "src/auth/jwt.ts" } });
  await sleep(400);

  await send({ hookEventName: "PostToolUse", sessionId: SESSION_A, agent: "claude", toolName: "Edit", toolInput: { file_path: "src/auth/middleware.ts" } });
  await sleep(500);

  await send({ hookEventName: "Stop", sessionId: SESSION_A, agent: "claude", message: "Fixed token expiry validation in middleware" });

  console.log("✓ done");
}

async function scenario_approval() {
  console.log("▶ approval: triggers PreToolUse approval gate");

  await send({ hookEventName: "Notification", sessionId: SESSION_A, agent: "claude", message: "Analyzing codebase" });
  await sleep(600);

  await send({ hookEventName: "PostToolUse", sessionId: SESSION_A, agent: "claude", toolName: "Read", toolInput: { file_path: "src/db/queries.ts" } });
  await sleep(400);

  console.log("  → Sending PreToolUse (Bash). Approve/deny in the HUD.");
  const resp = await send({
    hookEventName: "PreToolUse",
    sessionId: SESSION_A,
    agent: "claude",
    toolName: "Bash",
    toolInput: { command: "npm run db:migrate -- --env production" },
  });

  console.log("  ← Response:", resp || "(no response — timed out or denied)");

  if (resp && resp.includes("approve")) {
    await send({ hookEventName: "PostToolUse", sessionId: SESSION_A, agent: "claude", toolName: "Bash", toolInput: {} });
    await sleep(300);
    await send({ hookEventName: "Stop", sessionId: SESSION_A, agent: "claude", message: "Migration complete" });
  }

  console.log("✓ done");
}

async function scenario_multi() {
  console.log("▶ multi: three agents simultaneously");

  // Start all three
  await Promise.all([
    send({ hookEventName: "Notification", sessionId: SESSION_A, agent: "claude", message: "Fixing auth bug" }),
    send({ hookEventName: "Notification", sessionId: SESSION_B, agent: "codex", message: "Optimizing DB queries" }),
    send({ hookEventName: "Notification", sessionId: SESSION_C, agent: "gemini", message: "Writing tests" }),
  ]);
  await sleep(400);

  // Stagger some tool calls
  await send({ hookEventName: "PostToolUse", sessionId: SESSION_B, agent: "codex", toolName: "Read", toolInput: { file_path: "schema.prisma" } });
  await sleep(300);
  await send({ hookEventName: "PostToolUse", sessionId: SESSION_A, agent: "claude", toolName: "Edit", toolInput: { file_path: "middleware.ts" } });
  await sleep(300);
  await send({ hookEventName: "PostToolUse", sessionId: SESSION_C, agent: "gemini", toolName: "Write", toolInput: { file_path: "auth.test.ts" } });
  await sleep(500);

  // Codex finishes
  await send({ hookEventName: "Stop", sessionId: SESSION_B, agent: "codex", message: "Updated 3 queries, indexes added" });
  await sleep(600);

  // Claude needs approval
  console.log("  → Claude requesting Bash approval...");
  const resp = await send({
    hookEventName: "PreToolUse",
    sessionId: SESSION_A,
    agent: "claude",
    toolName: "Bash",
    toolInput: { command: "npm test -- --watch=false" },
  });
  console.log("  ← Response:", resp);

  await sleep(300);
  await send({ hookEventName: "Stop", sessionId: SESSION_A, agent: "claude", message: "All tests passing" });
  await send({ hookEventName: "Stop", sessionId: SESSION_C, agent: "gemini", message: "Test suite written" });

  console.log("✓ done");
}

async function scenario_stress() {
  console.log("▶ stress: rapid events");
  const tools = ["Read", "Edit", "Bash", "WebFetch", "Write"];
  const agents = ["claude", "codex", "gemini"];

  for (let i = 0; i < 20; i++) {
    const agent = agents[i % agents.length];
    const tool = tools[i % tools.length];
    const sid = `stress-${agent}-${Math.floor(i / agents.length)}`;
    await send({ hookEventName: "PostToolUse", sessionId: sid, agent, toolName: tool, toolInput: {} });
    await sleep(80);
  }
  console.log("✓ done");
}

const scenarios = { basic: scenario_basic, approval: scenario_approval, multi: scenario_multi, stress: scenario_stress };
const name = process.argv[2] ?? "basic";
const fn = scenarios[name];

if (!fn) {
  console.error(`Unknown scenario "${name}". Available: ${Object.keys(scenarios).join(", ")}`);
  process.exit(1);
}

fn().catch(e => {
  console.error("Error:", e.message);
  console.error("Is NotchPad running?");
  process.exit(1);
});
