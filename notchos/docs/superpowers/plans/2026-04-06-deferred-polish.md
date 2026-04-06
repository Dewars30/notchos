# Deferred Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address 6 deferred design review items: live activity feed in the center bay, mute button state, focus-visible audit, DESIGN.md glass update, semantic landmarks, and typography floor bump.

**Architecture:** One feature task (activity feed) and five mechanical tasks. All are independent and can run in parallel except Task 1 (activity feed) which modifies files also touched by Task 3 (focus-visible) and Task 5 (semantic landmarks). Run Task 1 first, then Tasks 2-6 in parallel.

**Tech Stack:** React 18, CSS Modules, HTML5 semantic elements

**Spec:** `docs/superpowers/specs/2026-04-06-deferred-polish-design.md`

---

## File Structure

### Modified Files
```
src/components/command-center/ActiveSession.tsx      — ADD activity feed rendering + recentEvents prop
src/components/command-center/ActiveSession.module.css — ADD feed styles
src/components/command-center/CommandCenter.tsx       — FILTER timeline by agent, pass recentEvents
src/components/command-center/TopBar.tsx              — MUTE button style + CHANGE <div> to <header>
src/components/command-center/TopBar.module.css       — ADD focus-visible rules
src/components/command-center/AgentRoster.tsx         — CHANGE <div> to <nav>
src/components/command-center/AgentRoster.module.css  — ADD focus-visible rules
src/components/command-center/MetricsRail.tsx         — CHANGE <div> to <aside>
src/components/command-center/EventTimeline.tsx       — CHANGE <div> to <footer>
src/components/ExpandedPill.module.css                — ADD focus-visible rules
src/components/command-center/HistoryView.module.css  — ADD focus-visible rules
src/components/command-center/QuestionPanel.module.css — ADD focus-visible rules
src/components/command-center/PlanReview.module.css   — ADD focus-visible rules
src/components/Onboarding.module.css                  — ADD focus-visible rules
src/components/shared/ZoneLabel.module.css            — BUMP font-size 7px → 8px
src/components/shared/RadialGauge.tsx                 — BUMP center label fontSize 7 → 8
DESIGN.md                                             — ADD glass vibrancy section
```

---

## Task 1: Live Activity Feed in Center Bay

**Files:**
- Modify: `src/components/command-center/ActiveSession.tsx`
- Modify: `src/components/command-center/ActiveSession.module.css`
- Modify: `src/components/command-center/CommandCenter.tsx`

- [ ] **Step 1: Add activity feed styles to ActiveSession.module.css**

Add these classes to the existing file:

```css
.activityFeed {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  overflow-y: auto;
  mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
}

.activityEntry {
  display: flex;
  align-items: baseline;
  gap: var(--sp-4);
  padding: var(--sp-1) 0;
}

.activityTime {
  font-family: var(--font-data);
  font-size: 8px;
  color: var(--text-dim);
  flex-shrink: 0;
  width: 28px;
  text-align: right;
}

.activityDesc {
  font-family: var(--font-ui);
  font-size: 10px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activityTool {
  color: var(--teal);
}

.idleLabel {
  font-family: var(--font-ui);
  font-size: 10px;
  color: var(--text-dim);
  animation: empty-breathe 4s ease-in-out infinite;
}
```

Note: `empty-breathe` keyframes already exist in `NotchBar.module.css`. Move them to `index.css` if needed, or duplicate here:

```css
@keyframes empty-breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}
```

- [ ] **Step 2: Update ActiveSession props and add feed rendering**

In `src/components/command-center/ActiveSession.tsx`:

Add `TimelineEvent` to the type import:
```tsx
import type { Agent, RiskTier, DiffLine, TimelineEvent } from '../../types';
```

Update the props interface:
```tsx
interface ActiveSessionProps {
  agent: Agent | null;
  onApprove: (approvalId: string) => void;
  onDeny: (approvalId: string) => void;
  recentEvents?: TimelineEvent[];
}
```

