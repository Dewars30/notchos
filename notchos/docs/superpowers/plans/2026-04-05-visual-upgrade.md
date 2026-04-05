# NotchOS Visual Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gap between DESIGN.md and implementation — migrate to CSS modules, add glass vibrancy, shared element transitions, and risk-responsive polish across all three modes.

**Architecture:** 8 sequential phases. Phase 1 (CSS modules) is load-bearing for all others. Each phase commits independently and passes `npm run build`. Visual QA after each phase via `npx vite dev --port 5199`.

**Tech Stack:** React 18, Framer Motion 12, Vite 5, Tauri 2, CSS Modules, Web Audio API

**Spec:** `docs/VISUAL_UPGRADE_SPEC.md`

**What NOT to change:** Spring physics (`stiffness: 400, damping: 30, mass: 1`), fonts (Sora/B612 Mono/Departure Mono), three-mode architecture, canvas rendering approach, keyboard shortcuts, existing design tokens in `src/styles/index.css`.

---

## File Structure

### Phase 1 — New CSS Module Files (20 files)
```
src/components/shared/StatusOrb.module.css        — NEW
src/components/shared/ZoneLabel.module.css         — NEW
src/components/shared/ClickablePath.module.css     — NEW
src/components/shared/MurmurationRing.module.css   — NEW
src/components/NotchBar.module.css                 — NEW
src/components/ExpandedPill.module.css              — NEW
src/components/AgentPill.module.css                 — NEW
src/components/command-center/TopBar.module.css     — NEW
src/components/command-center/AgentRoster.module.css — NEW
src/components/command-center/ActiveSession.module.css — NEW
src/components/command-center/MetricsRail.module.css — NEW
src/components/command-center/EventTimeline.module.css — NEW
src/components/command-center/SpacetimeGrid.module.css — NEW (minimal)
src/components/command-center/HistoryView.module.css — NEW
src/components/command-center/QuestionPanel.module.css — NEW
src/components/command-center/PlanReview.module.css — NEW
src/components/Onboarding.module.css               — NEW
src/components/SessionDetail.module.css             — NEW
src/components/ApprovalPanel.module.css             — NEW
src/components/command-center/CommandCenter.module.css — RENAME from CommandCenter.css
```

### Phase 1 — Modified TSX Files (20 files)
Every `.tsx` component listed above gets updated: `import styles from './X.module.css'`, replace inline `style={{}}` with `className={styles.xxx}`, remove `onMouseEnter`/`onMouseLeave` hover handlers.

### Phase 2 — Modified Files
```
src/styles/index.css                               — ADD glass tokens
src/components/NotchBar.module.css                 — ADD glass treatment
src/components/ExpandedPill.module.css              — ADD glass treatment
src/components/command-center/CommandCenter.module.css — UPDATE glass values
src/components/command-center/AgentRoster.module.css — ADD zone transparency
src/components/command-center/MetricsRail.module.css — ADD zone transparency
src/components/command-center/EventTimeline.module.css — ADD zone transparency
```

### Phase 3 — Modified Files
```
src/components/shared/StatusOrb.tsx                — ADD layoutId prop, motion.span wrapper
src/components/NotchBar.tsx                        — ADD layoutId to orbs
src/components/ExpandedPill.tsx                    — ADD layoutId to orbs/names/costs
src/components/command-center/AgentRoster.tsx       — ADD layoutId to orbs/names
src/components/command-center/TopBar.tsx            — ADD layoutId to cost
src/App.tsx                                        — CHANGE AnimatePresence mode, add position:absolute to content wrappers
```

### Phase 4 — Modified Files
```
src/components/NotchBar.tsx                        — ADD hasPending/hasHighRisk props, activity bar
src/components/NotchBar.module.css                 — ADD pulse animations, activity bar styles
src/components/ExpandedPill.tsx                    — ADD orbButton wrapper, onJumpToTerminal prop
src/components/ExpandedPill.module.css              — ADD orbButton styles
src/App.tsx                                        — PASS hasPending/hasHighRisk to NotchBar, wire onJumpToTerminal
```

### Phase 5 — Modified Files
```
src/components/command-center/ActiveSession.module.css — ADD risk-responsive treatments, button enhancements
src/components/command-center/ActiveSession.tsx     — ADD risk-tier classNames, remove onMouseDown/Up handlers
src/components/command-center/TopBar.module.css     — ADD separator dot style
src/components/command-center/TopBar.tsx            — REPLACE `·` with styled separator span
src/components/ExpandedPill.module.css              — ADD separator dot style
src/components/ExpandedPill.tsx                    — REPLACE `·` with styled separator span
```

### Phase 6 — Modified Files
```
src/components/command-center/SpacetimeGrid.tsx    — UPDATE RISK_CONFIG values, ADD edge fade gradient
```

### Phase 7 — Modified Files
```
src/components/ExpandedPill.tsx                    — ADD staggered motion.div wrappers on AgentRows
src/components/NotchBar.tsx                        — ADD "listening" empty state
src/components/NotchBar.module.css                 — ADD empty-label breathing animation
```

### Phase 8 — Modified Files
```
src/audio/defaultSounds.ts                         — ADD agentDiscovered sound
src/App.tsx                                        — VERIFY/ADD sound triggers on approve/deny/discovery/high-risk
```

---

## Task 1: Migrate StatusOrb to CSS Modules

**Files:**
- Create: `src/components/shared/StatusOrb.module.css`
- Modify: `src/components/shared/StatusOrb.tsx`

- [ ] **Step 1: Create StatusOrb.module.css**

```css
/* src/components/shared/StatusOrb.module.css */
.container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: visible;
}

.ring {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  border-width: 0.5px;
  border-style: solid;
  pointer-events: none;
}

.ringOuter {
  composes: ring;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
}

.glow {
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  bottom: -1px;
  border-radius: 50%;
  opacity: 0.04;
  pointer-events: none;
}

.core {
  border-radius: 50%;
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 2: Update StatusOrb.tsx to use CSS module**

Replace the entire file with:

```tsx
import { motion } from 'framer-motion';
import type { AgentStatus } from '../../types';
import styles from './StatusOrb.module.css';

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'var(--teal)',
  writing: 'var(--gold)',
  waiting: 'var(--steel)',
  executing: 'var(--ripple)',
  error: 'var(--coral)',
};

const RING_ANIMATIONS: Record<AgentStatus, string> = {
  idle: 'orbit-idle 3.5s ease-in-out infinite',
  writing: 'orbit-write 0.9s ease-in-out infinite',
  waiting: 'orbit-wait 2.4s ease-in-out infinite',
  executing: 'orbit-exec 2s ease-in-out infinite',
  error: 'orbit-error 0.3s ease-in-out infinite alternate',
};

interface StatusOrbProps {
  status: AgentStatus;
  size?: number;
  layoutId?: string;
}

