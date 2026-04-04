# V2 Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the React frontend to the real Tauri backend, add risk tier auto-scoring, extend the hook protocol for V2 features, and lay the groundwork for agent discovery.

**Architecture:** The Tauri backend (`src-tauri/src/lib.rs`, 345 lines) already has a working Unix socket server, session state management, and approval blocking via oneshot channels. The React frontend (`src/App.tsx`) currently uses mock data. Phase 1 connects them and extends the protocol for V2.

**Tech Stack:** Rust (Tauri 2), React 18, TypeScript, tokio, serde

**Spec:** `docs/superpowers/specs/2026-04-03-v2-lake-design.md` — Layer 1

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src-tauri/src/lib.rs` | Modify | Add RiskTier enum, classify_risk, extend HookEvent/Session/PendingApproval with cwd + risk_tier, add get_session_metrics + set_window_size commands, add AskUser/PlanReview handlers |
| `src/hooks/useSessionBridge.ts` | Create | Maps Session (backend) → Agent (frontend), subscribes to Tauri events |
| `src/App.tsx` | Modify | Replace mock data with useSessionBridge, keep mock fallback for browser dev |
| `src/types.ts` | Modify | Add Session type matching backend, add AgentRegistryEntry |
| `src/mock-data.ts` | Modify | Keep for browser dev fallback, export isTauri check |
| `scripts/notchos-bridge.js` | Modify | Inject cwd into hook events |

---

### Task 1: Extend Rust Backend Types + Risk Scoring

Add `RiskTier` enum, `classify_risk()` function, extend `HookEvent` with `cwd`/`question`/`options`/`plan_markdown`, extend `Session` with `cwd`, extend `PendingApproval` with `risk_tier`. Add `AskUser` and `PlanReview` match arms to `handle_connection`. Add `set_window_size` and `get_session_metrics` commands.

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add RiskTier enum and classify_risk function**

In `src-tauri/src/lib.rs`, add after the `ApprovalResponse` struct (after line 52):

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RiskTier {
    Low,
    Medium,
    High,
}

fn classify_risk(tool: &str, input: &serde_json::Value) -> RiskTier {
    match tool {
        "Bash" => {
            let cmd = input.get("command").and_then(|v| v.as_str()).unwrap_or("");
            if cmd.contains("rm -rf") || cmd.contains("DROP") || cmd.contains("prod")
                || cmd.contains("deploy") || cmd.contains("push --force")
                || cmd.contains("sudo") || cmd.contains("systemctl") {
                RiskTier::High
            } else {
                RiskTier::Medium
            }
        }
        "WebFetch" | "WebSearch" => RiskTier::Medium,
        "Write" | "Edit" | "MultiEdit" | "NotebookEdit" => {
            let path = input.get("file_path").and_then(|v| v.as_str()).unwrap_or("");
            if path.contains("auth") || path.contains("secret") || path.contains(".env")
                || path.contains("config") || path.contains("prod")
                || path.contains("migration") || path.contains("Cargo.toml")
                || path.contains("package.json") {
                RiskTier::High
            } else {
                RiskTier::Medium
            }
        }
        "Read" | "Glob" | "Grep" | "LS" | "TodoRead" | "TaskList" | "TaskGet" => RiskTier::Low,
        _ => RiskTier::Medium,
    }
}
```

- [ ] **Step 2: Extend HookEvent with V2 fields**

In `src-tauri/src/lib.rs`, modify the `HookEvent` struct to add `cwd`, `question`, `options`, `plan_markdown`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HookEvent {
    pub hook_event_name: String,
    pub session_id: String,
    pub tool_name: Option<String>,
    pub tool_input: Option<serde_json::Value>,
    pub tool_response: Option<serde_json::Value>,
    pub message: Option<String>,
    pub agent: Option<String>,
    // V2 fields
    pub cwd: Option<String>,
    pub question: Option<String>,
    pub options: Option<Vec<String>>,
    pub plan_markdown: Option<String>,
}
```

- [ ] **Step 3: Extend Session with cwd, extend PendingApproval with risk_tier**

Modify `Session` struct:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub agent: String,
    pub status: String,
    pub current_tool: Option<String>,
    pub pending_approval: Option<PendingApproval>,
    pub last_message: Option<String>,
    pub started_at: u64,
    pub updated_at: u64,
    // V2
    pub cwd: Option<String>,
}
```

