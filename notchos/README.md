# NotchOS

**Air traffic control for your AI coding agents.**

A macOS desktop app that monitors Claude Code, Codex CLI, and Gemini CLI from a single floating interface. Approve permissions, review plans, jump to terminals, and track costs, all without leaving your editor.

Built with Tauri 2 (Rust + React). Open source.

---

## Features

**Three modes, one surface.** NotchOS lives in your macOS notch and decompresses as you need it.

- **Notch Bar** (220x48) — Glanceable status orbs. Agent count + session cost.
- **Expanded Pill** (380x200) — Agent list with model, status, elapsed time, pending badges.
- **Command Center** (720x420) — Full dashboard: agent roster, approval surface, metrics, timeline.

**Zero-config agent discovery.** On first launch, NotchOS detects your installed agents (Claude Code, Codex, Gemini CLI) and configures hooks automatically.

**Physics-based design.** The "Deep Field" design system uses physics to encode information:
- **Murmuration rings** — Canvas particle systems where density encodes metrics (context health, budget burn)
- **Spacetime grid** — Background grid deforms toward active agents, intensity scales with team activity
- **Orbital frequency** — Each agent status has a distinct animation signature (idle breathes, writing pulses, error tremors)
- **Gravitational weight** — High-risk approvals physically expand, low-risk compress. You feel the weight before reading the label.

**Approve without switching.** Permission requests appear inline with syntax-highlighted diffs, risk tier badges (LOW/MEDIUM/HIGH), and keyboard shortcuts (Cmd+Y approve, Cmd+N deny). High-risk approvals auto-expand the Command Center.

**Answer agent questions.** When an agent asks "Which deployment target?", numbered option buttons appear with Cmd+1/2/3 shortcuts.

**Review plans.** Agent-submitted plans render as formatted text with Approve, Deny, and Request Changes buttons.

**Terminal jump.** Double-click any agent to jump to their terminal window (iTerm2, Terminal.app, Ghostty, VS Code, Cursor).

**Session history.** Every session persists to SQLite (`~/.notchos/history.db`). Search by agent, project, date. Toggle with Cmd+H.

**Team orchestration.** Agents working in the same directory auto-group as a "team" with shared timeline.

**Cost tracking.** Estimated cost per agent with budget burn murmuration ring. See your spend rate at a glance.

**Sound alerts.** Procedural 8-bit tones for agent events (approval requested, high-risk, finished, error). Mute toggle in TopBar.

**Clickable file paths.** File paths in diffs are teal links. Click to open in your editor, Cmd+Click to reveal in Finder.

---

## Install

### macOS (build from source)

```bash
# Requirements: Node.js 18+, Rust, Xcode Command Line Tools
git clone https://github.com/YOUR_USERNAME/notchos.git
cd notchos/notchos
npm install
npx tauri build
```

The built app is at `src-tauri/target/release/bundle/macos/NotchOS.app`.

**Note:** The binary is unsigned. On first launch, right-click the app, select "Open", and confirm the security dialog.

### Development

```bash
cd notchos/notchos
npm install
npx tauri dev             # Hot-reload development (opens app window)
npx vite dev --port 5199  # Browser-only dev (mock data, no Tauri)
```

---

## How It Works

NotchOS hooks into your AI agents via their hook/plugin systems:

```
Agent CLI (claude/codex/gemini)
  -> Hook fires on tool use
  -> notchos-bridge.cjs (stdin JSON -> Unix socket)
  -> NotchOS Rust backend (/tmp/notchos.sock)
  -> React frontend updates in real-time
  -> User approves/denies from the notch
  -> Response flows back through socket -> bridge -> agent continues
```

On first launch, NotchOS auto-detects installed agents and injects hook entries into their config files. No manual setup required.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+Y | Approve |
| Cmd+N | Deny |
| Cmd+Shift+N | Toggle Command Center |
| Cmd+H | Toggle History |
| Cmd+] | Next agent |
| Cmd+[ | Previous agent |
| Cmd+1/2/3 | Answer agent questions |
| Esc | Dismiss / collapse one level |

---

## Architecture

```
notchos/
  src-tauri/            # Rust backend (Tauri 2)
    src/
      lib.rs            # Socket server, session state, approval blocking
      agents/           # Auto-discovery: claude.rs, codex.rs, gemini.rs
      history.rs        # SQLite persistence
      editor.rs         # Open in editor / reveal in Finder
      terminal.rs       # Terminal jump (AppleScript)
  src/                  # React frontend (TypeScript)
    App.tsx             # Mode orchestration, Framer Motion transitions
    hooks/              # useSessionBridge (real-time backend data)
    audio/              # Web Audio sound engine
    components/
      NotchBar.tsx      # Compact notch mode
      ExpandedPill.tsx  # Expanded agent list
      Onboarding.tsx    # First-run setup
      shared/           # StatusOrb, MurmurationRing, ClickablePath
      command-center/   # Full dashboard (9 components)
    styles/index.css    # Deep Field design system tokens
  scripts/
    notchos-bridge.cjs  # Hook -> socket bridge
    dev-simulate.cjs    # Event simulator for testing
  DESIGN.md             # Canonical design specification
```

---

## Design System

NotchOS uses the **Deep Field** design language. Cool darkness with warm light. Mathematical fabric, not void.

- **Palette:** Cool blue-gray backgrounds (#13161C to #2C323C), warm cream text (#E0D8D0)
- **Signals:** Teal (success), Gold (warning), Coral (danger), Steel (waiting), Ripple (executing)
- **Typography:** Sora (UI), B612 Mono (data), Departure Mono (labels)
- **Borders:** 0.5px, no shadows, depth via color steps
- **Radius:** 12px outer to 3px inner (decreasing precision scale)

See [DESIGN.md](DESIGN.md) for the full specification.

---

## License

MIT

---

Built by Tony Diefenbach.
