# Cost Intelligence Dashboard — Design Spec

> **Context:** Transform NotchOS from a monitor into a cost optimizer. Estimate per-event costs from token counts, track spending over time, configurable budget targets, burn rate alerts.

---

## Token Cost Estimation

Estimate tokens from character count (chars / 4). Apply model-specific rates:

| Model Pattern | Input $/1M | Output $/1M |
|---------------|-----------|-------------|
| opus | 15.00 | 75.00 |
| sonnet | 3.00 | 15.00 |
| o3 | 2.00 | 8.00 |
| 2.5-pro / gemini | 1.25 | 10.00 |
| default | 3.00 | 15.00 |

Match model pattern against the agent's `model` field (e.g., "opus-4" matches "opus").

### Estimation Point

In the Rust backend (`lib.rs`), after receiving each hook event, compute:
- `input_chars` = JSON stringified length of `tool_input`
- `output_chars` = JSON stringified length of `tool_response` (0 for PreToolUse)
- `input_tokens` = input_chars / 4
- `output_tokens` = output_chars / 4
- `cost_estimate` = (input_tokens * input_rate + output_tokens * output_rate) / 1_000_000

Store `cost_estimate` on each event in SQLite. Accumulate on the session's running cost.

---

## Data Layer

### SQLite Schema Update

Add cost tracking to the events table:
```sql
ALTER TABLE events ADD COLUMN input_tokens INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN output_tokens INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN cost_estimate REAL DEFAULT 0;
```

Add a new Rust function: `estimate_cost(model: &str, input: &Value, output: &Value) -> (i64, i64, f64)` returning (input_tokens, output_tokens, cost).

### Session Cost

The `Agent.cost` field (currently mock data) becomes the live sum of `cost_estimate` from the session's events. Computed by the backend when emitting `sessions_updated`.

---

## UI Changes

### MetricsRail — Configurable BURN Gauge

- Replace hardcoded `/ 10` with `localStorage` value `notchos-budget-target` (default: 10)
- Display: `$X.XX / $Y.YY` below the gauge
- Click the cost text to edit the budget target inline (input field appears, Enter saves)

### Center Bay — Cost Summary (idle state)

When agent is idle AND activity feed is empty, show a cost breakdown:
```
SESSION COST
Claude Code    $0.82  (opus-4, 14m)
Codex          $1.47  (o3, 12m)
───────────────────────
Total          $5.68
Budget         $10.00/day (57%)
```

This integrates into the existing `ActiveSession` idle state, below the activity feed fallback.

### Burn Rate Alert

When `(current_cost / elapsed_hours) * 24 > budget_target`:
- BURN gauge enters gold/coral zone
- NotchBar gets the gold pending pulse animation (reuse existing `.containerPending`)

Calculation runs in the frontend `useSessionBridge` hook on each `sessions_updated` event.

---

## Files to Modify

```
src-tauri/src/lib.rs          — ADD cost estimation on each event, store in SQLite
src-tauri/src/history.rs       — ADD cost columns to schema, migration
src/types.ts                   — ADD budgetTarget to SessionMetrics (or separate)
src/hooks/useSessionBridge.ts  — ADD burn rate calculation
src/components/command-center/MetricsRail.tsx — configurable budget, click-to-edit
src/components/command-center/ActiveSession.tsx — cost summary in idle state
src/components/NotchBar.tsx    — burn rate pulse trigger
```
