# Instrument Cluster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace organic/abstract visualizations with automotive instrument-grade readouts across four components — RadialGauge, StatusOrb, SpacetimeGrid, EventTimeline.

**Architecture:** Four independent component changes. Tasks 1-4 can run in parallel (different files). Task 5 cleans up shared CSS. Task 6 is final validation. All rendering uses SVG for precision elements; canvas stays for the grid.

**Tech Stack:** React 18, Framer Motion 12, SVG, CSS Modules, Canvas 2D

**Spec:** `docs/superpowers/specs/2026-04-05-instrument-cluster-design.md`

---

## File Structure

### New Files
```
src/components/shared/RadialGauge.tsx          — NEW (replaces MurmurationRing)
src/components/shared/RadialGauge.module.css   — NEW
```

### Modified Files
```
src/components/command-center/MetricsRail.tsx   — UPDATE imports (MurmurationRing → RadialGauge)
src/components/shared/StatusOrb.tsx             — REWRITE ring system to SVG arcs
src/components/shared/StatusOrb.module.css      — REPLACE ring/glow styles with SVG arc styles
src/components/command-center/SpacetimeGrid.tsx — ADD concentric rings + crosshair, UPDATE cellSize
src/components/command-center/EventTimeline.tsx — ADD SVG skyline path, baseline, redline
src/components/command-center/EventTimeline.module.css — ADD baseline/redline/svg styles
src/styles/index.css                           — REPLACE orbital keyframes with instrument keyframes
```

### Deleted Files
```
src/components/shared/MurmurationRing.tsx       — DELETE
src/components/shared/MurmurationRing.module.css — DELETE
```

---

## Task 1: RadialGauge Component

**Files:**
- Create: `src/components/shared/RadialGauge.tsx`
- Create: `src/components/shared/RadialGauge.module.css`
- Modify: `src/components/command-center/MetricsRail.tsx`
- Delete: `src/components/shared/MurmurationRing.tsx`
- Delete: `src/components/shared/MurmurationRing.module.css`

- [ ] **Step 1: Create RadialGauge.module.css**

```css
/* src/components/shared/RadialGauge.module.css */
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
  text-transform: uppercase;
}
```

- [ ] **Step 2: Create RadialGauge.tsx**

The 270-degree arc starts at 135 degrees (7 o'clock) and sweeps clockwise to 45 degrees (5 o'clock). The arc is built from three SVG `<circle>` elements using `stroke-dasharray`/`stroke-dashoffset`. A Framer Motion `motion.circle` dot indicator animates along the arc with spring physics.

