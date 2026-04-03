# V1.5 Physics Layer + Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the V1.5 physics layer (murmuration particles, spacetime grid deformation, gravitational weight) and accessibility pass, transforming NotchOS from a functional prototype into a design-differentiated product.

**Architecture:** Four independent workstreams that touch different files. Task 1 replaces the SVG ring in MetricsRail with a canvas particle system. Task 2 adds a canvas overlay to CommandCenter for grid deformation. Task 3 adds risk-tier-driven layout density to ActiveSession. Task 4 adds ARIA roles, focus management, and reduced-motion support across all components.

**Tech Stack:** React 18, TypeScript, Canvas 2D API, CSS custom properties, Tauri 2

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/shared/MurmurationRing.tsx` | Create | Canvas particle toroidal field |
| `src/components/command-center/MetricsRail.tsx` | Modify | Replace SVG ToroidalRing with MurmurationRing |
| `src/components/command-center/SpacetimeGrid.tsx` | Create | Canvas overlay with gravitational deformation |
| `src/components/command-center/CommandCenter.css` | Modify | Remove static CSS grid, add canvas container |
| `src/components/command-center/CommandCenter.tsx` | Modify | Add SpacetimeGrid component |
| `src/components/command-center/ActiveSession.tsx` | Modify | Gravitational weight per risk tier |
| `src/components/shared/StatusOrb.tsx` | Modify | ARIA labels, reduced-motion |
| `src/components/command-center/TopBar.tsx` | Modify | ARIA, focus management |
| `src/components/command-center/AgentRoster.tsx` | Modify | ARIA roles, focus ring |
| `src/styles/index.css` | Modify | Focus ring styles, reduced-motion overrides |

---

### Task 1: Murmuration Canvas Particles

Replace the SVG stroke-dasharray ring with a canvas-based particle system. Particles (~1px motes) flock along a toroidal ring path. Density encodes the metric value. Color shifts teal→gold→coral at thresholds.

**Files:**
- Create: `src/components/shared/MurmurationRing.tsx`
- Modify: `src/components/command-center/MetricsRail.tsx`

**Design spec (from DESIGN.md):**
- Particle size: ~1px each
- Behavior: Flocking along orbital path with ±3px drift from ring center
- Density: 28% = ~25 sparse wisps. 62% = ~70 forming stream. 89% = ~140 dense swarm. 96% = ~260 near-solid ring
- Speed scales with density: sparse = slow drift, dense = fast stream
- Color: teal (healthy) → gold (warning ~70%) → coral (critical ~90%)
- Ring guide: 1px structural ring at ~6% opacity, always visible
- Canvas size: 48-56px diameter (matches current SVG)

- [ ] **Step 1: Create MurmurationRing component**

Create `src/components/shared/MurmurationRing.tsx`:

```tsx
import { useRef, useEffect } from 'react';

interface MurmurationRingProps {
  value: number;       // 0-100
  size?: number;       // canvas diameter, default 56
  label?: string;      // label below ring
}

interface Particle {
  angle: number;       // position on ring (radians)
  drift: number;       // offset from ring center (±3px)
  speed: number;       // angular velocity
  driftSpeed: number;  // drift oscillation speed
}

// Color thresholds: teal (<70) → gold (70-90) → coral (90+)
function getColor(value: number): string {
  if (value < 70) return '#38A89A';
  if (value < 90) return '#D4AE48';
  return '#E08870';
}

// Particle count scales with value
function getParticleCount(value: number): number {
  return Math.round((value / 100) * 280);
}

