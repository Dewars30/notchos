# NotchOS V2 "The Lake" Design Spec

> **Goal:** Ship the most complete AI agent control plane in the market — every platform, every agent, with physics-based design that nobody else has.

> **Positioning:** Open source + paid tier (freemium). Product first, monetization later.

> **Platforms:** macOS + Windows + Linux (Tauri 2 cross-platform)

> **Competitive context:** 10+ competitors, all macOS-only. Vibe Island (closed-source, $14.99, 6 agents) leads on features. Treland (AGPL, open source) leads on community. AgentNotch (132 stars) does monitoring only. Nobody has session history, team orchestration, or cost analytics. The market is pre-viral with no clear winner.

---

## Architecture Overview

```
Layer 4: Physics Moat        ← Design differentiation
Layer 3: Leapfrog Features   ← Session history, team orchestration, cost analytics, file paths
Layer 2: Table Stakes         ← Question answering, plan review, sound, terminal jump
Layer 1: Foundation           ← Real data wiring, agent discovery, risk scoring, cross-platform
         ─────────────
         Existing V1.5        ← Three-mode UI, physics layer, design system, Tauri backend
```

Each layer builds on the previous. Layer 1 is required before all others. Layers 2-4 can be parallelized within themselves.

---

## Layer 1: Foundation

### 1.1 Wire Frontend to Real Backend

**Current state:** React frontend uses `MOCK_AGENTS`, `MOCK_METRICS`, `MOCK_TIMELINE` from `mock-data.ts`. Tauri backend has a fully functional socket server, session state management, and emits `"sessions_updated"` events.

**Design:**

- `App.tsx` uses Tauri's `listen("sessions_updated", callback)` to subscribe to backend events
- On each event, calls `invoke("get_sessions")` to get the current `Session[]`
- A new `useSessionBridge()` hook maps `Session` (backend type) to `Agent` (frontend type):
  - `session.status` → `AgentStatus` (map "running" → "executing", "waiting" → "waiting", etc.)
  - `session.pending_approval` → `PendingApproval` with auto-scored `riskTier`
  - `session.agent` → agent name, abbreviation, model (looked up from agent registry)
- Mock data remains as fallback when `!isTauri` (browser dev mode)
- Metrics computed from live session data: total cost, total tokens, approval counts

**New Tauri command:**
```rust
#[tauri::command]
fn get_session_metrics(state: State<AppState>) -> SessionMetrics
```

**Files:**
- Create: `src/hooks/useSessionBridge.ts`
- Modify: `src/App.tsx` (replace mock data with real data subscription)
- Modify: `src-tauri/src/lib.rs` (add `get_session_metrics` command)

### 1.2 Risk Tier Auto-Scoring

**Current state:** Risk tier is hardcoded in mock data. Backend's `PendingApproval` has no `risk_tier` field.

**Design:**

Add risk classification to `lib.rs`:

```rust
fn classify_risk(tool: &str, input: &serde_json::Value) -> RiskTier {
    match tool {
        // High risk: shell commands, network, destructive operations
        "Bash" => {
            let cmd = input.get("command").and_then(|v| v.as_str()).unwrap_or("");
            if cmd.contains("rm -rf") || cmd.contains("DROP") || cmd.contains("prod")
                || cmd.contains("deploy") || cmd.contains("push --force") {
                RiskTier::High
            } else {
                RiskTier::Medium
            }
        }
        "WebFetch" | "WebSearch" => RiskTier::Medium,

        // Medium risk: file modifications
        "Write" | "Edit" | "MultiEdit" | "NotebookEdit" => {
            let path = input.get("file_path").and_then(|v| v.as_str()).unwrap_or("");
            if path.contains("auth") || path.contains("secret") || path.contains(".env")
                || path.contains("config") || path.contains("prod") {
                RiskTier::High
            } else {
                RiskTier::Medium
            }
        }

        // Low risk: read-only operations
        "Read" | "Glob" | "Grep" | "LS" | "TodoRead" | "TaskList" => RiskTier::Low,

        // Default: medium
        _ => RiskTier::Medium,
    }
}
```

**Files:**
- Modify: `src-tauri/src/lib.rs` (add `classify_risk`, include `risk_tier` in `PendingApproval`)

### 1.3 Universal Agent Discovery + Hook Injection

**Current state:** `scripts/setup.sh` patches `~/.claude/settings.json` only. Manual process.

**Design:**

A new Rust module `src-tauri/src/agents/` with:

```
agents/
  mod.rs          — AgentRegistry, discovery loop
  claude.rs       — Claude Code hook injection (~/.claude/settings.json)
  codex.rs        — Codex CLI hook injection (~/.codex/config.toml + hooks.json)
  gemini.rs       — Gemini CLI hook injection (~/.gemini/settings.json)
  cursor.rs       — Cursor Agent hook injection (~/.cursor/hooks.json)
  opencode.rs     — OpenCode hook injection
  droid.rs        — Factory Droid hook injection
  universal.rs    — Universal hook protocol definition
```