export function StatusOrb({ status, size = 5, layoutId }: StatusOrbProps) {
  const color = STATUS_COLORS[status];
  const animation = RING_ANIMATIONS[status];
  const containerSize = size + 12;

  const Wrapper = layoutId ? motion.span : 'span';
  const wrapperProps = layoutId
    ? { layoutId, layout: true, transition: { type: 'spring', stiffness: 400, damping: 30, mass: 1 } }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      role="img"
      aria-label={`Status: ${status}`}
      className={styles.container}
      style={{ width: containerSize, height: containerSize }}
    >
      {/* Primary orbital ring */}
      <span
        className={`orb-ring ${styles.ring}`}
        style={{ borderColor: color, animation }}
      />

      {/* Second ring for writing state */}
      {status === 'writing' && (
        <span
          className={`orb-ring ${styles.ringOuter}`}
          style={{
            borderColor: color,
            animation: 'orbit-write 0.9s ease-in-out infinite 0.45s',
          }}
        />
      )}

      {/* Bioluminescent glow for executing state */}
      {status === 'executing' && (
        <span
          className={`orb-glow ${styles.glow}`}
          style={{
            background: color,
            animation: 'glow-pulse 2s ease-in-out infinite',
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      )}

      {/* Core orb */}
      <span
        className={styles.core}
        style={{ width: size, height: size, background: color }}
      />
    </Wrapper>
  );
}
```

Note: `size`, `color`, `animation`, and `boxShadow` stay as inline style because they're runtime-dynamic. The `layoutId` prop is added now for Phase 3 — it's a no-op until consumers pass it. The `motion` import is added here; existing callers don't pass `layoutId` so behavior is unchanged.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/StatusOrb.module.css src/components/shared/StatusOrb.tsx
git commit -m "refactor: migrate StatusOrb to CSS modules + add layoutId prop"
```

---

## Task 2: Migrate ZoneLabel, ClickablePath, MurmurationRing

**Files:**
- Create: `src/components/shared/ZoneLabel.module.css`
- Create: `src/components/shared/ClickablePath.module.css`
- Create: `src/components/shared/MurmurationRing.module.css`
- Modify: `src/components/shared/ZoneLabel.tsx`
- Modify: `src/components/shared/ClickablePath.tsx`
- Modify: `src/components/shared/MurmurationRing.tsx`

- [ ] **Step 1: Create ZoneLabel.module.css**

```css
.label {
  font-family: var(--font-label);
  font-size: 7px;
  color: var(--text-dim);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1;
}
```

- [ ] **Step 2: Update ZoneLabel.tsx**

```tsx
import type { ReactNode } from 'react';
import styles from './ZoneLabel.module.css';

interface ZoneLabelProps {
  children: ReactNode;
}

export function ZoneLabel({ children }: ZoneLabelProps) {
  return <span className={styles.label}>{children}</span>;
}
```

- [ ] **Step 3: Create ClickablePath.module.css**

```css
.link {
  color: var(--teal);
  text-decoration: none;
  border-bottom: 0.5px solid rgba(56, 168, 154, 0.3);
}

.link:hover {
  border-bottom-color: rgba(56, 168, 154, 0.6);
}

.linkDisabled {
  composes: link;
  cursor: default;
}
```

- [ ] **Step 4: Update ClickablePath.tsx**

Replace the `<a>` element's inline style with className:

```tsx
// Change the path link rendering (around line 56):
<a
  key={i}
  href="#"
  onClick={(e) => handleClick(seg.content, e)}
  className={isTauri ? styles.link : styles.linkDisabled}
  title={`Click to open, ${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Click to reveal`}
>
  {seg.content}
</a>
```

Add import: `import styles from './ClickablePath.module.css';`

The `style` prop passed to the outer `<span>` remains — it's a runtime prop from the parent.

- [ ] **Step 5: Create MurmurationRing.module.css**

```css
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
}

.label {
  font-family: var(--font-label);
  font-size: 7px;
  color: var(--text-dim);
  letter-spacing: 0.12em;
}
```

- [ ] **Step 6: Update MurmurationRing.tsx**

Add `import styles from './MurmurationRing.module.css';`

Replace the outer `<div style={{...}}>` (line 211) with:
```tsx
<div className={styles.wrapper}>
```

Replace the label `<span style={{...}}>` (line 222) with:
```tsx
<span className={styles.label}>{label}</span>
```

Canvas element keeps its inline `style={{ width: size, height: size }}` — dynamic.

- [ ] **Step 7: Verify build and commit**

```bash
npm run build
git add src/components/shared/ZoneLabel.module.css src/components/shared/ZoneLabel.tsx \
        src/components/shared/ClickablePath.module.css src/components/shared/ClickablePath.tsx \
        src/components/shared/MurmurationRing.module.css src/components/shared/MurmurationRing.tsx
git commit -m "refactor: migrate ZoneLabel, ClickablePath, MurmurationRing to CSS modules"
```

---

## Task 3: Migrate NotchBar + ExpandedPill + AgentPill

**Files:**
- Create: `src/components/NotchBar.module.css`
- Create: `src/components/ExpandedPill.module.css`
- Create: `src/components/AgentPill.module.css`
- Modify: `src/components/NotchBar.tsx`
- Modify: `src/components/ExpandedPill.tsx`
- Modify: `src/components/AgentPill.tsx`

- [ ] **Step 1: Create NotchBar.module.css**

```css
.container {
  width: 100%;
  height: 100%;
  background: #000000;
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 var(--sp-7);
  cursor: pointer;
}

.npMark {
  font-family: var(--font-label);
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.06em;
}

.agentCount {
  font-family: var(--font-ui);
  font-size: 11px;
}

.cost {
  font-family: var(--font-data);
  font-size: 10px;
  color: var(--text-3);
}
```

- [ ] **Step 2: Update NotchBar.tsx**

```tsx
import type { Agent, SessionMetrics } from '../types';
import { StatusOrb } from './shared/StatusOrb';
import styles from './NotchBar.module.css';

interface NotchBarProps {
  agents: Agent[];
  metrics: SessionMetrics;
  onHover: () => void;
  onClick: () => void;
}

export function NotchBar({ agents, metrics, onHover, onClick }: NotchBarProps) {
  const hasAgents = agents.length > 0;

  return (
    <div className={styles.container} onMouseEnter={onHover} onClick={onClick}>
      <span className={styles.npMark}>NP</span>

      {agents.slice(0, 5).map(agent => (
        <StatusOrb key={agent.id} status={agent.status} size={7} />
      ))}

      <span className={styles.agentCount} style={{ color: hasAgents ? 'var(--text-2)' : 'var(--text-3)' }}>
        {hasAgents ? `${agents.length} agent${agents.length !== 1 ? 's' : ''}` : 'No agents'}
      </span>

      {metrics.totalCost > 0 && (
        <span className={styles.cost}>${metrics.totalCost.toFixed(2)}</span>
      )}
    </div>
  );
}
```

Note: `onMouseEnter={onHover}` stays — this is a mode transition trigger, not a hover style handler.

- [ ] **Step 3: Create ExpandedPill.module.css**

```css
.container {
  width: 100%;
  height: 100%;
  background: var(--bg-base);
  border: 0.5px solid var(--stroke);
  border-radius: var(--radius-window);
  overflow: hidden;
}

.rows {
  padding: var(--sp-4) var(--sp-5);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.agentRow {
  width: 100%;
  height: 28px;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: 0 var(--sp-2);
  background: transparent;
  border: none;
  border-radius: var(--radius-button);
  cursor: pointer;
  transition: background 100ms;
}

.agentRow:hover {
  background: var(--bg-elevated);
}

.agentName {
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 500;
  color: var(--text-1);
  white-space: nowrap;
}

.agentMeta {
  font-family: var(--font-data);
  font-size: 9px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  text-align: left;
}

.agentCost {
  font-family: var(--font-data);
  font-size: 9px;
  white-space: nowrap;
}

.pendingBadge {
  font-family: var(--font-label);
  font-size: 8px;
  color: var(--gold);
  background: var(--gold-dim);
  border: 0.5px solid var(--gold-border);
  border-radius: var(--radius-badge);
  padding: 1px 5px;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-3) var(--sp-5) var(--sp-4);
  border-top: 0.5px solid var(--bg-surface);
}

.footerText {
  font-family: var(--font-data);
  font-size: 9px;
  color: var(--text-3);
}

.expandButton {
  font-family: var(--font-data);
  font-size: 9px;
  color: var(--teal);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px var(--sp-2);
}

.expandButton:hover {
  color: var(--text-1);
}
```

- [ ] **Step 4: Update ExpandedPill.tsx**

```tsx
import type { Agent, AgentStatus, SessionMetrics } from '../types';
import { StatusOrb } from './shared/StatusOrb';
import styles from './ExpandedPill.module.css';

interface ExpandedPillProps {
  agents: Agent[];
  metrics: SessionMetrics;
  onSelectAgent: (id: string) => void;
  onExpandFull: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'var(--teal)',
  writing: 'var(--gold)',
  waiting: 'var(--steel)',
  executing: 'var(--ripple)',
  error: 'var(--coral)',
};

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function AgentRow({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const hasPending = agent.pendingApproval !== null;

  return (
    <button role="menuitem" onClick={onClick} className={styles.agentRow}>
      <StatusOrb status={agent.status} size={5} />
      <span className={styles.agentName}>{agent.name}</span>
      <span className={styles.agentMeta}>
        {agent.model} · {agent.status} · {formatElapsed(agent.elapsedSeconds)}
      </span>
      <span
        className={styles.agentCost}
        style={{ color: hasPending ? STATUS_COLORS[agent.status] : 'var(--text-3)' }}
      >
        ${agent.cost.toFixed(2)}
      </span>
      {hasPending && <span className={styles.pendingBadge}>PENDING</span>}
    </button>
  );
}

export function ExpandedPill({
  agents, metrics, onSelectAgent, onExpandFull, onMouseEnter, onMouseLeave,
}: ExpandedPillProps) {
  return (
    <div className={styles.container} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div role="menu" className={styles.rows}>
        {agents.map(agent => (
          <AgentRow key={agent.id} agent={agent} onClick={() => onSelectAgent(agent.id)} />
        ))}
      </div>
      <div className={styles.footer}>
        <span className={styles.footerText}>
          {agents.length} agents · ${metrics.totalCost.toFixed(2)}
        </span>
        <button onClick={onExpandFull} className={styles.expandButton}>⌘⇧N</button>
      </div>
    </div>
  );
}
```

Key change: `onMouseEnter`/`onMouseLeave` on `AgentRow` (hover style handlers) are REMOVED — replaced by CSS `:hover` on `.agentRow`. The `onMouseEnter`/`onMouseLeave` on the outer container STAY — those are mode-transition triggers passed from App.tsx.

- [ ] **Step 5: Create AgentPill.module.css**

```css
.pill {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: all 120ms ease;
}

.pill:hover {
  background: var(--bg-elevated);
}

.pillActive {
  composes: pill;
  background: var(--bg-elevated);
  border-color: var(--border-subtle);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.agentLabel {
  font-size: 11px;
  font-family: var(--font-data);
  letter-spacing: 0.08em;
  font-weight: 500;
}

.toolHint {
  font-size: 10px;
  color: var(--text-dim);
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.waitBadge {
  font-size: 9px;
  color: var(--gold);
  background: var(--gold-dim);
  padding: 1px 5px;
  border-radius: var(--radius-badge);
  letter-spacing: 0.06em;
}

.doneMark {
  font-size: 11px;
  color: var(--text-dim);
}
```

- [ ] **Step 6: Update AgentPill.tsx**

```tsx
import type { Session } from '../types';
import styles from './AgentPill.module.css';

interface Props {
  session: Session;
  isActive: boolean;
  onClick: () => void;
}

const AGENT_LABELS: Record<string, string> = {
  claude: 'CC',
  codex: 'CX',
  gemini: 'GM',
};

const STATUS_COLOR: Record<string, string> = {
  running: 'var(--ripple)',
  waiting: 'var(--gold)',
  done: 'var(--text-dim)',
  error: 'var(--coral)',
};

export function AgentPill({ session, isActive, onClick }: Props) {
  const label = AGENT_LABELS[session.agent] ?? session.agent.slice(0, 2).toUpperCase();
  const color = STATUS_COLOR[session.status] ?? 'var(--text-dim)';
  const isPulsing = session.status === 'running' || session.status === 'waiting';

  return (
    <button onClick={onClick} className={isActive ? styles.pillActive : styles.pill}>
      <span
        className={styles.dot}
        style={{
          background: color,
          animation: isPulsing ? 'pulse-dot 1.8s ease-in-out infinite' : 'none',
          boxShadow: session.status === 'waiting'
            ? `0 0 6px ${color}`
            : session.status === 'running'
              ? `0 0 4px ${color}60`
              : 'none',
        }}
      />
      <span
        className={styles.agentLabel}
        style={{ color: isActive ? 'var(--text-1)' : 'var(--text-2)' }}
      >
        {label}
      </span>
      {session.currentTool && session.status !== 'done' && (
        <span className={styles.toolHint}>{session.currentTool.toLowerCase()}</span>
      )}
      {session.status === 'waiting' && <span className={styles.waitBadge}>WAIT</span>}
      {session.status === 'done' && <span className={styles.doneMark}>✓</span>}
    </button>
  );
}
```

Note: AgentPill references `var(--green)`, `var(--red)`, `var(--amber)` which don't exist in the token system. Replaced with correct tokens: `var(--ripple)`, `var(--coral)`, `var(--gold)`.

- [ ] **Step 7: Verify build and commit**

```bash
npm run build
git add src/components/NotchBar.module.css src/components/NotchBar.tsx \
        src/components/ExpandedPill.module.css src/components/ExpandedPill.tsx \
        src/components/AgentPill.module.css src/components/AgentPill.tsx
git commit -m "refactor: migrate NotchBar, ExpandedPill, AgentPill to CSS modules"
```

---

## Task 4: Migrate TopBar, AgentRoster, ActiveSession

**Files:**
- Create: `src/components/command-center/TopBar.module.css`
- Create: `src/components/command-center/AgentRoster.module.css`
- Create: `src/components/command-center/ActiveSession.module.css`
- Modify: corresponding `.tsx` files

- [ ] **Step 1: Create TopBar.module.css**

```css
.container {
  grid-area: topbar;
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 var(--sp-5);
  border-bottom: 0.5px solid var(--border-subtle);
  position: relative;
  z-index: 1;
}

.npMark {
  font-family: var(--font-label);
  font-size: 10px;
  color: var(--text-dim);
  margin-right: var(--sp-6);
  letter-spacing: 0.08em;
}

.agentSelector {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.agentButton {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 2px var(--sp-4);
  background: transparent;
  border: 0.5px solid transparent;
  border-radius: var(--radius-badge);
  cursor: pointer;
  transition: all 100ms;
}

.agentButton:hover {
  background: var(--bg-surface);
}

.agentButtonSelected {
  composes: agentButton;
  background: var(--bg-surface);
  border-color: var(--stroke);
}

.agentButtonLabel {
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 500;
}

.rightSection {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}

.metaText {
  font-family: var(--font-data);
  font-size: 9px;
  color: var(--text-3);
}

.muteButton {
  font-family: var(--font-data);
  font-size: 9px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px var(--sp-2);
}

.statusLabel {
  font-family: var(--font-data);
  font-size: 9px;
}

.liveIndicator {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.liveDot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ripple);
  box-shadow: 0 0 4px var(--ripple);
}

.liveText {
  font-family: var(--font-data);
  font-size: 9px;
  color: var(--ripple);
}

.closeButton {
  font-family: var(--font-ui);
  font-size: 10px;
  color: var(--text-dim);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px var(--sp-3);
  margin-left: var(--sp-2);
  border-radius: var(--radius-button);
  line-height: 1;
}

.closeButton:hover {
  color: var(--text-2);
  background: var(--bg-elevated);
}
```

- [ ] **Step 2: Update TopBar.tsx**

Replace all inline styles with corresponding classNames from the module. Add `import styles from './TopBar.module.css';`. Key changes:

- Outer `<div>` gets `className={styles.container}` + keep `data-tauri-drag-region`
- Agent buttons: use `className={isSelected ? styles.agentButtonSelected : styles.agentButton}`
- Remove all `style={{}}` objects, use classes
- For dynamic colors (`color: isSelected ? ... : ...`), keep as inline style only for the dynamic value

- [ ] **Step 3: Create AgentRoster.module.css**

```css
.container {
  grid-area: agents;
  display: flex;
  flex-direction: column;
  padding: var(--sp-5);
  border-right: 0.5px solid var(--bg-elevated);
  position: relative;
  z-index: 1;
  overflow: hidden;
}

.list {
  margin-top: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  flex: 1;
}

.projectLabel {
  font-family: var(--font-label);
  font-size: 7px;
  color: var(--text-dim);
  letter-spacing: 0.08em;
  display: block;
  padding: var(--sp-2) 0 2px;
}

.agentButton {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--sp-3) var(--sp-2);
  background: transparent;
  border-radius: var(--radius-button);
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 100ms;
}

.agentButton:hover {
  background: var(--bg-elevated);
}

.agentButtonSelected {
  composes: agentButton;
  background: var(--bg-elevated);
}

.nameRow {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.agentName {
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.metaRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 21px;
}

.metaText {
  font-family: var(--font-data);
  font-size: 8px;
  color: var(--text-3);
}

.totalSection {
  border-top: 0.5px solid var(--border-subtle);
  padding-top: var(--sp-4);
  margin-top: auto;
}

.totalCost {
  font-family: var(--font-ui);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-1);
}
```

- [ ] **Step 4: Update AgentRoster.tsx**

Replace all inline styles with classNames. Agent button uses `className={isSelected ? styles.agentButtonSelected : styles.agentButton}`. For the dynamic agent name color (`color: isSelected ? STATUS_COLORS[agent.status] : 'var(--text-1)'`), keep as inline style.

- [ ] **Step 5: Create ActiveSession.module.css**

```css
.container {
  grid-area: center;
  display: flex;
  flex-direction: column;
  padding: var(--sp-5);
  overflow: auto;
  position: relative;
  z-index: 1;
}

.emptyState {
  composes: container;
  align-items: center;
  justify-content: center;
}

.emptyText {
  font-family: var(--font-ui);
  font-size: 12px;
  color: var(--text-dim);
}

.zoneLabel {
  margin-bottom: var(--sp-4);
}

.riskBadge {
  font-family: var(--font-label);
  font-size: 8px;
  border-radius: var(--radius-badge);
  padding: 2px var(--sp-3);
  letter-spacing: 0.08em;
}

.impactMeta {
  font-family: var(--font-data);
  font-size: 9px;
  color: var(--text-3);
}

.highRiskSummary {
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 500;
  color: var(--coral);
  padding: var(--sp-2) 0;
  margin-bottom: var(--sp-2);
}

.diffBlock {
  background: var(--bg-base);
  border-radius: var(--radius-button);
  border: 0.5px solid var(--bg-elevated);
  margin-bottom: var(--sp-4);
  overflow: auto;
}

.diffLine {
  font-family: var(--font-data);
  font-size: 9px;
  line-height: 16px;
  padding: 0 var(--sp-2);
  margin-bottom: 2px;
}

.diffLineNumber {
  color: var(--text-dim);
  margin-right: var(--sp-4);
  display: inline-block;
  width: 24px;
  text-align: right;
}

.diffPrefix {
  color: var(--text-dim);
  margin-right: var(--sp-2);
}

.actions {
  display: flex;
  gap: var(--sp-4);
}

.approveButton {
  font-family: var(--font-ui);
  font-weight: 500;
  color: rgba(56, 168, 154, 0.85);
  background: rgba(56, 168, 154, 0.08);
  border: 0.5px solid rgba(56, 168, 154, 0.20);
  border-radius: var(--radius-button);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  transition: all 120ms ease-out;
}

.approveButton:hover {
  background: rgba(56, 168, 154, 0.14);
  border-color: rgba(56, 168, 154, 0.35);
  transform: translateY(-0.5px);
}

.approveButton:active {
  transform: scale(0.97) translateY(0);
  transition-duration: 50ms;
}

.denyButton {
  font-family: var(--font-ui);
  font-weight: 500;
  color: rgba(224, 136, 112, 0.70);
  background: rgba(224, 136, 112, 0.05);
  border: 0.5px solid rgba(224, 136, 112, 0.12);
  border-radius: var(--radius-button);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  transition: all 120ms ease-out;
}

.denyButton:hover {
  background: rgba(224, 136, 112, 0.10);
  border-color: rgba(224, 136, 112, 0.25);
  transform: translateY(-0.5px);
}

.denyButton:active {
  transform: scale(0.97) translateY(0);
  transition-duration: 50ms;
}

.kbHint {
  font-family: var(--font-data);
  font-size: 8px;
}

.statusBlock {
  font-family: var(--font-data);
  font-size: 9px;
  color: var(--text-3);
  padding: var(--sp-4);
}

.statusMessage {
  margin-bottom: var(--sp-4);
  color: var(--text-2);
}

.sessionMeta {
  color: var(--text-dim);
  font-size: 8px;
}
```

- [ ] **Step 6: Update ActiveSession.tsx**

Replace all inline styles. Key change: REMOVE `onMouseDown`/`onMouseUp` handlers on approve/deny buttons — the CSS `:active` selector now handles the press effect. Use `className={styles.approveButton}` and `className={styles.denyButton}`. Dynamic values (risk-tier-dependent padding, fontSize, maxDiffHeight) stay as inline style on the diff block.

- [ ] **Step 7: Verify build and commit**

```bash
npm run build
git add src/components/command-center/TopBar.module.css src/components/command-center/TopBar.tsx \
        src/components/command-center/AgentRoster.module.css src/components/command-center/AgentRoster.tsx \
        src/components/command-center/ActiveSession.module.css src/components/command-center/ActiveSession.tsx
git commit -m "refactor: migrate TopBar, AgentRoster, ActiveSession to CSS modules"
```

---

## Task 5: Migrate MetricsRail, EventTimeline, SpacetimeGrid, HistoryView

**Files:**
- Create: CSS module for each
- Modify: corresponding TSX

- [ ] **Step 1: Create MetricsRail.module.css**

```css
.container {
  grid-area: metrics;
  display: flex;
  flex-direction: column;
  padding: var(--sp-5);
  border-left: 0.5px solid var(--bg-elevated);
  gap: var(--sp-4);
  position: relative;
  z-index: 1;
}

.budgetWrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.budgetText {
  font-family: var(--font-data);
  font-size: 8px;
  color: var(--text-dim);
}

.sectionLabel {
  font-family: var(--font-label);
  font-size: 7px;
  color: var(--text-dim);
  letter-spacing: 0.12em;
}

.bigNumber {
  font-family: var(--font-ui);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-1);
}

.approvalNumber {
  font-family: var(--font-ui);
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1);
}

.approvalDenied {
  font-size: 10px;
  color: var(--text-3);
  font-weight: 400;
  margin-left: var(--sp-2);
}

.tokenLabel {
  font-family: var(--font-ui);
  font-size: 9px;
  color: var(--text-dim);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
```

- [ ] **Step 2: Update MetricsRail.tsx** — Replace inline styles with classNames.

- [ ] **Step 3: Create EventTimeline.module.css**

```css
.container {
  grid-area: timeline;
  height: 36px;
  display: flex;
  align-items: flex-end;
  padding: 0 var(--sp-5);
  padding-bottom: var(--sp-3);
  border-top: 0.5px solid var(--bg-surface);
  background: var(--bg-base);
  position: relative;
  z-index: 1;
  gap: 2px;
}

.bar {
  width: 3px;
  border-radius: 1px;
  flex-shrink: 0;
  transition: height 150ms ease-out;
}

.timestamp {
  margin-left: auto;
  font-family: var(--font-data);
  font-size: 7px;
  color: var(--text-dim);
  flex-shrink: 0;
  align-self: center;
}
```

- [ ] **Step 4: Update EventTimeline.tsx** — Replace inline styles. Bar height/color/opacity stay as inline style (dynamic per event).

- [ ] **Step 5: Create SpacetimeGrid.module.css**

```css
.canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  border-radius: inherit;
}
```

- [ ] **Step 6: Update SpacetimeGrid.tsx** — Replace inline style on canvas with `className={styles.canvas}`. Canvas dimensions are set via JS (ResizeObserver), so `style={{ width, height }}` set by JS stays.

- [ ] **Step 7: Create HistoryView.module.css**

```css
.container {
  grid-area: center;
  display: flex;
  flex-direction: column;
  padding: var(--sp-5);
  overflow: auto;
  position: relative;
  z-index: 1;
}

.header {
  margin-bottom: var(--sp-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sessionCount {
  font-family: var(--font-data);
  font-size: 8px;
  color: var(--text-dim);
}

.searchInput {
  font-family: var(--font-data);
  font-size: 9px;
  color: var(--text-1);
  background: var(--bg-surface);
  border: 0.5px solid var(--stroke);
  border-radius: var(--radius-button);
  padding: var(--sp-2) var(--sp-4);
  margin-bottom: var(--sp-4);
  width: 100%;
}

.searchInput::placeholder {
  color: var(--text-dim);
}

.sessionList {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.emptyText {
  font-family: var(--font-data);
  font-size: 9px;
  color: var(--text-dim);
  padding: var(--sp-4);
}

.sessionButton {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-button);
  cursor: pointer;
  text-align: left;
}

.sessionButton:hover {
  background: var(--bg-elevated);
}

.sessionButtonExpanded {
  composes: sessionButton;
  background: var(--bg-elevated);
}

.agentDot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sessionName {
  font-family: var(--font-ui);
  font-size: 9px;
  color: var(--text-1);
  flex: 1;
}

.sessionCwd {
  color: var(--text-3);
  margin-left: var(--sp-2);
}

.sessionDuration {
  font-family: var(--font-data);
  font-size: 8px;
  color: var(--text-3);
}

.eventCount {
  font-family: var(--font-data);
  font-size: 8px;
  color: var(--text-dim);
}

.statusBadge {
  font-family: var(--font-label);
  font-size: 7px;
  letter-spacing: 0.06em;
}

.eventsPane {
  margin-left: var(--sp-6);
  padding: var(--sp-2) 0;
  border-left: 0.5px solid var(--border-subtle);
  padding-left: var(--sp-4);
}

.eventRow {
  font-family: var(--font-data);
  font-size: 8px;
  color: var(--text-3);
  padding: 1px 0;
  display: flex;
  gap: var(--sp-4);
}

.eventTime {
  color: var(--text-dim);
  width: 40px;
  flex-shrink: 0;
}

.eventSummary {
  color: var(--text-dim);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 8: Update HistoryView.tsx** — Replace all inline styles with classNames. Session button uses `className={expandedSession === session.id ? styles.sessionButtonExpanded : styles.sessionButton}`. Dynamic colors (status badge, agent dot) stay inline.

- [ ] **Step 9: Verify build and commit**

```bash
npm run build
git add src/components/command-center/MetricsRail.module.css src/components/command-center/MetricsRail.tsx \
        src/components/command-center/EventTimeline.module.css src/components/command-center/EventTimeline.tsx \
        src/components/command-center/SpacetimeGrid.module.css src/components/command-center/SpacetimeGrid.tsx \
        src/components/command-center/HistoryView.module.css src/components/command-center/HistoryView.tsx
git commit -m "refactor: migrate MetricsRail, EventTimeline, SpacetimeGrid, HistoryView to CSS modules"
```

---

## Task 6: Migrate QuestionPanel, PlanReview, Onboarding, SessionDetail, ApprovalPanel

**Files:**
- Create: CSS module for each
- Modify: corresponding TSX

- [ ] **Step 1: Create QuestionPanel.module.css**

```css
.questionBadge {
  font-family: var(--font-label);
  font-size: 8px;
  border-radius: var(--radius-badge);
  padding: 2px var(--sp-3);
  letter-spacing: 0.08em;
}

.questionText {
  font-family: var(--font-ui);
  font-size: 11px;
  color: var(--text-1);
  margin-bottom: var(--sp-5);
  line-height: 18px;
}

.options {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.optionButton {
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 500;
  color: var(--text-1);
  background: var(--bg-surface);
  border: 0.5px solid var(--stroke);
  border-radius: var(--radius-button);
  padding: var(--sp-3) var(--sp-5);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  text-align: left;
  transition: background 100ms;
}

.optionButton:hover {
  background: var(--bg-elevated);
}

.kbHint {
  font-family: var(--font-data);
  font-size: 9px;
  color: var(--teal);
  flex-shrink: 0;
}
```

- [ ] **Step 2: Update QuestionPanel.tsx** — Replace inline styles, add CSS module import.

- [ ] **Step 3: Create PlanReview.module.css**

```css
.planContent {
  background: var(--bg-base);
  border-radius: var(--radius-button);
  border: 0.5px solid var(--bg-elevated);
  padding: 10px;
  margin-bottom: var(--sp-4);
  overflow: auto;
  max-height: 300px;
  font-family: var(--font-data);
  font-size: 9px;
  line-height: 16px;
  color: var(--text-2);
  white-space: pre-wrap;
}

.feedbackInput {
  width: 100%;
  min-height: 48px;
  font-family: var(--font-data);
  font-size: 9px;
  color: var(--text-1);
  background: var(--bg-surface);
  border: 0.5px solid var(--stroke);
  border-radius: var(--radius-button);
  padding: var(--sp-3);
  resize: vertical;
}

.feedbackSubmit {
  font-family: var(--font-ui);
  font-size: 9px;
  color: var(--gold);
  background: var(--gold-dim);
  border: 0.5px solid var(--gold-border);
  border-radius: var(--radius-button);
  padding: 3px var(--sp-4);
  cursor: pointer;
  margin-top: var(--sp-2);
}

.actions {
  display: flex;
  gap: var(--sp-4);
}

.approveButton {
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 500;
  color: rgba(56, 168, 154, 0.85);
  background: rgba(56, 168, 154, 0.08);
  border: 0.5px solid rgba(56, 168, 154, 0.20);
  border-radius: var(--radius-button);
  padding: var(--sp-2) var(--sp-5);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  transition: all 120ms ease-out;
}

.approveButton:hover {
  background: rgba(56, 168, 154, 0.14);
  transform: translateY(-0.5px);
}

.approveButton:active {
  transform: scale(0.97) translateY(0);
}

.denyButton {
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 500;
  color: rgba(224, 136, 112, 0.70);
  background: rgba(224, 136, 112, 0.05);
  border: 0.5px solid rgba(224, 136, 112, 0.12);
  border-radius: var(--radius-button);
  padding: var(--sp-2) var(--sp-5);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  transition: all 120ms ease-out;
}

.denyButton:hover {
  background: rgba(224, 136, 112, 0.10);
  transform: translateY(-0.5px);
}

.denyButton:active {
  transform: scale(0.97) translateY(0);
}

.changesButton {
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 500;
  color: var(--gold);
  background: var(--gold-dim);
  border: 0.5px solid var(--gold-border);
  border-radius: var(--radius-button);
  padding: var(--sp-2) var(--sp-5);
  cursor: pointer;
}

.changesButton:hover {
  background: rgba(212, 174, 72, 0.12);
}

.kbHint {
  font-family: var(--font-data);
  font-size: 8px;
  opacity: 0.4;
}

.badge {
  font-family: var(--font-label);
  font-size: 8px;
  color: var(--gold);
  background: var(--gold-dim);
  border: 0.5px solid var(--gold-border);
  border-radius: var(--radius-badge);
  padding: 2px var(--sp-3);
  letter-spacing: 0.08em;
}
```

- [ ] **Step 4: Update PlanReview.tsx** — Replace inline styles with classNames.

- [ ] **Step 5: Create Onboarding.module.css**

```css
.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  padding: var(--sp-9);
  gap: var(--sp-8);
}

.logo {
  font-family: var(--font-label);
  font-size: 28px;
  color: var(--text-1);
  letter-spacing: 0.08em;
}

.tagline {
  font-family: var(--font-ui);
  font-size: 14px;
  color: var(--text-2);
  text-align: center;
}

.agentList {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  width: 100%;
  max-width: 280px;
}

.detectionNote {
  font-family: var(--font-data);
  font-size: 9px;
  color: var(--text-dim);
  text-align: center;
}

.agentCard {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-3) 10px;
  background: var(--bg-surface);
  border-radius: var(--radius-pill);
  border: 0.5px solid var(--border-subtle);
}

.agentDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.agentName {
  font-family: var(--font-ui);
  font-size: 11px;
  color: var(--text-1);
  flex: 1;
}

.agentStatus {
  font-family: var(--font-data);
  font-size: 8px;
}

.buttonRow {
  display: flex;
  gap: var(--sp-5);
}

.setupButton {
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 500;
  color: var(--bg-base);
  background: var(--teal);
  border: none;
  border-radius: var(--radius-pill);
  padding: var(--sp-4) var(--sp-7);
  cursor: pointer;
  transition: all 100ms;
}

.setupButton:hover {
  opacity: 0.9;
}

.setupButton:disabled {
  opacity: 0.5;
  cursor: default;
}

.skipButton {
  font-family: var(--font-ui);
  font-size: 11px;
  color: var(--text-3);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--sp-4) var(--sp-5);
}

