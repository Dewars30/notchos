# NotchOS

A floating agent HUD for Claude Code, Codex, and Gemini CLI. Lives at the top of your screen. Surfaces approval requests without context-switching.

Built with Tauri 2 (Rust + React). Native macOS, no Electron, ~40MB RAM.

---

## What it does

- **Monitors** all active agent sessions in a compact top-center bar
- **Auto-surfaces** approval panels when Claude Code requests a tool (`PreToolUse`)
- **Allow / Deny** with `⌘Y` / `⌘N` — no terminal focus needed
- **Session detail** on click — status, last message, tool in progress
- **Multi-agent** — Claude Code, Codex CLI, and Gemini CLI in one view
- **Zero cloud** — everything over a local Unix socket at `/tmp/notchos.sock`

---

## Prerequisites

| Tool | Install |
|------|---------|
| Rust (stable) | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Node 18+ | `brew install node` |
| Xcode CLT | `xcode-select --install` |
| Tauri CLI | installed via npm (see below) |

---

## Build & run

```bash
# 1. Clone / cd into project
cd notchos

# 2. Install JS dependencies
npm install

# 3. Generate placeholder icons (one-time)
node scripts/gen-icons.js

# 4. Dev mode (hot reload)
npm run tauri dev

# 5. Production build
npm run tauri build
# → src-tauri/target/release/bundle/macos/NotchOS.app
```

---

## Hook setup

After the app is running, wire up Claude Code's hooks:

```bash
bash scripts/setup.sh
```

That's it. The script writes hook entries into `~/.claude/settings.json` pointing to the bridge script. For Codex and Gemini, see `scripts/agent-hooks-reference.txt`.

**Verify it's working:**
```bash
# Simulate a notification event
echo '{"hookEventName":"Notification","sessionId":"test-1","message":"hello from test","agent":"claude"}' \
  | node scripts/notchos-bridge.js --agent claude
```

You should see the session appear in the HUD.

---

## Simulate events (dev)

Without running a real agent, you can test every UI state:

```bash
# Basic session lifecycle
node scripts/dev-simulate.js basic

# Approval flow (triggers Allow/Deny panel)
node scripts/dev-simulate.js approval

# Three agents simultaneously
node scripts/dev-simulate.js multi

# Rapid events stress test
node scripts/dev-simulate.js stress
```

---

## Architecture

```
Claude Code
  └─ hook (PreToolUse/PostToolUse/Notification/Stop)
       └─ notchos-bridge.js   ← node script, reads stdin, writes to socket
            └─ /tmp/notchos.sock
                 └─ Rust socket server (lib.rs)
                      ├─ updates AppState (sessions vec)
                      ├─ emits "sessions_updated" to frontend
                      └─ blocks PreToolUse until React sends approve/deny
                           └─ React (App.tsx)
                                ├─ AgentPill    — per-session indicator
                                ├─ ApprovalPanel — allow/deny UI
                                └─ SessionDetail — status/history
```

**PreToolUse approval flow:**
1. Claude Code fires hook → bridge writes event to socket
2. Rust creates a `oneshot::channel`, stores sender, waits
3. React receives `sessions_updated`, sees `pendingApproval`, expands panel
4. User presses ⌘Y or ⌘N → React calls `invoke("approve")` or `invoke("deny")`
5. Rust sends `ApprovalResponse` through the oneshot channel
6. Bridge receives JSON on socket → writes to stdout
7. Claude Code reads stdout, proceeds or aborts

---

## Window behavior

- Frameless, transparent background, always-on-top, non-activating
- Positioned at top-center of primary monitor on launch
- Height animates: 72px (idle) → 200px (detail) → 320px (approval)
- Drag the bar to reposition
- On Macs with a notch: manually position to sit just below the notch edge (y=0 works on most configs)

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘Y` | Approve pending tool call |
| `⌘N` | Deny pending tool call |
| `Esc` | Collapse expanded panel |

---

## Roadmap / known gaps

- [ ] Terminal jump (AppleScript to iTerm2) — bridge exists, needs wiring
- [ ] Codex hook auto-setup (currently manual)  
- [ ] Gemini CLI hook auto-setup (currently manual)
- [ ] Sound alerts on approval request
- [ ] Session history log
- [ ] Auto-dismiss done sessions after N seconds
- [ ] Login item (launch at login)

---

## File map

```
notchos/
├── src-tauri/
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs          entry point
│       └── lib.rs           socket server, state, Tauri commands
├── src/
│   ├── main.tsx
│   ├── App.tsx              HUD root, session polling
│   ├── types.ts
│   ├── styles/index.css
│   └── components/
│       ├── AgentPill.tsx    per-session status indicator
│       ├── ApprovalPanel.tsx allow/deny UI
│       └── SessionDetail.tsx expanded session info
└── scripts/
    ├── notchos-bridge.js   hook bridge (called by agents)
    ├── setup.sh             Claude Code hook installer
    ├── dev-simulate.js      event simulator for dev
    ├── gen-icons.js         placeholder icon generator
    └── agent-hooks-reference.txt
```