export function MurmurationRing({ value, size = 56, label }: MurmurationRingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const count = getParticleCount(value);
    // Initialize particles distributed around the ring
    particlesRef.current = Array.from({ length: count }, () => ({
      angle: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 6,
      speed: (0.002 + Math.random() * 0.004) * (1 + value / 100),
      driftSpeed: 0.01 + Math.random() * 0.02,
    }));
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = (size - 8) / 2;
    const color = getColor(value);

    function draw() {
      ctx!.clearRect(0, 0, size, size);

      // Guide ring — always visible at 6% opacity
      ctx!.beginPath();
      ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx!.strokeStyle = 'rgba(56, 168, 154, 0.06)';
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // Particles
      const particles = particlesRef.current;
      for (const p of particles) {
        p.angle += p.speed;
        p.drift += Math.sin(p.angle * 3) * 0.1;
        p.drift = Math.max(-3, Math.min(3, p.drift));

        const r = radius + p.drift;
        const x = cx + Math.cos(p.angle) * r;
        const y = cy + Math.sin(p.angle) * r;

        ctx!.beginPath();
        ctx!.arc(x, y, 0.6, 0, Math.PI * 2);
        ctx!.fillStyle = color;
        ctx!.globalAlpha = 0.5 + Math.random() * 0.3;
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // Center value text
      ctx!.font = '600 12px Sora, system-ui, sans-serif';
      ctx!.fillStyle = '#E0D8D0';
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'middle';
      ctx!.fillText(`${value}%`, cx, cy);

      rafRef.current = requestAnimationFrame(draw);
    }

    // Respect reduced motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      // Static render — just draw once
      draw();
      cancelAnimationFrame(rafRef.current);
    } else {
      draw();
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, size]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${label ?? 'Metric'}: ${value}%`}
      />
      {label && (
        <span style={{
          fontFamily: 'var(--font-label)',
          fontSize: 7,
          color: 'var(--text-dim)',
          letterSpacing: '0.12em',
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace SVG in MetricsRail**

In `src/components/command-center/MetricsRail.tsx`:
- Remove the `ToroidalRing` function component entirely
- Import `MurmurationRing` from `../shared/MurmurationRing`
- Replace `<ToroidalRing value={metrics.contextHealth} size={48} label="CONTEXT" />` with `<MurmurationRing value={metrics.contextHealth} size={56} label="CONTEXT" />`

- [ ] **Step 3: Verify visually and commit**

Run: `npx tsc --noEmit && npx vite build`
Open http://localhost:5199, navigate to Command Center, confirm particles animate.

```bash
git add src/components/shared/MurmurationRing.tsx src/components/command-center/MetricsRail.tsx
git commit -m "feat: murmuration canvas particles for context health ring"
```

---

### Task 2: Spacetime Grid Canvas with Deformation

Replace the static CSS grid background with a canvas that deforms grid lines toward the active agent zone, like a gravitational field warping spacetime.

**Files:**
- Create: `src/components/command-center/SpacetimeGrid.tsx`
- Modify: `src/components/command-center/CommandCenter.css` (remove `::before` pseudo-element)
- Modify: `src/components/command-center/CommandCenter.tsx` (add SpacetimeGrid)

**Design spec:**
- Grid cell size: 28px default
- Color: teal at very low alpha (~1.5%)
- Deformation: Lines warp toward active agent zone. Warp intensity scales with risk tier.
- Risk scaling: Low = 1% opacity, 28px cells. Medium = 1.8%, 28px. High = 3.5%, 22px (tighter).
- Implementation: Canvas at 60fps, mouse/agent-follow warp

- [ ] **Step 1: Create SpacetimeGrid component**

Create `src/components/command-center/SpacetimeGrid.tsx`:

```tsx
import { useRef, useEffect } from 'react';
import type { RiskTier } from '../../types';

interface SpacetimeGridProps {
  riskTier: RiskTier;
  /** Normalized warp center (0-1 range for x and y within the grid area) */
  warpX?: number;
  warpY?: number;
}

const RISK_CONFIG: Record<RiskTier, { opacity: number; cellSize: number; warpStrength: number }> = {
  low:    { opacity: 0.010, cellSize: 28, warpStrength: 0 },
  medium: { opacity: 0.018, cellSize: 28, warpStrength: 12 },
  high:   { opacity: 0.035, cellSize: 22, warpStrength: 24 },
};

export function SpacetimeGrid({ riskTier, warpX = 0.5, warpY = 0.4 }: SpacetimeGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { opacity, cellSize, warpStrength } = RISK_CONFIG[riskTier];

    function draw() {
      const w = canvas!.width / dpr;
      const h = canvas!.height / dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);

      const centerX = warpX * w;
      const centerY = warpY * h;

      ctx!.strokeStyle = `rgba(56, 168, 154, ${opacity})`;
      ctx!.lineWidth = 0.5;

      // Horizontal lines
      for (let y = 0; y < h; y += cellSize) {
        ctx!.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pull = warpStrength / (dist + 80);
          const warpedY = y + (centerY - y) * pull;
          if (x === 0) ctx!.moveTo(x, warpedY);
          else ctx!.lineTo(x, warpedY);
        }
        ctx!.stroke();
      }

      // Vertical lines
      for (let x = 0; x < w; x += cellSize) {
        ctx!.beginPath();
        for (let y = 0; y <= h; y += 4) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pull = warpStrength / (dist + 80);
          const warpedX = x + (centerX - x) * pull;
          if (y === 0) ctx!.moveTo(warpedX, y);
          else ctx!.lineTo(warpedX, y);
        }
        ctx!.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      draw();
      cancelAnimationFrame(rafRef.current);
    } else {
      draw();
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [riskTier, warpX, warpY]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        borderRadius: 'inherit',
      }}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 2: Remove CSS grid, wire up SpacetimeGrid**

In `src/components/command-center/CommandCenter.css`, remove the entire `::before` block.