```tsx
// src/components/shared/RadialGauge.tsx
import { motion, useReducedMotion } from 'framer-motion';
import styles from './RadialGauge.module.css';

interface RadialGaugeProps {
  value: number;       // 0-100
  size?: number;       // diameter in px, default 56
  label?: string;      // center label text
}

// Arc geometry: 270-degree sweep starting at 135° (7 o'clock)
const ARC_START_DEG = 135;
const ARC_SWEEP_DEG = 270;
const ARC_START_RAD = (ARC_START_DEG * Math.PI) / 180;

// Zone thresholds as fractions of the arc
const ZONES = [
  { from: 0,    to: 0.70, color: 'var(--teal)' },
  { from: 0.70, to: 0.90, color: 'var(--gold)' },
  { from: 0.90, to: 1.00, color: 'var(--coral)' },
] as const;

// Tick mark positions (fraction of value range)
const TICKS = [0, 0.25, 0.50, 0.75, 1.0];

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 1 };

function getZoneColor(value: number): string {
  if (value < 70) return 'var(--teal)';
  if (value < 90) return 'var(--gold)';
  return 'var(--coral)';
}

function valueToAngle(value: number): number {
  const clamped = Math.max(0, Math.min(100, value));
  return ARC_START_RAD + (clamped / 100) * (ARC_SWEEP_DEG * Math.PI) / 180;
}

export function RadialGauge({ value, size = 56, label }: RadialGaugeProps) {
  const prefersReduced = useReducedMotion();
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (ARC_SWEEP_DEG / 360) * circumference;

  const clamped = Math.max(0, Math.min(100, value));
  const dotAngle = valueToAngle(clamped);
  const dotX = cx + radius * Math.cos(dotAngle);
  const dotY = cy + radius * Math.sin(dotAngle);
  const dotColor = getZoneColor(clamped);

  // Determine which zone is active
  const activeZoneIdx = clamped < 70 ? 0 : clamped < 90 ? 1 : 2;

  return (
    <div className={styles.wrapper}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label ?? 'Gauge'}: ${clamped}%`}
      >
        {/* Zone arcs */}
        {ZONES.map((zone, i) => {
          const zoneArcFraction = zone.to - zone.from;
          const zoneDash = zoneArcFraction * arcLength;
          const zoneOffset = -(zone.from * arcLength);
          const isActive = i === activeZoneIdx;

          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={zone.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={`${zoneDash} ${circumference - zoneDash}`}
              strokeDashoffset={zoneOffset}
              opacity={isActive ? 1 : 0.12}
              filter={isActive ? `drop-shadow(0 0 2px ${zone.color})` : undefined}
              style={{
                transform: `rotate(${ARC_START_DEG}deg)`,
                transformOrigin: `${cx}px ${cy}px`,
              }}
            />
          );
        })}

        {/* Tick marks */}
        {TICKS.map((frac, i) => {
          const angle = ARC_START_RAD + frac * (ARC_SWEEP_DEG * Math.PI) / 180;
          const innerR = radius - 1;
          const outerR = radius + 3;
          return (
            <line
              key={i}
              x1={cx + innerR * Math.cos(angle)}
              y1={cy + innerR * Math.sin(angle)}
              x2={cx + outerR * Math.cos(angle)}
              y2={cy + outerR * Math.sin(angle)}
              stroke="var(--text-dim)"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Indicator dot */}
        <motion.circle
          cx={dotX}
          cy={dotY}
          r={3}
          fill={dotColor}
          animate={{ cx: dotX, cy: dotY, fill: dotColor }}
          transition={prefersReduced ? { duration: 0 } : SPRING}
        />

        {/* Center label */}
        {label && (
          <text
            x={cx}
            y={cy + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: 7,
              fill: 'var(--text-dim)',
              letterSpacing: '0.12em',
            }}
          >
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}
```

- [ ] **Step 3: Update MetricsRail to use RadialGauge**

In `src/components/command-center/MetricsRail.tsx`:

Replace import:
```tsx
// OLD: import { MurmurationRing } from '../shared/MurmurationRing';
import { RadialGauge } from '../shared/RadialGauge';
```

Replace usage (two instances):
```tsx
// Context health — was MurmurationRing
<RadialGauge value={metrics.contextHealth} size={56} label="CTX" />

// Budget burn — was MurmurationRing
<RadialGauge
  value={Math.min(100, Math.round((totalEstimatedCost / 10) * 100))}
  size={48}
  label="BURN"
/>
```

- [ ] **Step 4: Delete MurmurationRing files**

```bash
rm src/components/shared/MurmurationRing.tsx src/components/shared/MurmurationRing.module.css
```

- [ ] **Step 5: Verify build and commit**

```bash
npm run build
git rm src/components/shared/MurmurationRing.tsx src/components/shared/MurmurationRing.module.css
git add src/components/shared/RadialGauge.tsx src/components/shared/RadialGauge.module.css \
        src/components/command-center/MetricsRail.tsx
git commit -m "feat: replace MurmurationRing with RadialGauge (SVG tachometer arc)"
```

---

## Task 2: StatusOrb Instrument Arcs

**Files:**
- Modify: `src/components/shared/StatusOrb.tsx`
- Modify: `src/components/shared/StatusOrb.module.css`
- Modify: `src/styles/index.css` (replace orbital keyframes)

- [ ] **Step 1: Replace orbital keyframes in index.css**

In `src/styles/index.css`, replace the entire "Orbital Frequency Animations" section (lines ~134-174) with new instrument arc keyframes:

```css
/* ============================================
   Instrument Arc Animations
   Each agent state has a distinct motion signature
   ============================================ */

/* Idle — slow continuous rotation, 8s/revolution */
@keyframes arc-idle {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Writing — counter-rotation for dual arcs, 1.2s/revolution */
@keyframes arc-write-cw {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes arc-write-ccw {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}

/* Waiting — pendulum oscillation ±30 degrees, 2.4s */
@keyframes arc-wait {
  0%, 100% { transform: rotate(-30deg); }
  50% { transform: rotate(30deg); }
}

/* Executing — steady rotation, 1.5s/revolution */
@keyframes arc-exec {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Error — rapid jitter ±5 degrees, 0.3s */
@keyframes arc-error {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}

/* Executing glow pulse (kept from original) */
@keyframes glow-pulse {
  0%, 100% { opacity: 0.03; }
  50% { opacity: 0.06; }
}
```

Also remove the `prefers-reduced-motion` rules that reference `orb-ring` and `orb-glow`:

Replace:
```css
  .orb-ring { animation: none !important; }
  .orb-glow { animation: none !important; display: none; }
```

With:
```css
  .instrument-arc { animation: none !important; }
```

- [ ] **Step 2: Replace StatusOrb.module.css**

Replace the entire file:

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

.arcSvg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
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

- [ ] **Step 3: Rewrite StatusOrb.tsx with SVG arc indicators**

Replace the entire file:

```tsx
// src/components/shared/StatusOrb.tsx
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

// Arc configs: degrees of arc, animation name, duration
const ARC_CONFIGS: Record<AgentStatus, {
  arcs: Array<{ degrees: number; animation: string; duration: string }>;
}> = {
  idle: {
    arcs: [{ degrees: 90, animation: 'arc-idle', duration: '8s' }],
  },
  writing: {
    arcs: [
      { degrees: 60, animation: 'arc-write-cw', duration: '1.2s' },
      { degrees: 60, animation: 'arc-write-ccw', duration: '1.2s' },
    ],
  },
  waiting: {
    arcs: [{ degrees: 120, animation: 'arc-wait', duration: '2.4s' }],
  },
  executing: {
    arcs: [{ degrees: 270, animation: 'arc-exec', duration: '1.5s' }],
  },
  error: {
    arcs: [{ degrees: 45, animation: 'arc-error', duration: '0.3s' }],
  },
};

interface StatusOrbProps {
  status: AgentStatus;
  size?: number;
  layoutId?: string;
}

const LAYOUT_SPRING = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 1 };

export function StatusOrb({ status, size = 5, layoutId }: StatusOrbProps) {
  const color = STATUS_COLORS[status];
  const containerSize = size + 12;
  const arcConfig = ARC_CONFIGS[status];
  const svgSize = containerSize;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const arcRadius = (svgSize - 2) / 2;
  const circumference = 2 * Math.PI * arcRadius;

  const children = (
    <>
      {/* SVG arc indicators */}
      <svg
        className={`${styles.arcSvg} instrument-arc`}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
      >
        {arcConfig.arcs.map((arc, i) => {
          const dashLength = (arc.degrees / 360) * circumference;
          const gapLength = circumference - dashLength;
          // For writing's second arc, offset by 180 degrees
          const rotateOffset = arcConfig.arcs.length > 1 && i === 1 ? 180 : 0;

          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={arcRadius}
              fill="none"
              stroke={color}
              strokeWidth={0.5}
              strokeLinecap="round"
              strokeDasharray={`${dashLength} ${gapLength}`}
              opacity={0.6}
              style={{
                transformOrigin: `${cx}px ${cy}px`,
                transform: `rotate(${rotateOffset}deg)`,
                animation: `${arc.animation} ${arc.duration} linear infinite`,
              }}
            />
          );
        })}
      </svg>

      {/* Executing glow */}
      {status === 'executing' && (
        <span
          className={styles.glow}
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
    </>
  );

  if (layoutId) {
    return (
      <motion.span
        layoutId={layoutId}
        layout
        transition={LAYOUT_SPRING}
        role="img"
        aria-label={`Status: ${status}`}
        className={styles.container}
        style={{ width: containerSize, height: containerSize }}
      >
        {children}
      </motion.span>
    );
  }

  return (
    <span
      role="img"
      aria-label={`Status: ${status}`}
      className={styles.container}
      style={{ width: containerSize, height: containerSize }}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Verify build and commit**

```bash
npm run build
git add src/components/shared/StatusOrb.tsx src/components/shared/StatusOrb.module.css \
        src/styles/index.css
git commit -m "feat: replace StatusOrb orbital rings with SVG instrument arcs"
```

---

## Task 3: SpacetimeGrid Instrument Overlay

**Files:**
- Modify: `src/components/command-center/SpacetimeGrid.tsx`

- [ ] **Step 1: Update RISK_CONFIG cellSize values**

In `SpacetimeGrid.tsx`, change the `RISK_CONFIG` constant:

```typescript
const RISK_CONFIG: Record<RiskTier, { opacity: number; cellSize: number; warpStrength: number }> = {
  low:    { opacity: 0.025, cellSize: 32, warpStrength: 0 },
  medium: { opacity: 0.04,  cellSize: 30, warpStrength: 16 },
  high:   { opacity: 0.06,  cellSize: 26, warpStrength: 28 },
};
```

- [ ] **Step 2: Add concentric rings + crosshair**

After the vertical lines loop (after `ctx!.stroke();` at the end of the `for (let x = ...)` block) and BEFORE the `// Radial edge fade` section, add:

```typescript
      // --- Instrument overlay: concentric rings ---
      const ringRadii = [0.15, 0.30, 0.50];
      for (const frac of ringRadii) {
        const r = Math.min(w, h) * frac;
        ctx!.beginPath();
        ctx!.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(56, 168, 154, ${opacity * 0.6})`;
        ctx!.lineWidth = 0.5;
        ctx!.stroke();
      }

      // --- Instrument overlay: crosshair reticle ---
      ctx!.beginPath();
      ctx!.moveTo(centerX, 0);
      ctx!.lineTo(centerX, h);
      ctx!.moveTo(0, centerY);
      ctx!.lineTo(w, centerY);
      ctx!.strokeStyle = `rgba(56, 168, 154, ${opacity * 0.4})`;
      ctx!.lineWidth = 0.5;
      ctx!.stroke();
```

- [ ] **Step 3: Verify build and commit**

```bash
npm run build
git add src/components/command-center/SpacetimeGrid.tsx
git commit -m "feat: add concentric rings + crosshair reticle to SpacetimeGrid"
```

---

## Task 4: EventTimeline Strip Chart

**Files:**
- Modify: `src/components/command-center/EventTimeline.tsx`
- Modify: `src/components/command-center/EventTimeline.module.css`

- [ ] **Step 1: Add strip chart styles to EventTimeline.module.css**

Add these classes to the existing file:

```css
.svgOverlay {
  position: absolute;
  top: 0;
  left: 12px;
  right: 12px;
  bottom: 0;
  pointer-events: none;
}

.baseline {
  position: absolute;
  bottom: 6px;
  left: 12px;
  right: 12px;
  height: 1px;
  background: var(--text-dim);
  opacity: 0.3;
  pointer-events: none;
}

.redline {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  height: 0;
  border-top: 0.5px dashed var(--coral);
  opacity: 0.1;
  pointer-events: none;
}
```

Also update the `.timeline` class to add `position: relative` if not already present (it should be, but verify).

- [ ] **Step 2: Update EventTimeline.tsx with SVG skyline path + baseline + redline**

Replace the entire file:

```tsx
// src/components/command-center/EventTimeline.tsx
import type { TimelineEvent, RiskTier } from '../../types';
import styles from './EventTimeline.module.css';

interface EventTimelineProps {
  events: TimelineEvent[];
}

const BAR_COLORS: Record<RiskTier, { color: string; opacity: number }> = {
  low: { color: 'var(--teal)', opacity: 0.25 },
  medium: { color: 'var(--gold)', opacity: 0.3 },
  high: { color: 'var(--coral)', opacity: 0.35 },
};

const TYPE_HEIGHTS: Record<TimelineEvent['type'], number> = {
  'auto-approved': 6,
  'approved': 12,
  'pending': 14,
  'denied': 24,
};

const BAR_WIDTH = 3;
const BAR_GAP = 2;
const TIMELINE_HEIGHT = 36;
const PADDING_BOTTOM = 6;

function formatTimeRange(events: TimelineEvent[]): string {
  if (events.length === 0) return '';
  const first = new Date(events[0].timestamp * 1000);
  const last = new Date(events[events.length - 1].timestamp * 1000);
  const fmt = (d: Date) =>
    `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${fmt(first)} → ${fmt(last)}`;
}

function buildSkylinePath(events: TimelineEvent[]): string {
  if (events.length === 0) return '';
  const points = events.map((event, i) => {
    const x = i * (BAR_WIDTH + BAR_GAP) + BAR_WIDTH / 2;
    const y = TIMELINE_HEIGHT - PADDING_BOTTOM - TYPE_HEIGHTS[event.type];
    return `${x},${y}`;
  });
  return `M${points.join(' L')}`;
}

export function EventTimeline({ events }: EventTimelineProps) {
  const hasDenied = events.some(e => e.type === 'denied');
  const skylinePath = buildSkylinePath(events);
  const svgWidth = events.length * (BAR_WIDTH + BAR_GAP);

  return (
    <div className={styles.timeline}>
      {/* Baseline wire */}
      <div className={styles.baseline} />

      {/* Redline marker — only when denials exist */}
      {hasDenied && <div className={styles.redline} />}

      {/* SVG skyline path connecting bar tops */}
      {skylinePath && (
        <svg
          className={styles.svgOverlay}
          viewBox={`0 0 ${svgWidth} ${TIMELINE_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <path
            d={skylinePath}
            fill="none"
            stroke="var(--text-dim)"
            strokeWidth={0.5}
            opacity={0.15}
          />
        </svg>
      )}

      {/* Event bars */}
      {events.map(event => {
        const isQuiet = event.type === 'auto-approved' && event.riskTier === 'low';
        const { color, opacity } = BAR_COLORS[event.riskTier];
        const height = TYPE_HEIGHTS[event.type];

        return (
          <div
            key={event.id}
            className={styles.bar}
            style={{
              height,
              background: isQuiet ? 'var(--bg-elevated)' : color,
              opacity: isQuiet ? 1 : opacity,
            }}
          />
        );
      })}

      {/* Timestamp */}
      <span className={styles.timestamp}>
        {formatTimeRange(events)}
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Verify build and commit**

```bash
npm run build
git add src/components/command-center/EventTimeline.tsx \
        src/components/command-center/EventTimeline.module.css
git commit -m "feat: EventTimeline strip chart — skyline path, baseline, redline"
```

---

## Task 5: Final Validation

- [ ] **Step 1: Clean build**

```bash
npm run build
```

Must succeed with zero errors.

- [ ] **Step 2: Verify no stale references**

Search for any remaining references to deleted MurmurationRing:

```bash
grep -r "MurmurationRing\|murmuration" src/ --include="*.tsx" --include="*.ts" --include="*.css"
```

Expected: no matches.

Search for old orbital animation class names:

```bash
grep -r "orb-ring\|orb-glow\|orbit-idle\|orbit-write\|orbit-wait\|orbit-exec\|orbit-error" src/ --include="*.tsx" --include="*.ts"
```

Expected: no matches in TSX/TS files (the old keyframe names may still exist in index.css if they weren't fully replaced — remove any leftovers).

- [ ] **Step 3: Visual QA checklist**

Open `npx vite dev --port 5199` and verify:

- [ ] MetricsRail shows two RadialGauges (56px CTX, 48px BURN) with 270-degree arcs
- [ ] Each gauge has teal/gold/coral color zones on the arc
- [ ] Dot indicator sits on the arc at the value position
- [ ] Center labels read "CTX" and "BURN" in Departure Mono
- [ ] StatusOrb shows rotating arc segments (not pulsing border rings)
- [ ] Different agent statuses have visually distinct motion signatures
- [ ] SpacetimeGrid shows concentric rings and crosshair overlaid on warped grid
- [ ] EventTimeline has a baseline wire at bottom and skyline path connecting bar tops
- [ ] Denied events trigger the dashed coral redline marker
- [ ] All keyboard shortcuts still work
- [ ] Mode transitions still animate smoothly (layoutId preserved on StatusOrb)

- [ ] **Step 4: Commit any cleanup**

```bash
git add -A
git commit -m "chore: instrument cluster final cleanup"
```