.skipButton:hover {
  color: var(--text-2);
}

.doneText {
  font-family: var(--font-ui);
  font-size: 12px;
  color: var(--teal);
}
```

- [ ] **Step 6: Update Onboarding.tsx** — Replace inline styles with classNames.

- [ ] **Step 7: Create SessionDetail.module.css and ApprovalPanel.module.css**

SessionDetail and ApprovalPanel use legacy token names (`--green`, `--red`, `--amber`, `--mono`, `--bg`, `--border`, `--border-bright`, `--text-primary`, `--text-secondary`). Migration should fix these to the canonical token names:
- `--green` → `--ripple`
- `--red` → `--coral`
- `--amber` → `--gold`
- `--mono` → `--font-data`
- `--bg` → `--bg-base`
- `--border` → `--border-subtle`
- `--border-bright` → `--stroke`
- `--text-primary` → `--text-1`
- `--text-secondary` → `--text-2`
- `--green-dim` → `--teal-dim`
- `--green-glow` → `rgba(56, 168, 154, 0.15)`
- `--red-dim` → `--coral-dim`
- `--amber-dim` → `--gold-dim`

Create CSS modules mirroring the existing inline styles but with corrected token names. Remove `onMouseEnter`/`onMouseLeave` hover handlers from ApprovalPanel.tsx — replace with CSS `:hover`.

- [ ] **Step 8: Verify build and commit**

```bash
npm run build
git add src/components/command-center/QuestionPanel.module.css src/components/command-center/QuestionPanel.tsx \
        src/components/command-center/PlanReview.module.css src/components/command-center/PlanReview.tsx \
        src/components/Onboarding.module.css src/components/Onboarding.tsx \
        src/components/SessionDetail.module.css src/components/SessionDetail.tsx \
        src/components/ApprovalPanel.module.css src/components/ApprovalPanel.tsx