In `src/components/command-center/CommandCenter.tsx`:
- Import `SpacetimeGrid`
- Pass the selected agent's risk tier (default 'low')
- Add `<SpacetimeGrid riskTier={selectedAgent?.pendingApproval?.riskTier ?? 'low'} />` as first child of `.command-center`

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npx vite build
git add src/components/command-center/SpacetimeGrid.tsx src/components/command-center/CommandCenter.css src/components/command-center/CommandCenter.tsx
git commit -m "feat: spacetime grid canvas with gravitational deformation"
```

---

### Task 3: Gravitational Weight System

Risk tier controls the physical density of the approval surface. Low-risk items compress (small text, tight padding, translucent). High-risk items expand (more padding, larger text, full diff, coral accent border, impact summary). You feel the weight of a decision before you read the label.

**Files:**
- Modify: `src/components/command-center/ActiveSession.tsx`
- Modify: `src/mock-data.ts` (add a high-risk agent for testing)

**Design spec:**
| Tier | Padding | Font scale | Diff surface | Border accent |
|------|---------|-----------|-------------|---------------|
| Low | 6-8px | 8px text | 1-line inline | none |
| Medium | 8-10px | 9px text | compact diff | --gold 0.5px |
| High | 12px | 9-10px | full diff + impact summary | --coral 0.5px |

- [ ] **Step 1: Expand ActiveSession risk-tier styling**

In `src/components/command-center/ActiveSession.tsx`, replace the existing `RISK_PADDING` constant and button/diff styling to create three distinct visual densities:

- **Low risk**: Container has 0.5px transparent border, diff block is inline (max 3 lines), buttons are smaller (8px font), keyboard hints hidden
- **Medium risk** (current): Keep as-is, add 0.5px `--gold` left border accent on the container
- **High risk**: Container gets 0.5px `--coral` left border accent, diff block is full height (no maxHeight cap), add a prominent impact summary line above diff, buttons are larger (11px font) with keyboard hints prominent, add a subtle `--coral-dim` background tint on the entire center bay

- [ ] **Step 2: Add high-risk mock agent**

In `src/mock-data.ts`, add a 4th agent with a high-risk pending approval:

```typescript
{
  id: 'cx-2',
  name: 'Codex (prod)',
  abbreviation: 'CP',
  model: 'o3',
  status: 'writing',
  cost: 3.21,
  elapsedSeconds: 180,
  currentTool: 'Bash',
  pendingApproval: {
    approvalId: 'apr-2',
    toolName: 'Bash',
    toolInput: { command: 'rm -rf /var/data/cache && systemctl restart api' },
    summary: 'Destructive cache purge + service restart on production',
    riskTier: 'high',
    filePath: 'production',
    impactFiles: 0,
    impactDeps: 12,
    diff: [
      { type: 'context', content: '$ rm -rf /var/data/cache && systemctl restart api', lineNumber: 1 },
    ],
  },
}
```

- [ ] **Step 3: Verify all three tiers visually and commit**

Navigate to each agent in CC: Claude (low/no approval), Codex (medium), Codex prod (high). Confirm visual weight increases.

```bash
git add src/components/command-center/ActiveSession.tsx src/mock-data.ts
git commit -m "feat: gravitational weight system — risk tier controls layout density"
```

---

### Task 4: Accessibility Pass

ARIA labels, focus rings, keyboard focus management, reduced-motion support.

**Files:**
- Modify: `src/styles/index.css`
- Modify: `src/components/shared/StatusOrb.tsx`
- Modify: `src/components/command-center/TopBar.tsx`
- Modify: `src/components/command-center/AgentRoster.tsx`
- Modify: `src/components/command-center/ActiveSession.tsx`
- Modify: `src/components/ExpandedPill.tsx`

- [ ] **Step 1: Add focus ring styles to index.css**

Append to `src/styles/index.css`:

```css
/* Focus ring — teal outline, visible only on keyboard navigation */
:focus-visible {
  outline: 1.5px solid var(--teal);
  outline-offset: 2px;
  border-radius: var(--radius-button);
}

/* Remove default focus ring for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}

/* Reduced motion — disable ALL inline animations via class */
@media (prefers-reduced-motion: reduce) {
  .orb-ring { animation: none !important; }
  .orb-glow { animation: none !important; display: none; }
}
```

- [ ] **Step 2: Add ARIA to StatusOrb**

In `StatusOrb.tsx`:
- Add `role="img"` and `aria-label` prop to the outer span
- Add `className="orb-ring"` to ring spans and `className="orb-glow"` to glow span for reduced-motion targeting

- [ ] **Step 3: Add ARIA to TopBar, AgentRoster, ActiveSession**

- `TopBar.tsx`: Add `role="toolbar"` to the mini-pill container, `aria-pressed` to selected pill, `aria-label="Agent selector"` to container
- `AgentRoster.tsx`: Add `role="listbox"` to the agent list, `role="option"` and `aria-selected` to each agent button
- `ActiveSession.tsx`: Add `aria-live="polite"` to the approval region so screen readers announce new approvals
- `ExpandedPill.tsx`: Add `role="menu"` to agent list, `role="menuitem"` to each row

- [ ] **Step 4: Verify and commit**

Tab through the Command Center — all buttons should show teal focus rings. Test with `prefers-reduced-motion: reduce` in DevTools.

```bash
git add src/styles/index.css src/components/shared/StatusOrb.tsx src/components/command-center/TopBar.tsx src/components/command-center/AgentRoster.tsx src/components/command-center/ActiveSession.tsx src/components/ExpandedPill.tsx
git commit -m "feat: accessibility — ARIA roles, focus rings, reduced-motion"
```
