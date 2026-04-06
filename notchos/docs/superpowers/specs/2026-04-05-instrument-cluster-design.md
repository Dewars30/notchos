# Instrument Cluster Aesthetic — Design Spec

> **Context:** NotchOS's visual language ("Deep Field") is being refined toward an automotive instrument cluster aesthetic — inspired by Porsche tachometer design, aerospace cockpit displays, and precision engineering. This spec covers four components that shift from abstract/organic visualizations to structured instrument-grade readouts.
>
> **Philosophy:** Instruments communicate through position, not parsing. A pilot reads a gauge by where the needle is, not by decoding a number. Every visualization should be legible at a glance from 2 feet away on a 56px canvas.
>
> **Constraint:** SVG for precision elements (gauges, indicators). Canvas stays for the grid (performance). No new dependencies.

---

## 1. RadialGauge (replacing MurmurationRing)

### Problem
MurmurationRing renders 280 particles orbiting a ring at 56px. The murmuration concept is strong but invisible at this scale — you can't resolve the flocking behavior, can't tell if it's triangular or organic, and the center number does all the work. Remove the number and the visualization communicates nothing.

### Design
A **270-degree SVG arc gauge** inspired by the Porsche 911 tachometer. The arc IS the data — its color zones tell you healthy/warm/redline, and a dot indicator shows exactly where you are.

### Geometry
- **SVG element**, `viewBox="0 0 {size} {size}"`, rendered at 56px (context) or 48px (budget)
- **Arc sweep:** 270 degrees. Starts at 135 degrees (7 o'clock), sweeps clockwise to 45 degrees (5 o'clock). 90-degree gap at the bottom center.
- **Arc radius:** `(size - 8) / 2` — same as current MurmurationRing, leaving room for the indicator dot
- **Arc stroke width:** 2px — thin enough to feel precise, thick enough to see the color zones
- **Three color zones on the arc:**
  - 0–70% of the arc: `var(--teal)` — healthy, plenty of headroom
  - 70–90% of the arc: `var(--gold)` — warming up, pay attention
  - 90–100% of the arc: `var(--coral)` — redline, danger

### Rendering
The arc is built from three SVG `<circle>` elements, each using `stroke-dasharray` and `stroke-dashoffset` to render its segment of the 270-degree arc.

**Inactive zones:** rendered at 12% opacity — visible as faint structural marks, like unlit gauge segments.

**Active zone:** the zone containing the current value renders at full opacity with a subtle glow: `filter: drop-shadow(0 0 2px {zoneColor})` at 30% alpha. Only ONE zone glows at a time.

### Indicator Dot
- A filled circle, radius 3px, positioned on the arc at the angle corresponding to `value`
- Color matches the zone it's in
- Animated with Framer Motion `motion.circle` using the standard spring: `{ type: 'spring', stiffness: 400, damping: 30, mass: 1 }`
- When the value changes, the dot swings to its new position with physical momentum — this is the key moment where the gauge feels alive

### Tick Marks
- 5 small tick marks at 0%, 25%, 50%, 75%, 100% positions along the arc
- Each tick: a 3px line extending outward from the arc, 0.5px wide, `var(--text-dim)` color
- No numbers on the ticks — position communicates enough

### Center Label
- Departure Mono, 7px, `var(--text-dim)`, letter-spacing 0.12em
- Shows metric name: `"CTX"` for context health, `"BURN"` for budget
- No percentage number — the dot position IS the data

### Props
```typescript
interface RadialGaugeProps {
  value: number;       // 0-100
  size?: number;       // diameter in px, default 56
  label?: string;      // center label text
}
```

### Behavior
- `prefers-reduced-motion`: dot jumps instantly to new position, no spring animation
- Values clamped to 0-100
- Arc segments, tick marks, and label are static SVG — only the indicator dot animates

### What Gets Removed
- `MurmurationRing` component — deleted entirely
- `streams` prop / multi-stream mode — removed (YAGNI, unused in MetricsRail)
- All canvas-based particle rendering for metrics — replaced by SVG
- `getParticleCount`, `blendHexColors` helper functions — deleted