git commit -m "refactor: migrate QuestionPanel, PlanReview, Onboarding, SessionDetail, ApprovalPanel to CSS modules"
```

---

## Task 7: Convert CommandCenter.css to module + Phase 1 validation

**Files:**
- Rename: `src/components/command-center/CommandCenter.css` → `src/components/command-center/CommandCenter.module.css`
- Modify: `src/components/command-center/CommandCenter.tsx`

- [ ] **Step 1: Create CommandCenter.module.css (replacing CommandCenter.css)**

```css
.container {
  display: grid;
  grid-template-rows: 36px 1fr 36px;
  grid-template-columns: 140px 1fr 120px;
  grid-template-areas:
    "topbar   topbar   topbar"
    "agents   center   metrics"
    "timeline timeline timeline";
  width: 100%;
  height: 100%;
  backdrop-filter: saturate(120%) blur(16px);
  -webkit-backdrop-filter: saturate(120%) blur(16px);
  background: rgba(19, 22, 28, 0.88);
  border: 0.5px solid var(--stroke);
  border-radius: var(--radius-window);
  overflow: hidden;
  position: relative;
}
```

- [ ] **Step 2: Update CommandCenter.tsx**

Change import from `import './CommandCenter.css';` to `import styles from './CommandCenter.module.css';`

Change `<div className="command-center">` to `<div className={styles.container}>`

- [ ] **Step 3: Delete old CommandCenter.css**

```bash
rm src/components/command-center/CommandCenter.css
```

- [ ] **Step 4: Full Phase 1 validation**

Run: `npm run build`
Expected: Build succeeds with zero errors.

Run: `npx vite dev --port 5199`
Expected: Visual appearance identical to pre-migration state.

Verify: no remaining inline `style={{}}` objects except for genuinely dynamic values (canvas dimensions, runtime colors from props, conditional display).

Verify: no remaining `onMouseEnter`/`onMouseLeave` hover-style handlers (mode transition handlers on NotchBar/ExpandedPill are fine — those control app state, not styles).

Verify: no remaining `onMouseDown`/`onMouseUp` press handlers for visual effects.

- [ ] **Step 5: Commit**

```bash
git add src/components/command-center/CommandCenter.module.css src/components/command-center/CommandCenter.tsx
git rm src/components/command-center/CommandCenter.css 2>/dev/null || true
git commit -m "refactor: complete Phase 1 — all components migrated to CSS modules"
```

---

## Task 8: Phase 2 — Glass & Vibrancy

**Files:**
- Modify: `src/styles/index.css`
- Modify: `src/components/NotchBar.module.css`
- Modify: `src/components/ExpandedPill.module.css`
- Modify: `src/components/command-center/CommandCenter.module.css`
- Modify: `src/components/command-center/AgentRoster.module.css`
- Modify: `src/components/command-center/MetricsRail.module.css`
- Modify: `src/components/command-center/EventTimeline.module.css`

- [ ] **Step 1: Add glass tokens to index.css**

Add these custom properties inside the `:root` block, after the existing transitions section:

```css
  /* Glass layers */
  --glass-notch: rgba(0, 0, 0, 0.85);
  --glass-pill: rgba(19, 22, 28, 0.78);
  --glass-cc: rgba(19, 22, 28, 0.75);
  --glass-blur-notch: 20px;
  --glass-blur-pill: 24px;
  --glass-blur-cc: 28px;

  /* Inner light catch */
  --light-catch: rgba(255, 255, 255, 0.035);
  --light-catch-strong: rgba(255, 255, 255, 0.05);

  /* Interior zone backgrounds */
  --zone-bg-side: rgba(26, 30, 38, 0.4);
  --zone-bg-bottom: rgba(19, 22, 28, 0.5);
  --zone-border: rgba(74, 80, 96, 0.25);
