# NotchOS Visual Upgrade Spec
## Feed this to Claude Code with the codebase. Execute in phase order.

> **Context:** NotchOS is a Tauri 2 macOS desktop app (React 18 + Vite + Framer Motion) that monitors AI coding agents from a floating notch interface. The design system ("Deep Field") is well-specified in DESIGN.md but the implementation lags behind the spec. This upgrade closes that gap and adds competitive polish.
>
> **Philosophy:** Physics encodes information. Animation is data, not decoration. Every visual change must carry meaning. If it doesn't communicate state, remove it.
>
> **Constraint:** Keep the app lightweight. No new heavy dependencies. Tauri webview performance is the ceiling — respect it.

---

## Phase 1: CSS Architecture Migration (Foundation — Do This First)

### Problem
Every component uses inline `style={{}}` objects. This blocks hover states, pseudo-elements, transitions, media queries, and makes the design system unenforceable. Components manually toggle styles via onMouseEnter/onMouseLeave handlers.

### Deliverable
Migrate all components from inline styles to CSS Modules (`.module.css` files co-located with each component). Preserve every existing visual exactly — this is a refactor, not a redesign.

### Rules
- One `.module.css` file per component (e.g., `NotchBar.module.css`, `ExpandedPill.module.css`)
- All color values MUST reference CSS custom properties from `src/styles/index.css` — no hardcoded hex in component CSS
- All spacing values MUST use `var(--sp-N)` tokens
- All font stacks MUST use `var(--font-ui)`, `var(--font-data)`, or `var(--font-label)`
- All border-radius MUST use `var(--radius-*)` tokens
- Replace ALL `onMouseEnter`/`onMouseLeave` style manipulation with CSS `:hover` selectors
- Replace ALL `onMouseDown`/`onMouseUp` scale transforms with CSS `:active` selectors
- Preserve `data-tauri-drag-region` on TopBar
- Keep `prefers-reduced-motion` media query in global CSS
- Import pattern: `import styles from './ComponentName.module.css'`

### Component Migration Order
1. `src/components/shared/StatusOrb.tsx` — simplest, validates the pattern
2. `src/components/shared/ZoneLabel.tsx`
3. `src/components/shared/ClickablePath.tsx`
4. `src/components/shared/MurmurationRing.tsx` — canvas component, minimal CSS
5. `src/components/NotchBar.tsx`
6. `src/components/ExpandedPill.tsx` (including AgentRow sub-component)
7. `src/components/AgentPill.tsx`
8. `src/components/command-center/TopBar.tsx`
9. `src/components/command-center/AgentRoster.tsx`
10. `src/components/command-center/ActiveSession.tsx`
11. `src/components/command-center/MetricsRail.tsx`
12. `src/components/command-center/EventTimeline.tsx`
13. `src/components/command-center/SpacetimeGrid.tsx`
14. `src/components/command-center/HistoryView.tsx`
15. `src/components/command-center/QuestionPanel.tsx`
16. `src/components/command-center/PlanReview.tsx`
17. `src/components/Onboarding.tsx`
18. `src/components/SessionDetail.tsx`
19. `src/components/ApprovalPanel.tsx`
20. `src/components/command-center/CommandCenter.tsx` — already has CommandCenter.css, convert to module

### Validation
- `npm run build` succeeds with zero errors
- `npx vite dev --port 5199` renders identically to current state in browser
- Every component uses CSS modules, zero inline `style={{}}` objects remain (exception: dynamic values that genuinely need runtime calculation — canvas dimensions, calculated positions from props like `size`, `value`, etc.)
- Hover states work via CSS, not JS event handlers
- All design tokens properly referenced

### Example Migration (StatusOrb)

**Before (inline):**
```tsx
<span style={{ width: size, height: size, borderRadius: '50%', background: color }} />
```

**After (CSS module):**
```css
/* StatusOrb.module.css */
.core {
  border-radius: 50%;
  position: relative;
  z-index: 1;
}
```
```tsx
<span className={styles.core} style={{ width: size, height: size, background: color }} />
```

Note: `size` and `color` are runtime props — they stay as inline style. Static layout properties move to CSS module.

---

## Phase 2: Glass & Vibrancy (The Premium Feel)