Modify `PendingApproval` struct:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingApproval {
    pub approval_id: String,
    pub tool_name: String,
    pub tool_input: serde_json::Value,
    pub summary: String,
    // V2
    pub risk_tier: RiskTier,
}
```

- [ ] **Step 4: Update find_or_create to include cwd**

Modify the `find_or_create` function to accept and store `cwd`:

```rust
fn find_or_create<'a>(sessions: &'a mut Vec<Session>, session_id: &str, agent: &str, now: u64, cwd: Option<String>) -> &'a mut Session {
    if let Some(pos) = sessions.iter().position(|s| s.id == session_id) {
        let session = &mut sessions[pos];
        // Update cwd if provided (may come in later events)
        if cwd.is_some() {
            session.cwd = cwd;
        }
        return session;
    }
    sessions.push(Session {
        id: session_id.to_string(),
        agent: agent.to_string(),
        status: "running".into(),
        current_tool: None,
        pending_approval: None,
        last_message: None,
        started_at: now,
        updated_at: now,
        cwd,
    });
    sessions.last_mut().unwrap()
}
```

- [ ] **Step 5: Update handle_connection — PreToolUse with risk_tier, add AskUser + PlanReview**

In the `PreToolUse` match arm, add `risk_tier` to `PendingApproval`:
```rust
session.pending_approval = Some(PendingApproval {
    approval_id: approval_id.clone(),
    tool_name: tool.clone(),
    tool_input: input.clone(),
    summary,
    risk_tier: classify_risk(&tool, &input),
});
```

Update all `find_or_create` calls to pass `event.cwd.clone()`.

Add `AskUser` match arm (after `PostToolUse`):
```rust
"AskUser" => {
    let (tx, rx) = tokio::sync::oneshot::channel::<ApprovalResponse>();
    let question_id = Uuid::new_v4().to_string();

    {
        let mut pending = state.pending_tx.lock().unwrap();
        pending.insert(question_id.clone(), tx);
    }

    {
        let mut sessions = state.sessions.lock().unwrap();
        let session = find_or_create(&mut sessions, &event.session_id, &agent, now, event.cwd.clone());
        session.status = "waiting".into();
        session.updated_at = now;
    }

    let _ = app.emit("sessions_updated", ());
    let _ = app.emit("ask_user", serde_json::json!({
        "questionId": question_id,
        "sessionId": event.session_id,
        "question": event.question,
        "options": event.options,
    }));

    match rx.await {
        Ok(resp) => {
            let json = serde_json::to_string(&resp).unwrap_or_default();
            let _ = writer.write_all(format!("{}\n", json).as_bytes()).await;
        }
        Err(_) => {
            let _ = writer.write_all(b"{\"decision\":\"deny\"}\n").await;
        }
    }
}
```

Add `PlanReview` match arm:
```rust
"PlanReview" => {
    let (tx, rx) = tokio::sync::oneshot::channel::<ApprovalResponse>();
    let review_id = Uuid::new_v4().to_string();

    {
        let mut pending = state.pending_tx.lock().unwrap();
        pending.insert(review_id.clone(), tx);
    }

    {
        let mut sessions = state.sessions.lock().unwrap();
        let session = find_or_create(&mut sessions, &event.session_id, &agent, now, event.cwd.clone());
        session.status = "waiting".into();
        session.updated_at = now;
    }

    let _ = app.emit("sessions_updated", ());
    let _ = app.emit("plan_review", serde_json::json!({
        "reviewId": review_id,
        "sessionId": event.session_id,
        "planMarkdown": event.plan_markdown,
    }));

    match rx.await {
        Ok(resp) => {
            let json = serde_json::to_string(&resp).unwrap_or_default();
            let _ = writer.write_all(format!("{}\n", json).as_bytes()).await;
        }
        Err(_) => {
            let _ = writer.write_all(b"{\"decision\":\"deny\"}\n").await;
        }
    }
}
```

- [ ] **Step 6: Add set_window_size and get_session_metrics commands**

```rust
#[tauri::command]
async fn set_window_size(width: f64, height: f64, app: AppHandle) {
    if let Some(win) = app.get_webview_window("hud") {
        let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width,
            height,
        }));
    }
}