```

- [ ] **Step 2: Update NotchBar glass**

In `NotchBar.module.css`, update `.container`:
```css
.container {
  /* ... keep display, flex, padding, cursor ... */
  background: var(--glass-notch);
  backdrop-filter: saturate(150%) blur(var(--glass-blur-notch));
  -webkit-backdrop-filter: saturate(150%) blur(var(--glass-blur-notch));
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
  box-shadow: inset 0 -0.5px 0 rgba(255, 255, 255, 0.04);
}
```

- [ ] **Step 3: Update ExpandedPill glass**

In `ExpandedPill.module.css`, update `.container`:
```css
.container {
  width: 100%;
  height: 100%;
  background: var(--glass-pill);
  backdrop-filter: saturate(130%) blur(var(--glass-blur-pill));
  -webkit-backdrop-filter: saturate(130%) blur(var(--glass-blur-pill));
  border: 0.5px solid rgba(74, 80, 96, 0.5);
  border-radius: var(--radius-window);
  overflow: hidden;
  box-shadow:
    inset 0 0.5px 0 var(--light-catch),
    0 8px 32px rgba(0, 0, 0, 0.4);
}
```

- [ ] **Step 4: Update CommandCenter glass**

In `CommandCenter.module.css`, update `.container`:
```css
.container {
  /* ... keep grid layout ... */
  background: var(--glass-cc);
  backdrop-filter: saturate(140%) blur(var(--glass-blur-cc));
  -webkit-backdrop-filter: saturate(140%) blur(var(--glass-blur-cc));
  border: 0.5px solid rgba(74, 80, 96, 0.4);
  border-radius: var(--radius-window);
  overflow: hidden;
  position: relative;
  box-shadow:
    inset 0 0.5px 0 var(--light-catch),
    0 12px 48px rgba(0, 0, 0, 0.5);
}
```

- [ ] **Step 5: Update interior zone backgrounds**

In `AgentRoster.module.css`, update `.container`:
```css
  background: var(--zone-bg-side);
  border-right: 0.5px solid var(--zone-border);
