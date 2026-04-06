# Deferred Polish Items — Design Spec

> **Context:** Six items deferred from the design review of the visual-upgrade branch. One feature (live activity feed), five mechanical fixes. All CSS-module and HTML-level changes except the activity feed which requires data wiring.

---

## 1. Center Bay: Live Activity Feed

### Problem
When an agent is selected with no pending approval, the center bay shows "All clear — no pending actions" and one line of session metadata. This leaves ~70% of the Command Center as dead space. The user stares at this most of the time.

### Design
Replace the idle state with a scrolling feed of recent agent activity — tool calls, file edits, commands — so the center bay always feels alive.

### Data Source
`useSessionBridge` already receives events over the Unix socket. Each event has `timestamp`, `eventType`, `toolName`, `summary`. The `TimelineEvent` type captures these. In browser dev mode, `MOCK_TIMELINE` provides test data.

### Layout
- Zone label stays: `ACTIVE — {AGENT NAME} · {STATUS}`
- Below: scrolling list of recent activity entries, newest at top
- Each entry is one line:
  - Timestamp: B612 Mono, 8px, `--text-dim`, relative format (e.g., "0:42")
  - Event description: Sora, 10px, `--text-2`
  - Tool names: teal tint (`--teal`)
  - File paths: rendered via `ClickablePath` component (already clickable)
- Max visible: 20 entries, overflow scrolls
- Bottom fade: CSS `mask-image: linear-gradient(to bottom, black 80%, transparent 100%)` on the scroll container
- When approval arrives: feed slides down, approval surface takes over (existing behavior preserved)

### Entry Format
```
0:42  Edit src/components/NotchBar.tsx
0:38  Bash npm run build
0:35  Read package.json
0:31  Write src/styles/index.css
```

### Idle Fallback
When agent is idle with no recent events, show the session summary line (already exists) plus "listening..." in `--text-dim` with the same breathing animation from NotchBar's empty state.

### Props Change
`ActiveSession` receives a new prop: `recentEvents: TimelineEvent[]` filtered to the selected agent. `CommandCenter` filters `timeline` by `selectedAgentId` before passing it down.

### Files
- Modify: `src/components/command-center/ActiveSession.tsx` — add activity feed rendering
- Modify: `src/components/command-center/ActiveSession.module.css` — add feed styles
- Modify: `src/components/command-center/CommandCenter.tsx` — filter and pass `recentEvents`

---

## 2. Mute Button Visual State

### Problem
"SND" and "MUTED" render in similar dim colors. Can't tell at a glance whether sound is on or off.

### Fix
In `TopBar.tsx`, update the mute button's inline style:
- **Unmuted:** `color: var(--text-3)` (current, fine)
- **Muted:** `color: var(--text-dim)`, `opacity: 0.5`, `textDecoration: 'line-through'`

One inline style change. No CSS module changes needed.

### Files
- Modify: `src/components/command-center/TopBar.tsx`

---

## 3. focus-visible Audit

### Problem
CSS module buttons may override the global `:focus-visible` outline from `index.css`. Keyboard users may not see focus indicators on some controls.

### Fix
Add explicit `:focus-visible` rules to every interactive class in CSS modules:

```css
.buttonClass:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}
```

### Files to audit and fix
- `src/components/command-center/TopBar.module.css` — `.agentButton`, `.muteButton`, `.collapseButton`
- `src/components/command-center/AgentRoster.module.css` — `.agentButton`
- `src/components/command-center/ActiveSession.module.css` — `.approveButton`, `.denyButton`
- `src/components/ExpandedPill.module.css` — `.agentRow`, `.expandButton`, `.orbButton`
- `src/components/command-center/HistoryView.module.css` — `.sessionButton`, `.searchInput`
- `src/components/command-center/QuestionPanel.module.css` — `.optionButton`
- `src/components/command-center/PlanReview.module.css` — `.approveButton`, `.denyButton`, `.changesButton`
- `src/components/Onboarding.module.css` — `.setupButton`, `.skipButton`