### Problem
The Command Center uses `backdrop-filter: saturate(120%) blur(16px)` with `rgba(19, 22, 28, 0.88)` — nearly opaque. This creates a pseudo-glass effect that's neither convincingly transparent nor cleanly solid. The NotchBar uses flat `#000000`.

### Deliverable
Proper layered transparency across all three modes with distinct glass treatments.

### NotchBar Glass
```css
.notch-bar {
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: saturate(150%) blur(20px);
  -webkit-backdrop-filter: saturate(150%) blur(20px);
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
  /* Subtle inner border for depth */
  box-shadow: inset 0 -0.5px 0 rgba(255, 255, 255, 0.04);
}
```

### Expanded Pill Glass
```css
.pill {
  background: rgba(19, 22, 28, 0.78);
  backdrop-filter: saturate(130%) blur(24px);
  -webkit-backdrop-filter: saturate(130%) blur(24px);
  border: 0.5px solid rgba(74, 80, 96, 0.5);
  border-radius: var(--radius-window);
  /* Top edge light catch */
  box-shadow:
    inset 0 0.5px 0 rgba(255, 255, 255, 0.03),
    0 8px 32px rgba(0, 0, 0, 0.4);
}
```

### Command Center Glass
```css
.command-center {
  background: rgba(19, 22, 28, 0.75);
  backdrop-filter: saturate(140%) blur(28px);
  -webkit-backdrop-filter: saturate(140%) blur(28px);
  border: 0.5px solid rgba(74, 80, 96, 0.4);
  border-radius: var(--radius-window);
  box-shadow:
    inset 0 0.5px 0 rgba(255, 255, 255, 0.03),
    0 12px 48px rgba(0, 0, 0, 0.5);
}
```