```

In `MetricsRail.module.css`, update `.container`:
```css
  background: rgba(26, 30, 38, 0.3);
  border-left: 0.5px solid var(--zone-border);
```

In `EventTimeline.module.css`, update `.container`:
```css
  background: var(--zone-bg-bottom);
  border-top: 0.5px solid rgba(74, 80, 96, 0.2);
```

- [ ] **Step 6: Verify and commit**

```bash
npm run build
```

Visually verify in `npx vite dev --port 5199`:
- NotchBar: slight transparency, no drop shadow
- ExpandedPill: more transparent, subtle drop shadow
- Command Center: most transparent, largest shadow
- Interior zones: semi-transparent, not opaque
- Text legible in all modes

```bash
git add src/styles/index.css \
        src/components/NotchBar.module.css \
        src/components/ExpandedPill.module.css \
        src/components/command-center/CommandCenter.module.css \
        src/components/command-center/AgentRoster.module.css \
        src/components/command-center/MetricsRail.module.css \
        src/components/command-center/EventTimeline.module.css
git commit -m "feat: Phase 2 — glass vibrancy across all three modes"
```

---

## Task 9: Phase 3 — Context7 Research + Shared Element Transitions

**Files:**
- Modify: `src/components/shared/StatusOrb.tsx` (already has layoutId from Task 1)
- Modify: `src/components/NotchBar.tsx`
- Modify: `src/components/ExpandedPill.tsx`
- Modify: `src/components/command-center/AgentRoster.tsx`
- Modify: `src/components/command-center/TopBar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Pull Framer Motion 12 docs via Context7**

Before writing any code, use the Context7 MCP to pull current Framer Motion documentation:

```
resolve-library-id: "framer-motion"
get-library-docs: topic "layoutId AnimatePresence mode popLayout"
```

Verify:
1. Does `layoutId` work across `AnimatePresence` boundaries with `mode="popLayout"`?
2. Are there known issues with `layout` + `layoutId` in conditionally-rendered trees?
3. What's the recommended pattern for elements that exist in one mode but not another (appear/disappear)?

**Proceed only after confirming the API behavior.** If the docs reveal that `mode="popLayout"` doesn't support cross-boundary `layoutId`, use `mode="sync"` or remove the mode entirely.

- [ ] **Step 2: Wire layoutId to NotchBar orbs**

In `NotchBar.tsx`, add `layoutId` to each StatusOrb:

```tsx
{agents.slice(0, 5).map(agent => (
  <StatusOrb key={agent.id} status={agent.status} size={7} layoutId={`orb-${agent.id}`} />
))}
```

- [ ] **Step 3: Wire layoutId to ExpandedPill elements**

In `ExpandedPill.tsx`, update the `AgentRow` function:

```tsx
// StatusOrb in AgentRow
<StatusOrb status={agent.status} size={5} layoutId={`orb-${agent.id}`} />

// Agent name — wrap in motion.span
<motion.span layoutId={`name-${agent.id}`} className={styles.agentName}>
  {agent.name}
</motion.span>

// Agent cost — wrap in motion.span
<motion.span
  layoutId={`cost-${agent.id}`}
  className={styles.agentCost}
  style={{ color: hasPending ? STATUS_COLORS[agent.status] : 'var(--text-3)' }}
>
  ${agent.cost.toFixed(2)}
</motion.span>
```

Add `import { motion } from 'framer-motion';` at the top.

- [ ] **Step 4: Wire layoutId to AgentRoster elements**

In `AgentRoster.tsx`:

```tsx
<StatusOrb status={agent.status} size={5} layoutId={`orb-${agent.id}`} />

<motion.span
  layoutId={`name-${agent.id}`}
  className={styles.agentName}
  style={{ color: isSelected ? STATUS_COLORS[agent.status] : 'var(--text-1)' }}
>
  {agent.name}
</motion.span>
```