### MetricsRail Changes
- Import `RadialGauge` instead of `MurmurationRing`
- Same usage: `<RadialGauge value={metrics.contextHealth} size={56} label="CTX" />`
- Budget: `<RadialGauge value={Math.min(100, Math.round((cost / 10) * 100))} size={48} label="BURN" />`

---

## 2. StatusOrb — Precision Instrument Indicators

### Problem
The orbital ring animations (scaling circles with opacity pulsing) feel organic and abstract. At 5-7px, they read as "something is happening" but don't carry the precision instrument feel of the gauge redesign.

### Design
Replace the CSS-animated border rings with **SVG arc indicators** — partial circles that rotate like radar sweeps or engine RPM indicators. Each status gets a distinct motion signature that reads as mechanical, not biological.

### Changes to StatusOrb

**Keep:**
- The core dot (filled circle, same colors)
- The `layoutId` / motion.span wrapper
- The container sizing (`size + 12`)

**Replace the ring system:**

Instead of CSS `border` + `animation` on `<span>` elements, render an SVG overlay with `<circle>` elements using `stroke-dasharray` to create partial arcs.

| Status | Arc | Motion | Feel |
|--------|-----|--------|------|
| `idle` | 90-degree arc segment, teal | Slow continuous rotation, 8s/revolution | Idling engine — ticking over |
| `writing` | Two 60-degree arcs, 180 degrees apart, gold | Counter-rotating at 1.2s/rev | Dual-spindle, working hard |
| `waiting` | 120-degree arc, steel | Oscillates ±30 degrees (pendulum), 2.4s | Tension — waiting for something |
| `executing` | Full 270-degree arc, ripple | Steady rotation at 1.5s/rev | Full power, all cylinders |
| `error` | 45-degree arc, coral | Rapid jitter ±5 degrees, 0.3s | Vibration — something's wrong |

**Implementation:** The existing `<span className="orb-ring">` elements are **replaced** by an inline `<svg>` element inside the container. The SVG contains `<circle>` elements using `stroke-dasharray` to create partial arcs, animated with CSS `@keyframes` for rotation/oscillation. The `transform-origin` is the center of the SVG. The existing orbital keyframes in `index.css` (`orbit-idle`, `orbit-write`, etc.) are replaced with new rotation keyframes. The `orb-ring` and `orb-glow` global classes are removed from `index.css` after migration.

**Glow:** The `executing` state keeps its existing glow effect (box-shadow on the container). Other states have no glow.

### Why This Works
- Each status has a unique **motion signature** — you can tell status by movement pattern alone, even in peripheral vision
- The partial arcs evoke instrument needles and radar sweeps, not biological organisms
- At 5-7px, a rotating arc segment is more legible than a pulsing full circle
- The visual language now matches the RadialGauge — arcs and rotations throughout

---

## 3. SpacetimeGrid — Instrument Overlay Lines

### Problem
The current grid is pure math — warped Cartesian lines that deform toward a gravity center. It's scientifically interesting but reads as "abstract art" rather than "instrument display." The gravitational metaphor is correct but the rendering doesn't feel like something you'd see on a cockpit heads-up display.