**Discovery flow (runs on app startup + every 60s):**

1. Check `PATH` for known binaries: `claude`, `codex`, `gemini`, `cursor-agent`, `opencode`, `droid`
2. Check known config directories for each agent
3. For each found agent:
   - Check if NotchOS hooks are already injected
   - If not, inject hooks pointing to the NotchOS bridge binary
   - Emit `"agent_discovered"` event to frontend
4. Track discovered agents in `~/.notchos/agents.json`

**Hook tamper detection:**
- File watcher on each agent's config file
- If hooks are removed, re-inject (rate-limited to 3/hour, like Treland)
- Show a subtle notification in TopBar: "Hooks restored for Claude Code"

**Universal hook protocol:**
```json
{
  "protocol": "notchos-hook-v1",
  "event": "PreToolUse|PostToolUse|Notification|Stop|AskUser|PlanReview",
  "session_id": "string",
  "agent": "string",
  "tool_name": "string?",
  "tool_input": "json?",
  "question": "string?",
  "options": ["string[]?"],
  "plan_markdown": "string?"
}
```

Any future agent CLI can integrate by sending this JSON to `/tmp/notchos.sock`.

**Files:**
- Create: `src-tauri/src/agents/` (module with per-agent adapters)
- Create: `~/.notchos/bin/notchos-bridge` (replaces `scripts/notchos-bridge.js`)
- Modify: `src-tauri/src/lib.rs` (add discovery on startup)

### 1.4 Cross-Platform Window Management

**Current state:** macOS-only with `macos-private-api` features. Frameless, transparent, always-on-top, non-activating.

**Design:**

Tauri 2 supports per-platform window configuration in `tauri.conf.json`:

- **macOS:** Current behavior. NSPanel via private API. Notch-anchored position. Transparent.
- **Windows:** Always-on-top window, top-center of primary monitor. Rounded corners via CSS (Windows 11 has native rounded, Windows 10 uses CSS). Non-activating via `WS_EX_NOACTIVATE` window style.
- **Linux:** Always-on-top, top-center. Window type hint `_NET_WM_WINDOW_TYPE_DOCK` for proper compositing. Transparency via compositing manager detection.

New Tauri command:
```rust
#[tauri::command]
fn get_platform() -> String // "macos" | "windows" | "linux"
```

React uses this to adjust the container:
- macOS: notch-anchored, 12px top radius
- Windows/Linux: floating panel with 12px all-around radius, subtle drop shadow

**Files:**
- Modify: `src-tauri/tauri.conf.json` (per-platform window config)
- Modify: `src-tauri/src/lib.rs` (platform-aware positioning)
- Modify: `src/App.tsx` (conditional container styling)

---

## Layer 2: Table Stakes

### 2.1 Question Answering UI

**Current state:** Only approve/deny for `PreToolUse`. No handling for `AskUserQuestion` events.

**Design:**

New hook event type: `AskUser`

When an agent asks a question:
1. Backend creates a oneshot channel (same pattern as approval)
2. Frontend renders the question text + numbered option buttons in the center bay
3. Gravitational weight applies: production-related questions → high weight (coral treatment)
4. Keyboard shortcuts: ⌘1, ⌘2, ⌘3, ⌘4 for options
5. User clicks option → response sent back through socket → agent continues

**Component:**
```
src/components/command-center/QuestionPanel.tsx
```

Reuses the same risk-tier styling from `ActiveSession.tsx`. Questions about production/deployment get auto-scored as high-risk and auto-expand to Command Center.

### 2.2 Plan Review with Markdown

**Current state:** No plan review capability.

**Design:**

New hook event type: `PlanReview`

When an agent submits a plan:
1. Backend receives plan Markdown + approval channel
2. Frontend renders Markdown in the center bay using a lightweight renderer (no heavy deps — parse Markdown to React elements in a `MarkdownRenderer.tsx` component)
3. Three action buttons: Approve, Deny, Request Changes (with text input)
4. Scrollable, with section headings highlighted
5. High-risk plans (touching auth, prod, billing) get gravitational weight

**Component:**
```
src/components/command-center/PlanReview.tsx
src/components/shared/MarkdownRenderer.tsx
```

### 2.3 Sound Alerts

**Current state:** No sound system.

**Design:**

Sound events:
- Agent started → soft ping
- Tool use completed → subtle click
- Approval requested → attention tone
- High-risk approval → warning pulse (two-tone)
- Agent finished → completion chime
- Error → error buzz