Add `import { motion } from 'framer-motion';`.

- [ ] **Step 5: Wire layoutId to TopBar cost + NP mark**

In `TopBar.tsx`:

```tsx
// NP mark — shared with NotchBar
<motion.span layoutId="np-mark" className={styles.npMark}>NP</motion.span>

// Cost — shared with ExpandedPill footer
<motion.span layoutId="session-cost" className={styles.metaText}>
  {formatCost(metrics.totalCost)} · {formatTokens(metrics.totalTokens)} tok
</motion.span>
```

In `NotchBar.tsx`, wrap NP mark:
```tsx
<motion.span layoutId="np-mark" className={styles.npMark}>NP</motion.span>
```

Add `import { motion } from 'framer-motion';` to both files.

- [ ] **Step 6: Update AnimatePresence in App.tsx**

Change the AnimatePresence mode and add position: absolute to content wrappers:

```tsx
<AnimatePresence mode="popLayout">
  {mode === 'notch' && (
    <motion.div
      key="notch"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    >
      <NotchBar ... />
    </motion.div>
  )}

  {mode === 'pill' && (
    <motion.div
      key="pill"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    >
      <ExpandedPill ... />
    </motion.div>
  )}

  {mode === 'command-center' && (
    <motion.div
      key="command-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    >
      <CommandCenter ... />
    </motion.div>
  )}
</AnimatePresence>
```

Note: `position: absolute` + `inset: 0` on each content wrapper allows both exiting and entering content to overlap, which is required for `mode="popLayout"` to enable layout animations.

- [ ] **Step 7: Verify transitions and commit**

```bash
npm run build
```

Visual verification in `npx vite dev --port 5199`:
- Notch → Pill: orbs travel from centered to left-aligned positions
- Pill → CC: agent rows flow into roster, cost moves to top bar
- Reverse transitions work smoothly
- No layout jank or overlapping text

```bash
git add src/components/shared/StatusOrb.tsx \
        src/components/NotchBar.tsx \
        src/components/ExpandedPill.tsx \
        src/components/command-center/AgentRoster.tsx \
        src/components/command-center/TopBar.tsx \
        src/App.tsx
git commit -m "feat: Phase 3 — shared element transitions with layoutId"
```

---

## Task 10: Phase 4 — NotchBar Presence

**Files:**
- Modify: `src/components/NotchBar.tsx`
- Modify: `src/components/NotchBar.module.css`
- Modify: `src/components/ExpandedPill.tsx`
- Modify: `src/components/ExpandedPill.module.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add pending pulse animations to NotchBar.module.css**

```css
.containerPending {
  composes: container;
  animation: notch-pending 4s ease-in-out infinite;
}

.containerHighRisk {
  composes: container;
  animation: notch-danger 2.5s ease-in-out infinite;
}

@keyframes notch-pending {
  0%, 100% { box-shadow: inset 0 -0.5px 0 rgba(212, 174, 72, 0.0); }
  50% { box-shadow: inset 0 -0.5px 0 rgba(212, 174, 72, 0.15); }
}

@keyframes notch-danger {
  0%, 100% { box-shadow: inset 0 -0.5px 0 rgba(224, 136, 112, 0.0); }
  50% { box-shadow: inset 0 -0.5px 0 rgba(224, 136, 112, 0.2); }
}

.activityBar {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  height: 1.5px;
  border-radius: 1px;
  background: var(--ripple);
  opacity: 0.4;
  animation: activity-breathe 1.5s ease-in-out infinite;
}

@keyframes activity-breathe {
  0%, 100% { width: 20px; opacity: 0.2; }
  50% { width: 40px; opacity: 0.4; }
}

.emptyLabel {
  font-family: var(--font-ui);
  font-size: 10px;
  color: var(--text-dim);
  animation: empty-breathe 4s ease-in-out infinite;
}

@keyframes empty-breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}
```

- [ ] **Step 2: Update NotchBar.tsx**

Add `hasPending` and `hasHighRisk` props:

```tsx
interface NotchBarProps {
  agents: Agent[];
  metrics: SessionMetrics;
  onHover: () => void;
  onClick: () => void;
  hasPending?: boolean;
  hasHighRisk?: boolean;
}

export function NotchBar({ agents, metrics, onHover, onClick, hasPending, hasHighRisk }: NotchBarProps) {
  const hasAgents = agents.length > 0;
  const hasActiveWork = agents.some(a => a.status === 'writing' || a.status === 'executing');

  const containerClass = hasHighRisk
    ? styles.containerHighRisk
    : hasPending
      ? styles.containerPending
      : styles.container;

  return (
    <div className={containerClass} onMouseEnter={onHover} onClick={onClick}>
      <span className={styles.npMark}>NP</span>

      {agents.slice(0, 5).map(agent => (
        <StatusOrb key={agent.id} status={agent.status} size={7} layoutId={`orb-${agent.id}`} />
      ))}

      <span className={styles.agentCount} style={{ color: hasAgents ? 'var(--text-2)' : 'var(--text-3)' }}>
        {hasAgents ? `${agents.length} agent${agents.length !== 1 ? 's' : ''}` : ''}
      </span>

      {!hasAgents && <span className={styles.emptyLabel}>listening</span>}

      {metrics.totalCost > 0 && (
        <span className={styles.cost}>${metrics.totalCost.toFixed(2)}</span>
      )}

      {hasActiveWork && <span className={styles.activityBar} />}
    </div>
  );
}
```

- [ ] **Step 3: Add orbButton to ExpandedPill**

In `ExpandedPill.module.css`:
```css
.orbButton {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orbButton:hover {
  background: rgba(56, 168, 154, 0.08);
}
```

In `ExpandedPill.tsx`, update props and AgentRow:

```tsx
interface ExpandedPillProps {
  agents: Agent[];
  metrics: SessionMetrics;
  onSelectAgent: (id: string) => void;
  onExpandFull: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onJumpToTerminal?: (agentId: string) => void;
}

// In AgentRow, add onJumpToTerminal prop and wrap orb:
function AgentRow({ agent, onClick, onJumpToTerminal }: {
  agent: Agent;
  onClick: () => void;
  onJumpToTerminal?: (id: string) => void;
}) {
  // ... existing code ...
  return (
    <button role="menuitem" onClick={onClick} className={styles.agentRow}>
      <button
        className={styles.orbButton}
        onClick={(e) => {
          e.stopPropagation();
          onJumpToTerminal?.(agent.id);
        }}
        aria-label={`Jump to ${agent.name} terminal`}
      >
        <StatusOrb status={agent.status} size={5} layoutId={`orb-${agent.id}`} />
      </button>
      {/* ... rest of row ... */}
    </button>
  );
}
```

- [ ] **Step 4: Wire props in App.tsx**

Pass `hasPending` and `hasHighRisk` to NotchBar:

```tsx
<NotchBar
  agents={agents}
  metrics={metrics}
  onHover={expandToPill}
  onClick={expandToPill}
  hasPending={agents.some(a => a.pendingApproval !== null)}
  hasHighRisk={agents.some(a => a.pendingApproval?.riskTier === 'high')}
/>
```

Pass `onJumpToTerminal` to ExpandedPill:

```tsx
<ExpandedPill
  agents={agents}
  metrics={metrics}
  onSelectAgent={handlePillAgentClick}
  onExpandFull={expandToCommandCenter}
  onMouseEnter={cancelPillCollapse}
  onMouseLeave={startPillCollapse}
  onJumpToTerminal={handleJumpToTerminal}
/>
```

- [ ] **Step 5: Verify and commit**

```bash
npm run build
git add src/components/NotchBar.tsx src/components/NotchBar.module.css \
        src/components/ExpandedPill.tsx src/components/ExpandedPill.module.css \
        src/App.tsx
git commit -m "feat: Phase 4 — NotchBar presence (pending pulse, activity bar, orb click, empty state)"
```

---

## Task 11: Phase 5 — Visual Hierarchy & Contrast

**Files:**
- Modify: `src/components/command-center/ActiveSession.module.css`
- Modify: `src/components/command-center/ActiveSession.tsx`
- Modify: `src/components/command-center/TopBar.module.css`
- Modify: `src/components/command-center/TopBar.tsx`
- Modify: `src/components/ExpandedPill.module.css`
- Modify: `src/components/ExpandedPill.tsx`

- [ ] **Step 1: Add risk-responsive styles to ActiveSession.module.css**

```css
.riskHighContainer {
  border-left: 2px solid var(--coral);
  padding-left: var(--sp-4);
  background: linear-gradient(135deg, rgba(224, 136, 112, 0.04) 0%, transparent 60%);
  border-radius: var(--radius-button);
}

.riskMediumContainer {
  border-left: 0.5px solid var(--gold);
  padding-left: var(--sp-4);
}

.riskLowContainer {
  border-left: none;
  opacity: 0.85;
}

.riskLowDiff {
  max-height: 48px;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
}

/* Update approve/deny button sizes for high-risk */
.riskHighContainer .approveButton,
.riskHighContainer .denyButton {
  padding: var(--sp-3) var(--sp-6);
  font-size: 11px;
  font-weight: 600;
}
```

Note: CSS Modules scope `.riskHighContainer .approveButton` won't work because the class names are mangled. Instead, create explicit modifier classes:

```css
.approveButtonLarge {
  composes: approveButton;
  padding: var(--sp-3) var(--sp-6);
  font-size: 11px;
  font-weight: 600;
}

.denyButtonLarge {
  composes: denyButton;
  padding: var(--sp-3) var(--sp-6);
  font-size: 11px;
  font-weight: 600;
}
```

- [ ] **Step 2: Update ActiveSession.tsx**

Apply risk-tier container class:
```tsx
const containerClass = riskTier === 'high'
  ? styles.riskHighContainer
  : riskTier === 'medium'
    ? styles.riskMediumContainer
    : styles.riskLowContainer;
```

Apply button size class:
```tsx
<button
  onClick={() => onApprove(approval.approvalId)}
  className={riskTier === 'high' ? styles.approveButtonLarge : styles.approveButton}
>
```

For low-risk, add diff fade class:
```tsx
<div className={`${styles.diffBlock} ${riskTier === 'low' ? styles.riskLowDiff : ''}`} ...>
```

- [ ] **Step 3: Add separator dot to TopBar.module.css**

```css
.separator {
  display: inline-block;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: var(--text-dim);
  margin: 0 var(--sp-2);
  vertical-align: middle;
}
```

- [ ] **Step 4: Replace `·` characters in TopBar.tsx**

Replace the template literal `${formatCost(metrics.totalCost)} · {formatTokens(metrics.totalTokens)} tok` with:

```tsx
<>
  {formatCost(metrics.totalCost)}
  <span className={styles.separator} />
  {formatTokens(metrics.totalTokens)} tok
</>
```

- [ ] **Step 5: Add separator to ExpandedPill**

Same pattern — add `.separator` class to `ExpandedPill.module.css` and replace `·` in the AgentRow meta text and footer text.

- [ ] **Step 6: Verify and commit**

```bash
npm run build
git add src/components/command-center/ActiveSession.module.css src/components/command-center/ActiveSession.tsx \
        src/components/command-center/TopBar.module.css src/components/command-center/TopBar.tsx \
        src/components/ExpandedPill.module.css src/components/ExpandedPill.tsx
git commit -m "feat: Phase 5 — risk-responsive visual hierarchy + separator dots"
```

---

## Task 12: Phase 6 — SpacetimeGrid Polish

**Files:**
- Modify: `src/components/command-center/SpacetimeGrid.tsx`

- [ ] **Step 1: Update RISK_CONFIG opacities and warp strengths**

```typescript
const RISK_CONFIG: Record<RiskTier, { opacity: number; cellSize: number; warpStrength: number }> = {
  low:    { opacity: 0.025, cellSize: 28, warpStrength: 0 },
  medium: { opacity: 0.04,  cellSize: 26, warpStrength: 16 },
  high:   { opacity: 0.06,  cellSize: 22, warpStrength: 28 },
};
```

- [ ] **Step 2: Add radial edge fade**

After the vertical lines drawing loop (after line 108 in current code), before `rafRef.current = requestAnimationFrame(draw);`, add:

```typescript
      // Radial edge fade — grid concentrates around warp center
      ctx!.globalCompositeOperation = 'destination-in';
      const fadeGradient = ctx!.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, Math.max(w, h) * 0.6
      );
      fadeGradient.addColorStop(0, 'rgba(0,0,0,1)');
      fadeGradient.addColorStop(0.7, 'rgba(0,0,0,0.5)');
      fadeGradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = fadeGradient;
      ctx!.fillRect(0, 0, w, h);
      ctx!.globalCompositeOperation = 'source-over';