#[tauri::command]
fn get_session_metrics(state: State<Arc<AppState>>) -> serde_json::Value {
    let sessions = state.sessions.lock().unwrap();
    let total = sessions.len();
    let waiting = sessions.iter().filter(|s| s.status == "waiting").count();
    let running = sessions.iter().filter(|s| s.status == "running").count();
    serde_json::json!({
        "totalSessions": total,
        "waitingSessions": waiting,
        "runningSessions": running,
        "approvalsTotal": 0,
        "approvalsDenied": 0,
        "totalCost": 0.0,
        "totalTokens": 0,
        "contextHealth": 100,
    })
}
```

Register both in `invoke_handler`:
```rust
.invoke_handler(tauri::generate_handler![
    get_sessions,
    approve,
    deny,
    dismiss_session,
    set_window_height,
    set_window_size,
    get_session_metrics,
])
```

- [ ] **Step 7: Verify Rust compiles**

Run: `cd src-tauri && cargo check 2>&1`
Expected: compiles with no errors.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: V2 backend — RiskTier, classify_risk, extended HookEvent/Session, AskUser/PlanReview handlers"
```

---

### Task 2: Create useSessionBridge Hook + Wire App.tsx

Create the React hook that maps backend `Session` objects to frontend `Agent` objects, subscribes to Tauri events, and replaces mock data in `App.tsx`.

**Files:**
- Create: `src/hooks/useSessionBridge.ts`
- Modify: `src/types.ts` (add BackendSession type)
- Modify: `src/App.tsx` (use real data when in Tauri, mock data as fallback)

- [ ] **Step 1: Add BackendSession type to types.ts**

In `src/types.ts`, add at the end (before the `Session` legacy type, or replace it):

```typescript
// Backend session type — matches Rust Session struct exactly
export interface BackendSession {
  id: string;
  agent: string;
  status: string;  // "running" | "waiting" | "done" | "error"
  currentTool: string | null;
  pendingApproval: {
    approvalId: string;
    toolName: string;
    toolInput: Record<string, unknown>;
    summary: string;
    riskTier: RiskTier;
  } | null;
  lastMessage: string | null;
  startedAt: number;
  updatedAt: number;
  cwd: string | null;
}

// Agent display metadata
export interface AgentRegistryEntry {
  name: string;
  abbreviation: string;
  model: string;
}
```

- [ ] **Step 2: Create useSessionBridge.ts**