### Key Principles
- **Opacity decreases as mode expands:** Notch 0.85 → Pill 0.78 → CC 0.75. Larger surfaces need more transparency to avoid feeling heavy.
- **Blur increases as mode expands:** 20px → 24px → 28px. More content behind = more blur needed for legibility.
- **Saturation boost:** 130-150% makes colors behind the glass richer, not washed out.
- **Inner box-shadow:** `inset 0 0.5px 0 rgba(255,255,255,0.03-0.04)` creates a subtle light-catch on the top edge. This is the difference between "transparent div" and "glass panel."
- **Drop shadow only on larger modes:** NotchBar gets no drop shadow (it's attached to the notch). Pill and CC get shadows that increase with size.
- **No blur on internal panels.** Only the outermost shell gets backdrop-filter. Internal zones (AgentRoster, MetricsRail, ActiveSession) use solid `var(--bg-surface)` or transparent backgrounds. Nested blur tanks performance.

### Interior Zone Treatment
The Command Center interior zones should NOT have their own glass — they sit inside the glass shell:
```css
.agent-roster {
  background: rgba(26, 30, 38, 0.4);  /* Semi-transparent surface, not opaque */
  border-right: 0.5px solid rgba(74, 80, 96, 0.25);
}

.metrics-rail {
  background: rgba(26, 30, 38, 0.3);
  border-left: 0.5px solid rgba(74, 80, 96, 0.25);
}

.event-timeline {
  background: rgba(19, 22, 28, 0.5);
  border-top: 0.5px solid rgba(74, 80, 96, 0.2);
}
```

### Validation
- All three modes should show desktop content bleeding through slightly
- Text remains fully legible at all opacity levels
- No nested backdrop-filter (only on `.command-center`, `.pill`, `.notch-bar`)
- Performance: no dropped frames during mode transitions
- `npx vite dev` in browser shows the glass effect against the page background

---

## Phase 3: Shared Element Transitions (The Magic)

### Problem
Mode transitions use `AnimatePresence` with `mode="wait"` — content fades out, shell resizes, new content fades in. This feels like a page swap, not a morphing interface. The spring physics on the shell are good but wasted when the interior just crossfades.

### Deliverable
Agent orbs and key elements animate between their positions across mode transitions using Framer Motion `layoutId`.

> **Implementation risk:** `layoutId` across `AnimatePresence` boundaries is the riskiest part of this spec. Framer Motion 12's behavior for `layoutId` + `mode="popLayout"` has edge cases around conditionally-rendered trees. **Before implementing, pull current Framer Motion 12 docs via Context7 MCP** to verify the interaction between `layoutId`, `AnimatePresence mode`, and `layout` prop. The mode transition shell lives in `App.tsx` (the `AnimatePresence` with `mode="wait"` wrapping the three view modes).

### Implementation

**StatusOrb shared identity:** Every StatusOrb rendered for an agent gets a `layoutId` tied to the agent's ID:

```tsx
// In StatusOrb.tsx — add layoutId prop
interface StatusOrbProps {
  status: AgentStatus;
  size?: number;
  layoutId?: string;  // NEW: for cross-mode animation
}

export function StatusOrb({ status, size = 5, layoutId }: StatusOrbProps) {
  const Wrapper = layoutId ? motion.span : 'span';
  const wrapperProps = layoutId ? { layoutId, layout: true } : {};

  return (
    <Wrapper {...wrapperProps} /* ... existing props */ >
      {/* existing orb content */}
    </Wrapper>
  );
}
```

**NotchBar orbs → Pill orbs → Command Center roster orbs:**

```tsx
// NotchBar.tsx
{agents.slice(0, 5).map(agent => (
  <StatusOrb
    key={agent.id}
    status={agent.status}
    size={7}
    layoutId={`orb-${agent.id}`}  // Shared identity
  />
))}

// ExpandedPill.tsx → AgentRow
<StatusOrb status={agent.status} size={5} layoutId={`orb-${agent.id}`} />

// AgentRoster.tsx
<StatusOrb status={agent.status} size={5} layoutId={`orb-${agent.id}`} />
```

**Agent name shared identity:**
```tsx
// ExpandedPill AgentRow — agent name
<motion.span layoutId={`name-${agent.id}`} /* ...styles */>
  {agent.name}
</motion.span>

// AgentRoster row — agent name
<motion.span layoutId={`name-${agent.id}`} /* ...styles */>
  {agent.name}
</motion.span>
```

**Cost shared identity:**
```tsx
// ExpandedPill AgentRow — cost
<motion.span layoutId={`cost-${agent.id}`} /* ...styles */>
  ${agent.cost.toFixed(2)}
</motion.span>

// TopBar — total session cost
<motion.span layoutId="session-cost" /* ...styles */>
  {formatCost(metrics.totalCost)}
</motion.span>
```

### AnimatePresence Changes

**Key file:** `src/App.tsx` — this is where the mode transition shell lives. The `AnimatePresence` (currently with `mode="wait"`) wraps the three view modes (notch, pill, command-center) with conditional rendering. The morphing container uses `layout` on a `motion.div` with the spring config `{ type: 'spring', stiffness: 400, damping: 30, mass: 1 }`.

Replace `mode="wait"` (which forces exit before enter) with `mode="popLayout"` or remove the mode entirely to allow overlapping transitions:

```tsx
// App.tsx — change AnimatePresence
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
  {/* ... pill, command-center similarly */}
</AnimatePresence>
```

### Spring Config for Layout Animations
```tsx
// Shared spring for layoutId transitions — match the shell spring
const LAYOUT_SPRING = { type: 'spring', stiffness: 400, damping: 30, mass: 1 };

// Apply to StatusOrb wrapper
<motion.span layoutId={...} transition={LAYOUT_SPRING}>
```

### What Should Animate Between Modes
| Element | Notch → Pill | Pill → CC | CC → Pill | Pill → Notch |
|---------|-------------|-----------|-----------|--------------|
| Agent orbs | 7px dots → 5px row orbs | Row orbs → roster orbs | Roster → row | Row → 7px dots |
| Agent names | (not shown) → appear | Row → roster | Roster → row | Fade out |
| Cost per agent | (not shown) → appear | Row → (absorbed into TopBar) | TopBar → row | Fade out |
| Total cost | Notch cost → pill footer | Pill footer → TopBar | TopBar → footer | Footer → notch |
| NP mark | Notch NP → Pill (hidden) → CC TopBar NP | Same layoutId chain | Reverse | Reverse |

### What Should NOT Animate
- SpacetimeGrid (background layer, independent)
- MurmurationRings (metrics rail only, no cross-mode equivalent)
- EventTimeline (CC only)
- Diff/approval content (CC only)

### Validation
- Expanding notch → pill: orbs visibly travel from center-clustered to left-aligned row positions
- Expanding pill → command center: agent rows flow into left rail, cost slides to top bar
- Collapsing reverses smoothly
- No layout jank, no overlapping text during transition
- Performance: transitions feel smooth at 60fps, no stutter
- Keyboard shortcuts (Esc, ⌘⇧N) trigger clean transitions

---

## Phase 4: NotchBar Presence (Making the Notch Matter)

### Problem
The notch bar is a passive display — black rectangle, tiny dots, small text. No urgency signals, no interactivity, no visual hook that says "this is worth hovering over."

### Deliverable
A notch bar with ambient urgency, micro-interaction, and visual presence.

### 4a. Pending Approval Ambient Pulse
When any agent has a pending approval, the notch should subtly communicate urgency without being obnoxious:

```css
.notch-bar--has-pending {
  /* Subtle gold border pulse — 4s cycle, barely perceptible */
  animation: notch-pending 4s ease-in-out infinite;
}

@keyframes notch-pending {
  0%, 100% { box-shadow: inset 0 -0.5px 0 rgba(212, 174, 72, 0.0); }
  50% { box-shadow: inset 0 -0.5px 0 rgba(212, 174, 72, 0.15); }
}

.notch-bar--has-high-risk {
  /* Coral pulse for high-risk — slightly more visible */
  animation: notch-danger 2.5s ease-in-out infinite;
}

@keyframes notch-danger {
  0%, 100% { box-shadow: inset 0 -0.5px 0 rgba(224, 136, 112, 0.0); }
  50% { box-shadow: inset 0 -0.5px 0 rgba(224, 136, 112, 0.2); }
}
```

Pass `hasPending` and `hasHighRisk` as props to NotchBar. Apply the appropriate class.

### 4b. Orb Click → Jump to Terminal
In the ExpandedPill (not the notch — too small), make each agent row's status orb independently clickable to jump to terminal:

```tsx
// ExpandedPill → AgentRow — wrap orb in a clickable area
<button
  className={styles.orbButton}
  onClick={(e) => {
    e.stopPropagation();  // Don't trigger row click (expand to CC)
    onJumpToTerminal?.(agent.id);
  }}
  aria-label={`Jump to ${agent.name} terminal`}
>
  <StatusOrb status={agent.status} size={5} layoutId={`orb-${agent.id}`} />
</button>
```

Add `onJumpToTerminal` prop to ExpandedPill, wire it through App.tsx.

### 4c. Activity Indicator in Notch
When agents are actively writing/executing, add a subtle activity bar under the orbs:

```css
.activity-bar {
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
```

Only render when `agents.some(a => a.status === 'writing' || a.status === 'executing')`.

### Validation
- Pending approval: notch has barely-visible gold glow cycling at 4s
- High-risk pending: coral glow, 2.5s cycle, slightly stronger
- No pending: clean black, no animation
- Activity bar appears only during active agent work
- ExpandedPill orb click jumps to terminal (verify Tauri invoke fires)

---

## Phase 5: Visual Hierarchy & Contrast (Making Things Pop)

### Problem
The Command Center zones all have similar visual weight. Nothing demands attention. The approval surface for a high-risk action should feel dramatically different from a low-risk auto-approve, but currently the difference is just border color and font size.

### Deliverable
Risk-responsive visual treatment that makes high-risk approvals physically dominate the interface.

### 5a. High-Risk Approval Treatment
When a high-risk approval is active, the center bay should command attention:

```css
.active-session--high-risk {
  /* Coral accent glow on left border — 2px instead of 0.5px */
  border-left: 2px solid var(--coral);
  /* Subtle coral background wash */
  background: linear-gradient(
    135deg,
    rgba(224, 136, 112, 0.04) 0%,
    transparent 60%
  );
}

.active-session--high-risk .approve-button {
  /* Larger, more prominent */
  padding: 6px 16px;
  font-size: 11px;
  font-weight: 600;
}

.active-session--high-risk .deny-button {
  padding: 6px 16px;
  font-size: 11px;
  font-weight: 600;
}
```

### 5b. Low-Risk Auto-Approve Treatment
Low-risk items should feel lightweight and fast — almost invisible:

```css
.active-session--low-risk {
  /* No left border, minimal presence */
  border-left: none;
  opacity: 0.85;
}

.active-session--low-risk .diff-block {
  max-height: 48px;
  overflow: hidden;
  /* Fade-out at bottom */
  mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
}
```

### 5c. Approve/Deny Button Enhancement
Buttons should feel consequential, not flat:

```css
.approve-button {
  color: rgba(56, 168, 154, 0.85);
  background: rgba(56, 168, 154, 0.08);
  border: 0.5px solid rgba(56, 168, 154, 0.20);
  border-radius: var(--radius-button);
  cursor: pointer;
  transition: all 120ms ease-out;
}

.approve-button:hover {
  background: rgba(56, 168, 154, 0.14);
  border-color: rgba(56, 168, 154, 0.35);
  transform: translateY(-0.5px);
}

.approve-button:active {
  transform: scale(0.97) translateY(0);
  transition-duration: 50ms;
}

.deny-button {
  color: rgba(224, 136, 112, 0.70);
  background: rgba(224, 136, 112, 0.05);
  border: 0.5px solid rgba(224, 136, 112, 0.12);
  border-radius: var(--radius-button);
  cursor: pointer;
  transition: all 120ms ease-out;
}

.deny-button:hover {
  background: rgba(224, 136, 112, 0.10);
  border-color: rgba(224, 136, 112, 0.25);
  transform: translateY(-0.5px);
}

.deny-button:active {
  transform: scale(0.97) translateY(0);
  transition-duration: 50ms;
}
```

### 5d. TopBar Separator Dots
Replace the `·` character separators in TopBar and ExpandedPill with styled CSS dots:

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

This is a minor detail but it makes the data read cleaner than the text-rendered interpunct.

### Validation
- High-risk approval visually dominates the center bay (coral glow, large buttons)
- Low-risk feels compressed and fast
- Medium-risk is the middle ground (gold left border, standard buttons)
- Buttons have smooth hover lift and active press
- No layout shifts on hover/active states

---

## Phase 6: SpacetimeGrid Polish (Ship It or Strip It)

### Problem
The SpacetimeGrid canvas already implements gravitational deformation — it warps grid lines toward a center point based on risk tier. But at 1% opacity for low-risk, it's invisible. At 3.5% for high-risk, it's barely visible. The deformation math is good but the visual impact is negligible.

### Deliverable
Make the grid visible enough to register subconsciously without becoming distracting.

### Changes

**Increase base opacities:**
```typescript
const RISK_CONFIG: Record<RiskTier, { opacity: number; cellSize: number; warpStrength: number }> = {
  low:    { opacity: 0.025, cellSize: 28, warpStrength: 0 },    // was 0.010
  medium: { opacity: 0.04,  cellSize: 26, warpStrength: 16 },   // was 0.018, 28, 12
  high:   { opacity: 0.06,  cellSize: 22, warpStrength: 28 },   // was 0.035, 22, 24
};
```

**Add gradient fade at edges** so the grid doesn't hard-clip at the window border. Use `destination-in` with a radial gradient defining where the grid remains visible:
```typescript
// After drawing all grid lines:
ctx.globalCompositeOperation = 'destination-in';
const gradient = ctx.createRadialGradient(
  centerX, centerY, 0,
  centerX, centerY, Math.max(w, h) * 0.6
);
gradient.addColorStop(0, 'rgba(0,0,0,1)');    // fully visible at center
gradient.addColorStop(0.7, 'rgba(0,0,0,0.5)');
gradient.addColorStop(1, 'rgba(0,0,0,0)');    // fade to invisible at edges
ctx.fillRect(0, 0, w, h);
ctx.globalCompositeOperation = 'source-over';
```

This makes the grid concentrate around the warp center and fade at the periphery — reinforcing the "gravitational field" metaphor.

### Validation
- Low-risk: faint grid visible, no warp, subtle background texture
- Medium-risk: grid visibly warps toward center, gold-ish tint would be nice but not required
- High-risk: grid clearly warps, tighter cells, higher opacity
- Grid fades at edges, doesn't hard-clip
- Performance: no dropped frames (this is a simple canvas draw)

---

## Phase 7: First Impression & Onboarding (The Moment)

### Problem
When NotchOS launches and discovers agents for the first time, it should feel like something is coming alive. Currently, agents just appear in the list.

### Deliverable
Staggered agent discovery animation and a polished empty state.

### Agent Discovery Animation
When an agent is first detected (transitions from 0 agents to 1+), stagger the orb appearances:

```tsx
// In ExpandedPill — wrap each AgentRow in motion.div with staggered delay
{agents.map((agent, i) => (
  <motion.div
    key={agent.id}
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{
      delay: i * 0.08,  // 80ms stagger per agent
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],  // match --ease-out
    }}
  >
    <AgentRow agent={agent} onClick={() => onSelectAgent(agent.id)} />
  </motion.div>
))}
```

### Empty State (No Agents)
When no agents are detected, show a calm waiting state instead of "No agents":

```tsx
// NotchBar empty state
<span className={styles.emptyLabel}>
  listening
</span>
```

```css
.empty-label {
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

### Validation
- Launch with no agents: notch shows "listening" with subtle breathing animation
- First agent detected: orb appears with slide-in, not a pop
- Multiple agents detected: staggered appearance (80ms between each)
- Feels alive and intentional, not like a loading state

---

## Phase 8: Sound Polish (Optional but Differentiating)

### Problem
The SoundEngine already has 6 procedural sounds (`agentStarted`, `toolComplete`, `approvalRequested`, `highRiskApproval`, `agentFinished`, `error`), is imported in TopBar, and has a working mute toggle. However, the sound triggers may not all be wired to the correct UI actions, and an "agent discovered" click is missing.

### Deliverable
Audit existing sound wiring, fill gaps, and add the agent-discovered click. Keep everything extremely subtle — this is a utility, not a game.

### Sound Design
Existing sounds to **verify wiring** (already defined in `src/audio/defaultSounds.ts`):
- **`approvalRequested`** → should fire on approve action
- **`highRiskApproval`** → should fire when high-risk pending arrives
- **`error`** → should fire on deny action

New sound to **add**:
- **Agent discovered:** Subtle click (white noise burst, 30ms, 5% volume). Almost subliminal.

### Implementation
Verify these triggers exist and fire correctly — add any that are missing:
- `handleApprove` callback in App.tsx → `approvalRequested` sound
- `handleDeny` callback in App.tsx → `error` sound
- Agent count change detection (new agent = discovery click) → new sound
- High-risk pending detection in the `useEffect` that auto-expands → `highRiskApproval` sound

### Rules
- All sounds respect the existing mute toggle in TopBar
- All sounds are procedurally generated (no audio files)
- Volume levels are conservative — these should be barely-there, not notification sounds
- `prefers-reduced-motion` should also suppress sounds (motion and sound are linked for accessibility)

### Validation
- Approve action plays clean ascending tone
- Deny plays descending tone
- High-risk arrival plays soft low tone
- Mute button silences everything
- Sounds feel integrated, not bolted on
- Nobody in a quiet office should be startled by these

---

## Execution Notes

### Order Matters
Phases 1-2 are foundational. Do NOT skip to Phase 3+ without completing both. The CSS module migration enables everything else, and the glass treatment defines the visual baseline.

### Testing Each Phase
After each phase, run:
```bash
npm run build          # Must succeed
npx vite dev --port 5199  # Visual verification in browser
```

For Tauri-specific features (glass/vibrancy, terminal jumping):
```bash
npx tauri dev          # Full app with Rust backend
```

### What NOT to Change
- **Design tokens in index.css** — these are canonical. Add new tokens if needed but don't modify existing ones without documenting why.
- **Spring physics constants** — `stiffness: 400, damping: 30, mass: 1` are tuned. Don't touch.
- **Font selections** — Sora/B612 Mono/Departure Mono are the identity. No substitutions.
- **The three-mode architecture** — Notch → Pill → Command Center is correct. Don't add modes.
- **Canvas rendering approach** — MurmurationRing and SpacetimeGrid use canvas deliberately for performance. Don't convert to DOM/SVG.
- **Keyboard shortcuts** — ⌘Y, ⌘N, ⌘⇧N, ⌘], ⌘[, ⌘H, Esc are locked.

### New Tokens to Add (in index.css)
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

---

## Success Criteria

When all phases are complete, NotchOS should:
1. **Feel native** — glass panels look like they belong on macOS, not like a web app
2. **Feel alive** — orbs animate meaningfully, grid responds to risk, sounds acknowledge actions
3. **Feel magical** — mode transitions morph elements between positions, not just crossfade
4. **Feel consequential** — high-risk approvals command physical space and visual attention
5. **Feel fast** — all transitions complete in <250ms, no dropped frames, no layout jank
6. **Stay lightweight** — no new heavy dependencies, total bundle stays manageable

The competition is Raycast, Warp, and Apple's Dynamic Island. That's the bar.