```

- [ ] **Step 3: Verify and commit**

```bash
npm run build
```

Visual verification: grid should be more visible but fade at edges. Low-risk: subtle. High-risk: clearly warped with higher opacity.

```bash
git add src/components/command-center/SpacetimeGrid.tsx
git commit -m "feat: Phase 6 — SpacetimeGrid opacity boost + radial edge fade"
```

---

## Task 13: Phase 7 — First Impression & Onboarding

**Files:**
- Modify: `src/components/ExpandedPill.tsx`

- [ ] **Step 1: Add staggered agent discovery animation**

In `ExpandedPill.tsx`, wrap each `AgentRow` in a `motion.div`:

```tsx
{agents.map((agent, i) => (
  <motion.div
    key={agent.id}
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{
      delay: i * 0.08,
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
    }}
  >
    <AgentRow
      agent={agent}
      onClick={() => onSelectAgent(agent.id)}
      onJumpToTerminal={onJumpToTerminal}
    />
  </motion.div>
))}
```

The `motion` import is already present from Phase 3.

Note: The `NotchBar` "listening" empty state was already added in Task 10 (Phase 4). No additional work needed there.

- [ ] **Step 2: Verify and commit**

```bash
npm run build
```

Visual verification:
- No agents: notch shows "listening" (already done in Phase 4)
- Agents appear: staggered slide-in, 80ms between each

```bash
git add src/components/ExpandedPill.tsx
git commit -m "feat: Phase 7 — staggered agent discovery animation"
```

---

## Task 14: Phase 8 — Sound Polish

**Files:**
- Modify: `src/audio/defaultSounds.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add agentDiscovered sound**

In `defaultSounds.ts`, add to `DEFAULT_SOUNDS`:

```typescript
  agentDiscovered: { waveform: 'sine', frequency: 1200, duration: 30, gain: 0.05 },
```

This is a short, barely-audible click for new agent detection.

- [ ] **Step 2: Wire sound triggers in App.tsx**

Add import: `import { playSound } from './audio/SoundEngine';`

In `handleApprove`, after the `tauriInvoke` call:
```typescript
playSound('approvalRequested');
```

In `handleDeny`, after the `tauriInvoke` call:
```typescript
playSound('error');
```

Add a `useEffect` for agent discovery:
```typescript
const prevAgentCountRef = useRef(agents.length);

useEffect(() => {
  if (agents.length > prevAgentCountRef.current) {
    playSound('agentDiscovered');
  }
  prevAgentCountRef.current = agents.length;
}, [agents.length]);
```

In the existing auto-expand `useEffect` (the one that detects high-risk approvals), add sound:
```typescript
useEffect(() => {
  if (!isLive) return;
  const highRisk = agents.find(a => a.pendingApproval?.riskTier === 'high');
  if (highRisk && mode !== 'command-center') {
    playSound('highRiskApproval');
    setSelectedAgentId(highRisk.id);
    setMode('command-center');
  }
}, [agents, mode, isLive]);
```

- [ ] **Step 3: Add reduced-motion sound suppression**

In `SoundEngine.ts`, add at the top of `playSound`:

```typescript
export function playSound(name: string) {
  if (muted) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // ... rest of function
}
```

- [ ] **Step 4: Verify and commit**

```bash
npm run build
git add src/audio/defaultSounds.ts src/audio/SoundEngine.ts src/App.tsx
git commit -m "feat: Phase 8 — sound wiring + agent discovery click + reduced-motion suppression"
```

---

## Task 15: Final Validation

- [ ] **Step 1: Clean build**

```bash
npm run build
```

Must succeed with zero errors and zero warnings.

- [ ] **Step 2: Visual QA in browser**

```bash
npx vite dev --port 5199
```

Verify all success criteria from the spec:
1. Glass panels show transparency in all three modes
2. Mode transitions morph orbs between positions (layoutId)
3. NotchBar pulses for pending approvals, shows activity bar
4. High-risk approvals visually dominate (coral glow, larger buttons)
5. Low-risk approvals feel compressed
6. SpacetimeGrid is visible with edge fade
7. Empty state shows "listening" with breathing animation
8. Separator dots render correctly in TopBar and ExpandedPill

- [ ] **Step 3: Verify no regressions**

- All keyboard shortcuts work (⌘Y, ⌘N, ⌘⇧N, ⌘], ⌘[, ⌘H, Esc)
- `data-tauri-drag-region` preserved on TopBar
- Mute button works
- `prefers-reduced-motion` suppresses animations and sounds
- No inline style={{}} remains except for genuinely dynamic values

- [ ] **Step 4: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: final visual upgrade cleanup"
```