Create `src/hooks/useSessionBridge.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { Agent, AgentStatus, BackendSession, SessionMetrics, TimelineEvent, AgentRegistryEntry, RiskTier } from '../types';

const isTauri = '__TAURI_INTERNALS__' in window;

// Known agent metadata — looked up by agent name from hook events
const AGENT_REGISTRY: Record<string, AgentRegistryEntry> = {
  claude: { name: 'Claude Code', abbreviation: 'CC', model: 'opus-4' },
  codex: { name: 'Codex', abbreviation: 'CX', model: 'o3' },
  gemini: { name: 'Gemini CLI', abbreviation: 'GM', model: '2.5-pro' },
  cursor: { name: 'Cursor', abbreviation: 'CR', model: 'unknown' },
  opencode: { name: 'OpenCode', abbreviation: 'OC', model: 'unknown' },
  droid: { name: 'Droid', abbreviation: 'DR', model: 'unknown' },
};

const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

function mapStatus(session: BackendSession): AgentStatus {
  switch (session.status) {
    case 'waiting': return 'waiting';
    case 'error': return 'error';
    case 'done': return 'idle';
    case 'running':
      if (!session.currentTool) return 'idle';
      if (WRITE_TOOLS.has(session.currentTool)) return 'writing';
      return 'executing';
    default: return 'idle';
  }
}

function mapSessionToAgent(session: BackendSession): Agent {
  const registry = AGENT_REGISTRY[session.agent] ?? {
    name: session.agent,
    abbreviation: session.agent.substring(0, 2).toUpperCase(),
    model: 'unknown',
  };

  const now = Math.floor(Date.now() / 1000);

  return {
    id: session.id,
    name: registry.name,
    abbreviation: registry.abbreviation,
    model: registry.model,
    status: mapStatus(session),
    cost: 0, // Real cost tracking in Layer 3
    elapsedSeconds: now - session.startedAt,
    currentTool: session.currentTool,
    pendingApproval: session.pendingApproval ? {
      approvalId: session.pendingApproval.approvalId,
      toolName: session.pendingApproval.toolName,
      toolInput: session.pendingApproval.toolInput,
      summary: session.pendingApproval.summary,
      riskTier: session.pendingApproval.riskTier,
    } : null,
  };
}

export function useSessionBridge() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [metrics, setMetrics] = useState<SessionMetrics>({
    contextHealth: 100,
    totalTokens: 0,
    totalCost: 0,
    approvalsTotal: 0,
    approvalsDenied: 0,
  });
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const refreshSessions = useCallback(async () => {
    if (!isTauri) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const sessions = await invoke<BackendSession[]>('get_sessions');
      setAgents(sessions.map(mapSessionToAgent));

      const metricsData = await invoke<Record<string, number>>('get_session_metrics');
      setMetrics({
        contextHealth: metricsData.contextHealth ?? 100,
        totalTokens: metricsData.totalTokens ?? 0,
        totalCost: metricsData.totalCost ?? 0,
        approvalsTotal: metricsData.approvalsTotal ?? 0,
        approvalsDenied: metricsData.approvalsDenied ?? 0,
      });
    } catch (e) {
      console.error('[useSessionBridge] refresh failed:', e);
    }
  }, []);

  useEffect(() => {
    if (!isTauri) return;

    let unlisten: (() => void) | undefined;

    (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      unlisten = await listen('sessions_updated', () => {
        refreshSessions();
      });
      // Initial fetch
      refreshSessions();
    })();

    // Refresh elapsed time every 5 seconds
    const timer = setInterval(refreshSessions, 5000);

    return () => {
      unlisten?.();
      clearInterval(timer);
    };
  }, [refreshSessions]);

  return { agents, metrics, timeline, isLive: isTauri };
}
```

- [ ] **Step 3: Modify App.tsx to use useSessionBridge**

In `src/App.tsx`:

1. Add import: `import { useSessionBridge } from './hooks/useSessionBridge';`
2. Inside `App()`, add the hook call and conditional data source:

Replace the line `import { MOCK_AGENTS, MOCK_METRICS, MOCK_TIMELINE } from './mock-data';` — keep it but also import the hook.

After `const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);`, add:

```typescript
const { agents: liveAgents, metrics: liveMetrics, timeline: liveTimeline, isLive } = useSessionBridge();

// Use live data when in Tauri, mock data in browser dev
const agents = isLive && liveAgents.length > 0 ? liveAgents : MOCK_AGENTS;
const metrics = isLive ? liveMetrics : MOCK_METRICS;
const timeline = isLive ? liveTimeline : MOCK_TIMELINE;
```

3. Remove the direct references to `MOCK_AGENTS`, `MOCK_METRICS`, `MOCK_TIMELINE` in the JSX. The variables `agents`, `metrics`, `timeline` now resolve to either live or mock data.