Implementation:
- Web Audio API (works cross-platform in Tauri's WebView)
- Default sound pack: procedurally generated 8-bit tones (no audio files needed)
- Custom packs: JSON manifest + audio files in `~/.notchos/sounds/<pack-name>/`
- Mute toggle in TopBar (persisted to `~/.notchos/settings.json`)
- Volume control in settings

**Files:**
- Create: `src/audio/SoundEngine.ts` (Web Audio synthesis + custom pack loading)
- Create: `src/audio/defaultSounds.ts` (procedural generation)
- Modify: `src/components/command-center/TopBar.tsx` (mute toggle)

### 2.4 Terminal Jump

**Current state:** Not implemented. Bridge script exists but terminal jump logic is missing.

**Design:**

Click agent in roster → invoke Tauri command → platform-specific terminal activation.

**macOS (AppleScript/osascript):**
```rust
fn jump_to_terminal_macos(app_name: &str, session_cwd: &str) {
    // 1. Activate app by name (iTerm2, Terminal, Ghostty, etc.)
    // 2. Search windows/tabs by title matching session_cwd
    // 3. Focus the matching tab/pane
}
```

Supported terminals: iTerm2 (AppleScript API), Terminal.app (AppleScript), Ghostty (window title matching), Warp, VS Code (CLI: `code --goto`), Cursor (CLI), Kitty (remote control protocol), Alacritty (window title), WezTerm (CLI).

**Windows (PowerShell):**
- Windows Terminal: `wt.exe` focus commands
- VS Code/Cursor: CLI `--goto` flag

**Linux (xdotool/wmctrl):**
- Match window by title containing `session_cwd`
- `wmctrl -a` to activate

**Post-jump:** Auto-collapse panel to pill/notch mode (user returns to editor context).

**Files:**
- Create: `src-tauri/src/terminal.rs` (platform-specific jump logic)
- Modify: `src/components/command-center/AgentRoster.tsx` (double-click → jump)

---

## Layer 3: Leapfrog Features

### 3.1 Session History + Search (SQLite)

**Current state:** Sessions are in-memory only. Lost on app restart.

**Design:**

Persist every session event to `~/.notchos/history.db` via SQLite (Tauri has built-in SQLite plugin).

**Schema:**
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL,
  cwd TEXT,
  branch TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  total_cost REAL DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running'
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT REFERENCES sessions(id),
  timestamp INTEGER NOT NULL,
  event_type TEXT NOT NULL,  -- 'tool_use' | 'approval' | 'denial' | 'question' | 'error'
  tool_name TEXT,
  risk_tier TEXT,
  cost REAL DEFAULT 0,
  tokens INTEGER DEFAULT 0,
  summary TEXT,
  details_json TEXT  -- tool input, diff, etc.
);

CREATE INDEX idx_events_session ON events(session_id);
CREATE INDEX idx_sessions_cwd ON sessions(cwd);
CREATE INDEX idx_events_timestamp ON events(timestamp);
```

**UI:** Command Center gets a History toggle (⌘H). Shows:
- Searchable session list (filter by agent, project, date range, risk tier)
- Session detail view with event timeline
- Cost breakdown per session
- Re-openable conversation context

**Files:**
- Create: `src-tauri/src/history.rs` (SQLite persistence)
- Create: `src/components/command-center/HistoryView.tsx`
- Create: `src/components/command-center/SessionSearch.tsx`

### 3.2 Agent Team Orchestration

**Current state:** Agents are independent. No concept of teams or projects.

**Design:**

Sessions auto-group by `cwd` (working directory). Each unique `cwd` becomes a "project." A project with multiple active sessions is a "team."

**Team View (in AgentRoster):**
```
PROJECT: ~/myapp (main)
  ├─ Claude Code — writing auth.ts
  ├─ Codex — executing tests
  └─ Gemini CLI — idle

PROJECT: ~/other-repo (feature/x)
  └─ Claude Code — waiting for approval