Add a time formatting helper at module scope:
```tsx
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return `0:${String(seconds).padStart(2, '0')}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
```

Add a mapping from event type to display text at module scope:
```tsx
const EVENT_LABELS: Record<string, string> = {
  'auto-approved': 'Auto-approved',
  'approved': 'Approved',
  'pending': 'Pending',
  'denied': 'Denied',
};
```

In the component, destructure the new prop:
```tsx
export function ActiveSession({ agent, onApprove, onDeny, recentEvents = [] }: ActiveSessionProps) {
```

Replace the no-approval else branch (the block that shows "All clear — no pending actions") with the activity feed:

```tsx
      ) : (
        <div className={styles.activityFeed}>
          {recentEvents.length > 0 ? (
            recentEvents.slice(0, 20).map(event => (
              <div key={event.id} className={styles.activityEntry}>
                <span className={styles.activityTime}>
                  {formatRelativeTime(event.timestamp)}
                </span>
                <span className={styles.activityDesc}>
                  <span className={styles.activityTool}>{EVENT_LABELS[event.type] ?? event.type}</span>
                </span>
              </div>
            ))
          ) : (
            <>
              <div className={styles.statusBlock}>
                <div className={styles.statusMessage}>
                  {agent.status === 'idle' && 'All clear — no pending actions'}
                  {agent.status === 'executing' && (
                    <>Executing: <span style={{ color: 'var(--ripple)' }}>{agent.currentTool ?? 'unknown'}</span></>
                  )}
                  {agent.status === 'writing' && (
                    <>Writing: <span style={{ color: 'var(--gold)' }}>{agent.currentTool ?? 'unknown'}</span></>
                  )}
                  {agent.status === 'waiting' && 'Waiting for response...'}
                  {agent.status === 'error' && <span style={{ color: 'var(--coral)' }}>Agent encountered an error</span>}
                </div>
                {agent.status === 'idle' && (
                  <span className={styles.idleLabel}>listening...</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
```

- [ ] **Step 3: Wire recentEvents through CommandCenter**

In `src/components/command-center/CommandCenter.tsx`, filter timeline by selected agent and pass to ActiveSession:

```tsx
      {showHistory ? (
        <HistoryView />
      ) : (
        <ActiveSession
          agent={selectedAgent}
          onApprove={onApprove}
          onDeny={onDeny}
          recentEvents={timeline.filter(e => selectedAgent && e.agentId === selectedAgent.id)}
        />
      )}
```

- [ ] **Step 4: Build and commit**

```bash
npm run build
git add src/components/command-center/ActiveSession.tsx \
        src/components/command-center/ActiveSession.module.css \
        src/components/command-center/CommandCenter.tsx
git commit -m "feat: live activity feed in center bay when no approval pending"
```

---

## Task 2: Mute Button Visual State

**Files:**
- Modify: `src/components/command-center/TopBar.tsx`

- [ ] **Step 1: Update mute button inline style**

In `TopBar.tsx`, find the mute button (around line 73-79). Change the `style` prop:

```tsx
        <button
          onClick={toggleMute}
          className={styles.muteButton}
          style={{
            color: muted ? 'var(--text-dim)' : 'var(--text-3)',
            opacity: muted ? 0.5 : 1,
            textDecoration: muted ? 'line-through' : 'none',
          }}
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {muted ? 'MUTED' : 'SND'}
        </button>
```

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/components/command-center/TopBar.tsx
git commit -m "style: mute button visual state — line-through + dimmed when muted"
```

---

## Task 3: focus-visible Audit

**Files:**
- Modify: 8 CSS module files

- [ ] **Step 1: Add focus-visible to TopBar.module.css**

Add after each interactive class:

```css
.agentButton:focus-visible,
.agentButtonSelected:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}

.muteButton:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}

.collapseButton:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}
```

- [ ] **Step 2: Add focus-visible to AgentRoster.module.css**

```css
.agentButton:focus-visible,
.agentButtonSelected:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Add focus-visible to ActiveSession.module.css**

```css
.approveButton:focus-visible,
.approveButtonLarge:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}

.denyButton:focus-visible,
.denyButtonLarge:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Add focus-visible to ExpandedPill.module.css**

```css
.agentRow:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}

.expandButton:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}

.orbButton:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}
```

- [ ] **Step 5: Add focus-visible to HistoryView, QuestionPanel, PlanReview, Onboarding**

**HistoryView.module.css:**
```css
.sessionButton:focus-visible,
.sessionButtonExpanded:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}

.searchInput:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}
```

**QuestionPanel.module.css:**
```css
.optionButton:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}
```

**PlanReview.module.css:**
```css
.approveButton:focus-visible,
.denyButton:focus-visible,
.changesButton:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}
```

**Onboarding.module.css:**
```css
.setupButton:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}

.skipButton:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
}
```

- [ ] **Step 6: Build and commit**

```bash
npm run build
git add src/components/command-center/TopBar.module.css \
        src/components/command-center/AgentRoster.module.css \
        src/components/command-center/ActiveSession.module.css \
        src/components/ExpandedPill.module.css \
        src/components/command-center/HistoryView.module.css \
        src/components/command-center/QuestionPanel.module.css \
        src/components/command-center/PlanReview.module.css \
        src/components/Onboarding.module.css
git commit -m "a11y: add focus-visible teal outline to all interactive elements"
```

---

## Task 4: DESIGN.md Glass Vibrancy Update

**Files:**
- Modify: `DESIGN.md`

- [ ] **Step 1: Update the Elevation section**

In `DESIGN.md`, find the "Elevation — No Shadows, No Blur, No Glow" section (around line 120-125). Replace it with:

```markdown
### Elevation — Background Steps + Glass Vibrancy

Depth is communicated through background color steps and layered glass transparency:
`--bg-base` → `--bg-surface` → `--bg-elevated` → `--bg-raised`

Each step is 6-8 lightness points above the last. The `--ripple` color may have a subtle `box-shadow` spread of 4-8px during executing state.

#### Glass Vibrancy — Layered Transparency

NotchOS uses backdrop-filter glass on all three mode shells. The glass creates depth hierarchy between the floating HUD and the desktop behind it.

| Mode | Background | Blur | Saturation | Drop Shadow |
|------|-----------|------|------------|-------------|
| Notch | rgba(0,0,0,0.92) | 20px | 150% | None (attached to notch) |
| Pill | rgba(10,12,18,0.92) | 24px | 130% | 0 8px 32px rgba(0,0,0,0.4) |
| CC | rgba(10,12,18,0.90) | 28px | 140% | 0 12px 48px rgba(0,0,0,0.5) |

**Rules:**
- Opacity decreases as mode expands (larger surface = more transparency needed)
- Blur increases as mode expands (more content behind = more blur for legibility)
- Only the outermost shell gets backdrop-filter. No nested blur.
- Interior zones use semi-transparent backgrounds (0.3-0.7 alpha), not glass.
- Inner light catch: `inset 0 0.5px 0 rgba(255,255,255,0.04)` on top edge of each shell.
```

- [ ] **Step 2: Commit**

```bash
git add DESIGN.md
git commit -m "docs: update DESIGN.md elevation section with glass vibrancy rules"
```

---

## Task 5: Semantic Landmarks in CommandCenter

**Files:**
- Modify: `src/components/command-center/TopBar.tsx`
- Modify: `src/components/command-center/AgentRoster.tsx`
- Modify: `src/components/command-center/ActiveSession.tsx`
- Modify: `src/components/command-center/MetricsRail.tsx`
- Modify: `src/components/command-center/EventTimeline.tsx`

- [ ] **Step 1: TopBar — `<div>` → `<header>`**

In TopBar.tsx, change the outer container from `<div>` to `<header>`:

```tsx
    <header
      data-tauri-drag-region
      className={styles.container}
    >
    ...
    </header>
```

- [ ] **Step 2: AgentRoster — `<div>` → `<nav>`**

In AgentRoster.tsx, change the outer container:

```tsx
    <nav className={styles.container}>
    ...
    </nav>
```

- [ ] **Step 3: ActiveSession — `<div>` → `<main>`**

In ActiveSession.tsx, change BOTH the container and containerEmpty from `<div>` to `<main>`:

```tsx
    // Empty state
    <main className={styles.containerEmpty}>
    
    // Active state
    <main className={styles.container}>
```

- [ ] **Step 4: MetricsRail — `<div>` → `<aside>`**

In MetricsRail.tsx, change the outer container:

```tsx
    <aside className={styles.rail}>
    ...
    </aside>
```

- [ ] **Step 5: EventTimeline — `<div>` → `<footer>`**

In EventTimeline.tsx, change the outer container:

```tsx
    <footer className={styles.timeline}>
    ...
    </footer>
```

- [ ] **Step 6: Build and commit**

```bash
npm run build
git add src/components/command-center/TopBar.tsx \
        src/components/command-center/AgentRoster.tsx \
        src/components/command-center/ActiveSession.tsx \
        src/components/command-center/MetricsRail.tsx \
        src/components/command-center/EventTimeline.tsx
git commit -m "a11y: semantic landmarks — header/nav/main/aside/footer in CommandCenter"
```

---

## Task 6: Typography Minimum Size Bump

**Files:**
- Modify: `src/components/shared/ZoneLabel.module.css`
- Modify: `src/components/shared/RadialGauge.tsx`

- [ ] **Step 1: Bump ZoneLabel font-size**

In `ZoneLabel.module.css`, change `font-size: 7px` to `font-size: 8px`.

- [ ] **Step 2: Bump RadialGauge center label**

In `RadialGauge.tsx`, find the `<text>` element's inline style with `fontSize: 7`. Change to `fontSize: 8`.

- [ ] **Step 3: Build and commit**

```bash
npm run build
git add src/components/shared/ZoneLabel.module.css src/components/shared/RadialGauge.tsx
git commit -m "style: bump typography floor from 7px to 8px (zone labels, gauge text)"
```

---

## Task 7: Final Validation

- [ ] **Step 1: Clean build**

```bash
npm run build
```

- [ ] **Step 2: Visual QA**

Open `npx vite dev --port 5199` and verify:
- Center bay shows activity feed entries when agent selected (not "All clear")
- Mute button: "SND" is normal, "MUTED" is dimmed + struck through
- Zone labels (AGENTS, METRICS, TOKENS, APPROVALS) are 8px (slightly larger than before)
- RadialGauge center labels (CTX, BURN) are 8px

- [ ] **Step 3: Keyboard accessibility**

Tab through all interactive elements in the Command Center. Verify:
- Teal focus ring appears on each button/control
- Agent selector pills in TopBar
- Mute button
- Collapse bar
- Agent roster options
- Approve/Deny buttons (when approval visible)

- [ ] **Step 4: Screen reader landmarks**

Use browser accessibility inspector to verify CommandCenter has:
- `<header>` (TopBar)
- `<nav>` (AgentRoster)
- `<main>` (ActiveSession)
- `<aside>` (MetricsRail)
- `<footer>` (EventTimeline)