---

## 4. DESIGN.md Glass Vibrancy Update

### Problem
DESIGN.md says "No backdrop-filter" but the visual upgrade intentionally added glass vibrancy across all three mode shells. The doc is stale.

### Fix
Add a "Glass Vibrancy" subsection to DESIGN.md in the Elevation section:

```markdown
### Glass Vibrancy — Layered Transparency

NotchOS uses backdrop-filter glass on all three mode shells. This is an intentional
evolution from the original elevation rules. The glass creates depth hierarchy
between the floating HUD and the desktop behind it.

| Mode | Background | Blur | Saturation | Drop Shadow |
|------|-----------|------|------------|-------------|
| Notch | rgba(0,0,0,0.92) | 20px | 150% | None (attached to notch) |
| Pill | rgba(10,12,18,0.92) | 24px | 130% | 0 8px 32px rgba(0,0,0,0.4) |
| CC | rgba(10,12,18,0.90) | 28px | 140% | 0 12px 48px rgba(0,0,0,0.5) |

**Rules:**
- Opacity decreases as mode expands (larger surface = more transparency)
- Blur increases as mode expands (more content behind = more blur for legibility)
- Only the outermost shell gets backdrop-filter. No nested blur.
- Interior zones use semi-transparent backgrounds (0.3-0.7 alpha), not glass.
- Inner light catch: `inset 0 0.5px 0 rgba(255,255,255,0.04)` on top edge.
```

Also update the "No box-shadow. No filter:blur. No backdrop-filter." line to reflect the new reality.

### Files
- Modify: `DESIGN.md`

---

## 5. Semantic Landmarks in CommandCenter

### Problem
The Command Center is built entirely from `<div>` elements. Screen readers cannot traverse it by landmark regions.

### Fix
Swap container tags in each component's JSX. CSS module classes work on any HTML tag.

| Component | Current | New Tag | Rationale |
|-----------|---------|---------|-----------|
| TopBar | `<div>` | `<header>` | App header with navigation and controls |
| AgentRoster | `<div>` (outer) | `<nav>` | Primary navigation for selecting agents |
| ActiveSession | `<div>` (outer) | `<main>` | Primary content area |
| MetricsRail | `<div>` (outer) | `<aside>` | Supplementary metrics |
| EventTimeline | `<div>` (outer) | `<footer>` | Persistent timeline strip |

The `data-tauri-drag-region` on TopBar's `<header>` is preserved — it works on any element.

### Files
- Modify: `src/components/command-center/TopBar.tsx`
- Modify: `src/components/command-center/AgentRoster.tsx`
- Modify: `src/components/command-center/ActiveSession.tsx`
- Modify: `src/components/command-center/MetricsRail.tsx`
- Modify: `src/components/command-center/EventTimeline.tsx`

---

## 6. Typography Minimum Size Bump

### Problem
Zone labels and gauge center text render at 7px. At this size on a Retina display they're legible but strained. Codex flagged this as "too compressed for premium feel."

### Fix
Bump the typography floor from 7px to 8px. Affects:

- `src/components/shared/ZoneLabel.module.css` — `.label` font-size: 7px → 8px
- `src/components/shared/RadialGauge.tsx` — center `<text>` fontSize: 7 → 8
- `src/components/shared/RadialGauge.module.css` — if label class exists, update there too

9px operational data (B612 Mono costs, tokens, model names) stays unchanged — that's the intentional cockpit instrument scale.

---

## Validation

After all six items:
1. `npm run build` succeeds
2. Visual QA: center bay shows activity feed, mute button has clear on/off state, zone labels are 8px
3. Keyboard nav: Tab through all interactive elements, verify teal focus ring appears
4. Screen reader: CommandCenter has header/nav/main/aside/footer landmarks
5. DESIGN.md: glass section present, no contradictions with existing rules