```

**Team features:**
- Shared timeline: all agents' events on one timeline, color-coded by agent
- Aggregate metrics: combined cost, combined tokens, combined approvals
- Conflict detection: if two agents submit edits to the same file, highlight in coral with "CONFLICT: both agents editing auth.ts"
- Team health murmuration: particle ring encodes combined team activity

**Files:**
- Create: `src/components/command-center/TeamView.tsx`
- Modify: `src/components/command-center/AgentRoster.tsx` (group by project)
- Modify: `src-tauri/src/lib.rs` (track `cwd` per session)

### 3.3 Cost/Token Analytics Dashboard

**Current state:** Static mock metrics (contextHealth: 66, totalTokens: 38200, totalCost: $2.47).

**Design:**

Real-time cost tracking from session events. Each tool use includes cost/token data (extracted from agent hook payloads).

**Metrics Rail enhancements:**
- Live cost counter (updates in real-time as agents work)
- Burn rate: $/hour over last 30 minutes
- Token usage bar: used vs. limit (if context limit known)
- Session cost breakdown: per-agent pie chart (small, inline)
- Budget alerts: set daily limit, murmuration ring turns gold at 80%, coral at 95%

**History analytics (in History view):**
- Daily/weekly cost chart
- Most expensive sessions
- Cost by agent type
- Cost by project

**Files:**
- Create: `src/components/command-center/CostDashboard.tsx`
- Modify: `src/components/command-center/MetricsRail.tsx` (live cost tracking)

### 3.4 Clickable File Paths

**Current state:** File paths in diffs and tool summaries are plain text.

**Design:**

A `<ClickablePath>` component that:
1. Detects file paths in any text content (regex: paths starting with `./`, `/`, or containing common extensions)
2. Renders them as teal-colored links
3. Click → open in editor: `invoke("open_in_editor", { path })` → Rust checks `$EDITOR`, or auto-detects VS Code/Cursor/Zed, falls back to system default
4. ⌘+Click → reveal in file manager (Finder/Explorer/Nautilus)

**Files:**
- Create: `src/components/shared/ClickablePath.tsx`
- Create: `src-tauri/src/editor.rs` (editor detection + open command)
- Modify: `src/components/command-center/ActiveSession.tsx` (wrap diff content)

---

## Layer 4: Physics Moat

### 4.1 Team Murmuration

**Current state:** Murmuration ring encodes a single metric value (context health).

**Design:**

Extend `MurmurationRing` to support multi-stream mode:
- Each agent gets its own particle stream (distinct color)
- Streams flow at different speeds based on agent status
- When agents are idle, particles drift slowly in separate orbits
- When agents are all writing simultaneously, streams merge into a dense combined swarm
- Error state sends a visible ripple through all streams

Used in: NotchBar (team health at a glance), MetricsRail (per-metric)

### 4.2 Spacetime Grid Responds to Team Activity

**Current state:** Grid deformation controlled by selected agent's risk tier.

**Design:**

Grid intensity = f(team activity):
- 0 active agents → barely visible (1% opacity, no warp)
- 1 agent writing → subtle warp (current medium behavior)
- 2+ agents active → stronger warp, tighter grid
- Any high-risk approval pending → grid pulses subtly (opacity oscillation)
- Conflict detected → localized grid distortion at both agent zones

### 4.3 Gravitational Weight Extended

**Current state:** Weight system applies to approval surface only.

**Design:**

Apply gravitational weight to:
- Question answering: production questions get high weight
- Plan review: plans touching sensitive areas get coral treatment
- Session history: high-cost sessions appear denser in timeline
- Team view: high-risk team conflicts get maximum weight

The visual language is consistent: heavy things take up more space, get warmer colors, demand more attention.

### 4.4 Session History Gravity Wells

**Current state:** Timeline is a bar chart.

**Design:**

Historical timeline as a gravity-well visualization:
- Each session is a node on a horizontal timeline
- Node size scales with cost (more expensive = larger)
- Node color encodes peak risk tier (teal/gold/coral)
- Dense clusters of nodes create visible "gravity wells" — you can spot cost spikes visually
- Hover a node → murmuration particles flow toward it, revealing session details

---

## Implementation Order

The layers are ordered by dependency, but within each layer, work can be parallelized.

**Phase 1 (Foundation):** 1.1 (wire backend) → 1.2 (risk scoring) → 1.3 (agent discovery) + 1.4 (cross-platform) in parallel

**Phase 2 (Table Stakes):** 2.1 (questions) + 2.2 (plan review) + 2.3 (sound) + 2.4 (terminal jump) — all in parallel

**Phase 3 (Leapfrog):** 3.1 (history) → 3.2 (teams, depends on history) + 3.3 (cost analytics) + 3.4 (file paths) in parallel

**Phase 4 (Physics):** 4.1 + 4.2 + 4.3 + 4.4 — all in parallel, after their respective feature layers

---

## Non-Goals for V2

- Mobile app (iOS/Android) — desktop-first
- Cloud sync / remote access — local-only, privacy-first
- Building our own agent CLI — we're the control plane, not the agent
- AI-powered features (auto-approve, predictive risk) — manual human control is the point
- Plugin/extension marketplace — architect for it, but don't build the marketplace

---

## Success Criteria

1. A developer can install NotchOS, launch it, and see their running Claude Code + Codex + Gemini CLI sessions within 30 seconds with zero manual configuration
2. They can approve/deny permissions, answer questions, and review plans without leaving their editor
3. They can jump back to any agent's terminal in one click
4. Session history persists across app restarts and is searchable
5. The physics layer communicates system state (team health, risk, cost) before the user reads any numbers
6. It works on macOS, Windows, and Linux
7. It's the most visually distinctive tool in the category