4. Update the auto-expand `useEffect` to use `agents` instead of `MOCK_AGENTS`:
```typescript
useEffect(() => {
    const highRisk = agents.find(
      a => a.pendingApproval?.riskTier === 'high'
    );
    if (highRisk && mode !== 'command-center') {
      setSelectedAgentId(highRisk.id);
      setMode('command-center');
    }
  }, [agents, mode]);
```

5. Update keyboard shortcuts for agent cycling to use `agents` instead of `MOCK_AGENTS`:
```typescript
// In the ⌘] handler:
setSelectedAgentId(prev => {
  const idx = agents.findIndex(a => a.id === prev);
  const next = (idx + 1) % agents.length;
  return agents[next].id;
});
```

- [ ] **Step 4: Update bridge script to inject cwd**

In `scripts/notchos-bridge.js`, after parsing the hook event JSON from stdin, inject the `cwd` field:

```javascript
// After: const event = JSON.parse(line);
event.cwd = process.cwd();
```

This ensures every hook event includes the working directory of the agent process.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit && npx vite build`
Expected: no errors.

- [ ] **Step 6: Test with dev simulator**

Run the app: `npx vite dev --port 5199`
In browser: should show mock data (since `!isTauri`).
Verify no console errors.

When running under `npm run tauri dev`:
1. Terminal 1: `npm run tauri dev`
2. Terminal 2: `node scripts/dev-simulate.js basic`
Should see live sessions appear in the UI.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useSessionBridge.ts src/types.ts src/App.tsx scripts/notchos-bridge.js
git commit -m "feat: wire frontend to real backend via useSessionBridge hook"
```

---

### Task 3: Update Bridge Script for V2 Protocol

Update the bridge script to support the V2 hook protocol: inject `cwd`, handle the new event types (`AskUser`, `PlanReview`), and prepare for multi-agent support.

**Files:**
- Modify: `scripts/notchos-bridge.js`

- [ ] **Step 1: Extend bridge script with V2 fields and event handling**

Read `scripts/notchos-bridge.js` and modify it to:

1. Always inject `cwd: process.cwd()` into outgoing events
2. Support `--agent` flag (already exists) for agent identification
3. Handle `AskUser` event type: forward question/options from stdin, block on socket response
4. Handle `PlanReview` event type: forward plan_markdown from stdin, block on socket response
5. Add a `--version` flag that prints `notchos-bridge v2`

- [ ] **Step 2: Verify bridge works with dev simulator**

Run: `echo '{"hookEventName":"Notification","sessionId":"test","message":"hello"}' | node scripts/notchos-bridge.js --agent claude`
Expected: sends to socket, receives ACK.

- [ ] **Step 3: Commit**

```bash
git add scripts/notchos-bridge.js
git commit -m "feat: V2 bridge protocol — cwd injection, AskUser/PlanReview support"
```

---

### Task 4: Build Verification + Integration Test

End-to-end verification that the real backend, bridge, and frontend work together.

**Files:**
- None new (verification only)

- [ ] **Step 1: Full Rust build**

Run: `cd src-tauri && cargo build 2>&1`
Expected: compiles clean.

- [ ] **Step 2: Full frontend build**

Run: `npx tsc --noEmit && npx vite build`
Expected: compiles clean.

- [ ] **Step 3: Dev mode smoke test**

Run: `npx vite dev --port 5199`
Open http://localhost:5199 — should show mock data (NotchBar → ExpandedPill → CommandCenter flow).
Check console for errors.

- [ ] **Step 4: Integration test with dev simulator (if Tauri available)**

If `npm run tauri dev` is available:
1. Start app
2. Run `node scripts/dev-simulate.js basic` — should see live sessions
3. Run `node scripts/dev-simulate.js approval` — should see approval surface with risk tier badge
4. Approve/deny from UI — should unblock simulator

If Tauri is not available (CI/browser-only), skip this step.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix: integration test fixes for V2 foundation"
```