### Design
Refine the grid from freeform mesh warping to **structured instrument lines** — the kind of overlay you see on a HUD or engine diagnostic display. Keep the gravitational deformation (it's good data encoding) but add structure.

### Changes

**Add concentric reference rings:**
After drawing the Cartesian grid lines, draw 2-3 concentric circles centered on the warp point. These create a "radar scope" feel — structured rings overlaid on the deforming grid.

```typescript
// After existing grid drawing, before the edge fade:
const ringRadii = [0.15, 0.30, 0.50]; // as fraction of max dimension
for (const frac of ringRadii) {
  const r = Math.min(w, h) * frac;
  ctx.beginPath();
  ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(56, 168, 154, ${opacity * 0.6})`;
  ctx.lineWidth = 0.5;
  ctx.stroke();
}
```

**Add crosshair lines through the warp center:**
A horizontal and vertical line through the center point, at 50% of the grid opacity. Creates the instrument reticle feel.

```typescript
ctx.beginPath();
ctx.moveTo(centerX, 0);
ctx.lineTo(centerX, h);
ctx.moveTo(0, centerY);
ctx.lineTo(w, centerY);
ctx.strokeStyle = `rgba(56, 168, 154, ${opacity * 0.4})`;
ctx.lineWidth = 0.5;
ctx.stroke();
```

**Reduce Cartesian grid line count:**
Increase `cellSize` by 4px across all risk tiers so the Cartesian mesh is sparser, letting the concentric rings and crosshair read as the primary structure. The grid becomes texture, the rings become geometry.

Updated RISK_CONFIG:
```typescript
const RISK_CONFIG = {
  low:    { opacity: 0.025, cellSize: 32, warpStrength: 0 },
  medium: { opacity: 0.04,  cellSize: 30, warpStrength: 16 },
  high:   { opacity: 0.06,  cellSize: 26, warpStrength: 28 },
};
```

### What This Achieves
- The grid shifts from "math visualization" to "heads-up display overlay"
- Concentric rings + crosshair = immediate instrument association
- The gravitational deformation still warps the Cartesian lines, but now the rings provide stable reference geometry that makes the warping more visible by contrast
- Feels like looking at a radar scope or engine diagnostic display

---

## 4. EventTimeline — Dyno Strip Chart

### Problem
The timeline renders as simple colored bars of varying height. It communicates event type and risk tier, but it's visually flat — no sense of flow, no connection to the instrument aesthetic.

### Design
Evolve from flat bars to a **strip chart recorder** feel — the kind of continuous trace you see on an engine dynamometer or an ECG. Events become peaks on a continuous baseline.

### Changes

**Add a baseline wire:**
A thin horizontal line at the bottom of the timeline area (1px above the container bottom), `var(--text-dim)` at 30% opacity. This is the "paper" of the strip chart — the zero line.

**Connect events with a subtle path:**
Instead of isolated bars, draw a thin SVG `<path>` connecting the tops of adjacent event bars. This creates a skyline silhouette that reads as a continuous signal trace.

Implementation: The EventTimeline wraps its content in a `<div>` with `position: relative`. An absolutely positioned `<svg>` sits behind the bars, drawing a polyline through the bar tops.

```typescript
// Calculate path points from events
const points = events.map((event, i) => {
  const x = i * 5 + 1.5; // bar width (3px) + gap (2px), centered
  const y = 36 - TYPE_HEIGHTS[event.type]; // invert for SVG coords
  return `${x},${y}`;
});
const pathD = `M${points.join(' L')}`;
```

The path stroke: `var(--text-dim)` at 15% opacity, 0.5px width. Barely visible — it's structural, not decorative.

**Redline marker:**
A thin horizontal dashed line at the `denied` event height (24px from bottom = 12px from top of the 36px container). Renders only when there are denied events. `var(--coral)` at 10% opacity. This is the "redline" — the level where events became denials.

### What This Achieves
- The skyline path turns discrete events into a continuous signal — like reading an ECG or dyno trace
- The baseline wire grounds the visualization
- The redline marker adds the tachometer "don't cross this" feel
- Still renders the existing colored bars — the path is additive, not replacing

---

## Validation

After all four components are updated:

1. `npm run build` succeeds
2. Visual verification at `localhost:5199`:
   - RadialGauge: 270-degree arc with teal/gold/coral zones, dot indicator, "CTX" and "BURN" labels
   - StatusOrb: rotating arc segments instead of pulsing border rings, each status visually distinct
   - SpacetimeGrid: concentric rings + crosshair overlaid on warped grid
   - EventTimeline: skyline path connecting bar tops, baseline wire, optional redline marker
3. All spring physics constants unchanged (400/30/1)
4. `prefers-reduced-motion` respected in all components
5. No new dependencies added
6. Performance: no dropped frames (SVG elements are lightweight, canvas grid is unchanged)

## Success Criteria

The Command Center should feel like looking at a precision instrument panel — structured, purposeful, and readable at a glance. Every visualization should communicate its data through position and motion, not through numbers you have to parse. The aesthetic should evoke "cockpit" not "dashboard."
