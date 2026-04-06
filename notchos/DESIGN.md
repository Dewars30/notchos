# DESIGN.md — NotchOS Design Specification
## Version 1.0 · April 2026

> Canonical design reference for NotchOS — a macOS desktop app (Tauri 2) that monitors and controls AI coding agents from a single floating interface. This document serves as both the **Stitch prompt foundation** (import as DESIGN.md) and the **Claude Code build reference**.

---

## Identity

**Name:** NotchOS
**Tagline:** Air traffic control for your AI agents.
**Mood:** The feeling of walking into a staffed control room where every screen is green. Calm authority. Competence. Relief.
**Design language:** "Deep Field" — named for the Hubble/JWST deep field images. Cool darkness with warm light. Mathematical fabric, not void. Physics-based information architecture.

**What it is NOT:**
- Not a hacker terminal (no void blacks, no neon, no ASCII art)
- Not a gaming HUD (no glow, no gradients, no blur)
- Not iOS glassmorphism
- Not a startup analytics dashboard
- Not monospace-everything

---

## Design Tokens

### Palette — Cool Slate Darks, Warm Light

**Backgrounds (cool blue-gray undertone):**

| Token          | Hex       | Usage                                    |
|----------------|-----------|------------------------------------------|
| `--bg-base`    | `#13161C` | Window background, timeline strip        |
| `--bg-surface` | `#1A1E26` | Panels, sidebars, agent roster           |
| `--bg-elevated`| `#232830` | Active items, hover states               |
| `--bg-raised`  | `#2C323C` | Selected/pressed states                  |
| `--stroke`     | `#3A4050` | Window edge, primary containment border  |

**Text (warm cream and sage family):**

| Token          | Hex       | Usage                                    |
|----------------|-----------|------------------------------------------|
| `--text-1`     | `#E0D8D0` | Primary text — cream white, not clinical |
| `--text-2`     | `#B0B8B4` | Secondary text — sage-tinted muted       |
| `--text-3`     | `#6A7080` | Tertiary text — structural labels        |
| `--text-dim`   | `#3E4655` | Dimmest text — timestamps, separators    |

**Signal Colors (desaturated, purposeful):**

| Token          | Hex       | Usage                                    |
|----------------|-----------|------------------------------------------|
| `--teal`       | `#38A89A` | Primary accent. Active state, links, focus borders, success |
| `--coral`      | `#E08870` | Danger, high-risk, deny actions          |
| `--gold`       | `#D4AE48` | Warning, medium-risk, pending state, writing status |
| `--steel`      | `#5B7EA0` | Info, waiting state, secondary accent    |
| `--ripple`     | `#9ABF40` | Executing/active-write state only — muted warm-green |

### Typography — Three Fonts, Three Jobs

| Role              | Font            | Usage                                           |
|-------------------|-----------------|-------------------------------------------------|
| UI + Headlines    | **Sora**        | All interface text, headlines, body, buttons. The proportional voice. Geometric, Japanese-influenced precision. |
| Operational Data  | **B612 Mono**   | Timestamps, costs, token counts, model IDs, file paths. The cockpit instrument font. Designed by Airbus for flight-deck displays. |
| Identity + Labels | **Departure Mono** | Section labels (AGENTS, METRICS), risk badges, the NP mark, status tags. The personality font. Single weight, high character. |

**Rule:** Sora speaks. B612 measures. Departure brands. Never all-mono. Never.

**Type Scale:**

| Size  | Weight | Usage                             |
|-------|--------|-----------------------------------|
| 20px  | 600    | Primary display (Sora)            |
| 16px  | 600    | Section headers (Sora)            |
| 13px  | 500    | UI emphasis, agent names (Sora)   |
| 12px  | 400    | Body text (Sora)                  |
| 11px  | 500    | Pill labels, small UI (Sora)      |
| 10px  | 400    | Button text, compact UI (Sora)    |
| 9px   | 400    | Operational data (B612 Mono)      |
| 8px   | 400    | Timestamps, dimmed data (B612 Mono) |
| 9px   | 400    | Section labels, badges (Departure Mono) |
| 8px   | 400    | Risk tags, status labels (Departure Mono) |

### Spacing — 4px Base Unit

Scale: `2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32`

| Context                      | Value   |
|------------------------------|---------|
| Diff line gap                | 2px     |
| Tight inner padding          | 4px     |
| Pill row vertical padding    | 6px     |
| Element gap (universal)      | 8px     |
| Zone internal padding        | 12px    |
| Section gap                  | 16px    |
| Zone-to-zone divider space   | 20px    |
| Outer padding                | 24px    |
| Maximum spacer               | 32px    |

### Border Radius — Decreasing Precision Scale

Outer shell = warm. Inner data = sharp. Pill shape reserved for compact mode only.

| Radius | Usage                               |
|--------|-------------------------------------|
| 12px   | Main window, modals                 |
| 8px    | Panels, cards, zone containers      |
| 6px    | Agent pills, list items             |
| 4px    | Buttons, inputs, diff blocks        |
| 3px    | Tags, badges, risk labels           |
| pill   | Compact notch bar only              |

### Borders — 0.5px Always, No Exceptions

| Type        | Color/Opacity          | Usage                              |
|-------------|------------------------|------------------------------------|
| Subtle      | `#2A2E38` · 0.5px      | Panel divisions, internal structure|
| Structural  | `#3A4050` · 0.5px      | Window edge, primary containment   |
| Active      | `--teal` · 0.5px       | Selected agent, focused input      |
| Signal      | `--coral`/`--gold` · 0.5px | Risk badges, semantic borders   |

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

---

## Physics Layer — The Soul of the Design

The physics isn't decoration. It's the information architecture. Five systems, each encoding real agent state.

### 1. Spacetime Grid

A barely-visible grid of thin lines at the `--bg-base` level, rendered on canvas. The grid deforms near active zones — lines pull toward the point of highest activity, like a gravitational field warping spacetime.

- **Default opacity:** 1-1.5% (barely perceptible)
- **Grid cell size:** 28px default
- **Deformation:** Lines warp toward active agent zone. Warp intensity scales with risk tier.
- **Risk scaling:** Low risk = 1% opacity, 28px cells. Medium = 1.8% opacity, 28px cells. High = 3.5% opacity, 22px cells (tighter).
- **Color:** `--teal` at very low alpha
- **Implementation:** CSS `background-image` for v1 (static). Canvas with deformation for v1.5. WebGL for v2.

### 2. Orbital Frequency — Agent Status Encoded in Rhythm

Each agent status has a distinct animation signature. You learn the rhythm in a day.

| State     | Color     | Animation                        | Period  |
|-----------|-----------|----------------------------------|---------|
| Idle      | `--teal`  | Slow single-ring breath          | 3.5s    |
| Writing   | `--gold`  | Double-ring pulse                | 0.9s    |
| Waiting   | `--steel` | Tension-release (hold → snap)    | 2.4s    |
| Executing | `--ripple`| Bioluminescent glow + drifting motes | continuous |
| Error     | `--coral` | Lateral tremor (shake)           | 0.3s    |

**Orb sizes:** 7px in notch, 5px in pill/command center. Rings extend 4-6px beyond orb edge.

### 3. Murmuration Toroidal Fields — Progress as Flock Density

Replaces all linear progress bars. Context health, budget burn, session progress — all rendered as particle swarms orbiting a ring path.

- **Particle size:** ~1px each (starling-scale, not marbles)
- **Behavior:** Flocking along orbital path with slight drift (±3px from ring center)
- **Density encodes metric:** 28% = ~25 sparse wisps. 62% = ~70 forming stream. 89% = ~140 dense swarm. 96% = ~260 near-solid ring.
- **Speed scales with density:** Sparse = slow drift. Dense = fast stream.
- **Color transitions:** `--teal` (healthy) → `--gold` (warning threshold ~70%) → `--coral` (critical ~90%)
- **Ring guide:** 1px structural ring at ~6% opacity, always visible as orbital path

### 4. Gravitational Weight — Risk Warps the Field

Risk isn't a colored badge. It's mass. High-risk approvals physically occupy more space, have denser borders, and warp the grid around them.

| Tier   | Padding  | Font scale | Grid intensity | Diff surface | Keyboard hints | Border accent |
|--------|----------|------------|----------------|--------------|----------------|---------------|
| Low    | 6-8px    | 8px text   | 1% opacity     | 1-line inline| hidden         | none          |
| Medium | 8-10px   | 9px text   | 1.8% opacity   | compact diff | shown          | `--gold` 0.5px|
| High   | 12px     | 9-10px text| 3.5% opacity   | full diff + impact summary | shown + prominent | `--coral` 0.5px |

**The gravitational rule:** You feel the weight of a decision before you read the label.

### 5. Bioluminescent Executing State

When an agent is actively writing to disk (file writes, bash execution), the orb shifts from its base color to `--ripple` (#9ABF40). No expanding rings. No sonar.

- **Orb:** Color oscillates between base gold and warm-green on a slow cycle
- **Glow:** Soft inner glow (4-8px spread) at 3-6% opacity, pulsing
- **Motes:** Tiny particles (~0.8px) occasionally detach from orb edge and drift a short distance before fading
- **Multiple agents:** Staggered phases create gentle interference — like bioluminescent plankton, not synchronized beacons
- **Metaphor:** Deep-sea luminescence, not radar ping

---

## Three Modes — Decompression Architecture

The app has three states, connected by a physically-motivated transition. The information is always there; modes control resolution.

### Mode 1: Notch Ambient — "The Singularity"

All information compressed to a few dots inside the macOS notch area.

- **Height:** 32px (within notch safe area)
- **Width:** Fits within ~200px notch cavity
- **Contents:** 3-5 agent status orbs (7px each, 8px gap), agent count (B612 Mono 8px), session cost (B612 Mono 8px)
- **Horizontal padding:** 16px
- **Camera dot:** Respected, content positioned around it
- **External monitor fallback:** Floating pill at top-center of screen (same content, pill shape with 50px radius, `--bg-surface` background, `--stroke` border)
- **Orbs pulse at orbital frequency** — busy agents vibrate faster, idle agents drift slowly, waiting agents hold-then-snap

### Mode 2: Expanded Pill — "The Glance"

Drops below the notch on hover or single click. This is the daily-driver state — handles 80% of interaction.

- **Width:** 380px, centered below notch
- **Shape:** `--bg-base` background, `--stroke` border, 0px top radius (connects to notch), 10px bottom radius
- **Agent rows:** 28px height each, 2px gap between rows
- **Row contents:** Status orb (5px) · Agent name (Sora 11px/500) · Meta (B612 Mono 9px: model, status, elapsed) · Cost (B612 Mono 9px) · Optional pending badge (Departure Mono 8px, `--gold` tint)
- **Footer:** Session summary (agent count, total cost) + keyboard hint for full view (⌘⇧N)
- **Padding:** 8px top, 12px sides, 8px bottom. Footer separated by 6px + `--bg-surface` border-top

### Mode 3: Command Center — "The Field"

Full operational surface. Four fixed zones. Everything visible at once. Your eyes learn fixed positions like a pilot learns instruments.

- **Shape:** Separate window, 12px radius, `--stroke` border
- **Background:** `--bg-base` with spacetime grid at 1-3.5% opacity

**Top bar (36px):**
- NP mark (Departure Mono 10px, `--text-dim`)
- Agent mini-pills: orb (4px) + abbreviation (Sora 10px/500)
- Selected pill has `--bg-surface` bg + `--stroke` border
- Right: session cost + token count (B612 Mono 9px) + LIVE indicator (`--ripple` if any agent executing)

**Left rail — Agent Roster (140px wide):**
- Zone label: "AGENTS" (Departure Mono 7px, `--text-dim`, 0.12em tracking)
- Agent items: orb (5px) + name (Sora 10px/500) + meta line (B612 Mono 8px: model, status, elapsed) + cost (B612 Mono 8px, right-aligned)
- Selected agent: `--bg-elevated` background, 4px radius
- Active agent name color matches its status color
- Session total at bottom: border-top separator, total in Sora 14-16px/600
- Separated from center by 0.5px `--bg-elevated` border

**Center bay — Active Session (flexible width):**
- Zone label: "ACTIVE — [AGENT] · [FILE]" (Departure Mono 7px)
- Risk badge: Departure Mono 8px, risk-color tint bg + 0.5px border, 3px radius
- Impact summary: B612 Mono 9px, `--text-3` (file count, dependency count)
- Diff block: `--bg-base` bg, 4px radius, 0.5px `--bg-elevated` border, 6px padding
  - Context lines: B612 Mono 9px, `--bg-raised` color
  - Additions: B612 Mono 9px, `--teal` at 70% opacity, teal-tinted bg at 4%
  - Deletions: B612 Mono 9px, `--coral` at 65% opacity, coral-tinted bg at 4%
- Action buttons: Sora 10px/500, 4px radius, 4px vertical / 10-12px horizontal padding
  - Approve: teal-tinted (8% bg, 20% border, 85% text) + ⌘Y hint (B612 Mono 8px, 40% opacity)
  - Deny: coral-tinted (5% bg, 12% border, 70% text) + ⌘N hint
- 8px gap between diff block and buttons

**Right rail — Metrics (120px wide):**
- Zone label: "METRICS" (Departure Mono 7px)
- Metric items: label (Departure Mono 7px, `--text-dim`) → value (Sora 15-16px/600, `--text-1`) → unit (Sora 9-10px, `--text-dim`)
- Toroidal field indicators for context health and budget burn (murmuration particle canvas, 36-56px diameter)
- 8px gap between metrics
- Separated from center by 0.5px `--bg-elevated` border

**Bottom strip — Event Timeline (36-40px, full width):**
- Background: `--bg-base`, border-top 0.5px `--bg-surface`
- Event bars: 3px wide, variable height, 2px gap, 1px radius
  - Quiet: `--bg-elevated` (3-4px tall)
  - Teal event (success/auto-approve): `--teal` at 25-30% opacity
  - Gold event (medium risk/pending): `--gold` at 30% opacity
  - Coral event (high risk/denied): `--coral` at 35% opacity, tallest bars
- Bar height encodes event significance: auto-approved = 5-7px, medium approval = 10-16px, high-risk = 20-28px
- Right-aligned timestamp: B612 Mono 7px, `--bg-raised` color

---

## Mode Transitions

| From     | To         | Trigger                                    | Duration | Easing   |
|----------|------------|--------------------------------------------|----------|----------|
| Notch    | Pill       | Hover notch area or single click           | 120ms    | ease-out |
| Pill     | Notch      | Mouse leaves pill area (300ms delay)        | 100ms    | ease-in  |
| Pill     | Cmd Center | Click agent · ⌘⇧N · auto on high-risk     | 200ms    | ease-out |
| Cmd Ctr  | Pill       | Esc · click outside · approve/deny complete| 150ms    | ease-in  |
| Notch    | Cmd Center | ⌘⇧N direct · auto on high-risk approval   | 250ms    | ease-out |

**Transition physics:**
- **Notch → Pill:** Panel slides down from notch edge. Opacity 0→1. No scale. It reveals, like a surface emerging.
- **Pill → Command Center:** Pill width expands to window width. Height grows. Zones materialize in expanding space. Agent list stretches into left rail. Content decompresses into spatial positions.
- **Auto-expand (high risk):** Notch skips pill, expands directly to command center. Coral risk badge renders first. 250ms. Demands attention without stealing focus.
- **Non-activating overlay:** Window level = floating panel. Never steals focus from editor/terminal. Critical for workflow — you approve while your cursor stays in your IDE.

---

## Smart Approval Tiers

Three risk tiers, not binary allow/deny. The system learns from approval history.

| Tier   | Color     | Behavior                                                      |
|--------|-----------|---------------------------------------------------------------|
| Low    | `--teal`  | Auto-approved. CSS, docs, config reads. Logged silently in timeline. No interruption. Compressed visual: 1-line inline summary, small text, translucent. |
| Medium | `--gold`  | Compact diff, one-click approve. API routes, test files. Standard density. Keyboard hints visible. |
| High   | `--coral` | Full review. Auth, production, destructive ops. Expanded surface with impact analysis, dependency count, consequence summary. Gravitational weight — commands space, warps grid. |

Patterns you always approve drift toward low over time. Patterns you've denied stay high. Session memory persists across restarts.

---

## Motion Principles

- Transitions serve comprehension. Nothing decorates.
- Mode transition: 120-250ms ease-out (see transition table)
- Panel reveals: 150ms
- Status changes: crossfade 100ms
- Timeline: pulse for new events
- No bounces. No springs. No ambient shimmer. Mission control doesn't animate.
- All orbital frequency animations use `ease-in-out` and respect `prefers-reduced-motion`

---

## Keyboard Shortcuts

| Action              | Shortcut   |
|---------------------|------------|
| Approve             | ⌘Y         |
| Deny                | ⌘N         |
| Toggle command center | ⌘⇧N      |
| Next agent          | ⌘]         |
| Previous agent      | ⌘[         |
| Jump to terminal    | ⌘⏎ (Enter)|
| Dismiss             | Esc        |

---

## Stitch Prompt Templates

These are pre-written prompts optimized for Google Stitch. Use them screen-by-screen. Start with the Design System prompt, then generate each mode individually. Refine with follow-up prompts as needed.

### Stitch Prompt 0: Design System Setup

> Design a dark-theme macOS desktop application called "NotchOS" — an air traffic control interface for AI coding agents. Use this design system:
>
> Background colors (cool blue-gray): base #13161C, surface #1A1E26, elevated #232830, raised #2C323C.
> Text colors (warm cream): primary #E0D8D0, secondary #B0B8B4, tertiary #6A7080, dim #3E4655.
> Accent colors: teal #38A89A (primary/success), coral #E08870 (danger), gold #D4AE48 (warning/pending), steel blue #5B7EA0 (info/waiting).
>
> Typography: "Sora" for all UI text (geometric sans-serif). Monospace "B612 Mono" for timestamps, costs, token counts, and code. A secondary monospace for section labels and badges.
>
> Borders: always 0.5px. Radius scale: 12px (window), 8px (panels), 6px (pills), 4px (buttons), 3px (badges). No shadows, no blur, no gradients. Depth comes from background color steps only.
>
> The mood is a staffed observatory control room — calm, competent, precise. Not a hacker terminal, not a gaming HUD.

### Stitch Prompt 1: Notch Compact Mode

> Design the compact notch mode for NotchOS. This is a tiny ambient display that fits inside the MacBook notch (200px wide, 32px tall). It shows:
> - 3 small status dots (7px circles) representing AI agents, each a different color: teal (idle), gold (writing), steel blue (waiting)
> - A small agent count number "3" in monospace
> - A session cost "$2.47" in monospace
>
> The dots should have subtle concentric ring animations at different speeds — the gold dot pulses fastest (active), teal is slow (idle), steel blue holds then snaps (waiting).
>
> Background is pure black (inside the notch). Text is very dim (#3E4655). The entire thing should feel like instrument readouts — minimal, glanceable, ambient.

### Stitch Prompt 2: Expanded Pill Mode

> Design the expanded pill mode for NotchOS. This panel drops down below the MacBook notch, 380px wide, connecting visually to the notch above.
>
> It contains a list of 3 AI agent sessions, each as a row (28px tall):
> - Row 1: Teal dot + "Claude Code" (Sora font, 11px) + "opus-4 · idle · 4m" (monospace 9px, dim) + "$0.82" (monospace, right-aligned)
> - Row 2 (highlighted with elevated background): Gold dot + "Codex" + "o3 · write_file · 12m" + "$1.47" (gold color) + a small "PENDING" badge (monospace 8px, gold tint)
> - Row 3: Steel blue dot + "Gemini CLI" + "2.5-pro · awaiting · 8m" + "$0.18"
>
> Below the list, a footer with "3 agents · $2.47" on the left and "⌘⇧N" keyboard hint on the right in teal.
>
> Background: #13161C. No top border-radius (connects to notch), 10px bottom radius. 0.5px border in #3A4050. Subtle separator line between rows. The vibe is a compact flight manifest — scannable, information-dense but not cluttered.

### Stitch Prompt 3: Command Center

> Design the full command center for NotchOS — a four-zone operational dashboard for monitoring AI coding agents. This is a floating window (approximately 700x400px), dark theme, 12px border-radius, 0.5px border in #3A4050 on a #13161C background.
>
> **Top bar (36px):** Left: "NP" logo text in monospace. Center: three small agent pills (4px dot + 2-letter abbreviation). Right: "$2.47 · 38.2k tok" in monospace, plus a green "● LIVE" indicator.
>
> **Left rail (140px):** Label "AGENTS" in small caps monospace. Three agent entries stacked vertically — each shows a status dot, agent name (Sora font), model/status/time in tiny monospace, and cost right-aligned. The active agent "Codex" is highlighted with a slightly lighter background.
>
> **Center bay (flexible width):** Label "ACTIVE — CODEX · auth.ts". A "MEDIUM RISK" badge in gold tint. Below that, a code diff block on the darkest background showing removed lines in coral and added lines in teal. Below the diff, two action buttons: "Approve ⌘Y" (teal-tinted) and "Deny ⌘N" (coral-tinted).
>
> **Right rail (120px):** Label "METRICS". Shows context health as a circular indicator (ring with particles orbiting it, 66% in teal), token count "38.2k" in large Sora font, and approval count "12 / 2 denied".
>
> **Bottom strip (36px, full width):** An event timeline — a row of tiny vertical bars (3px wide) of varying heights. Taller bars = more significant events. Bar colors: teal for auto-approved, gold for pending, coral for high-risk. Timestamp "14:20 → 14:32" right-aligned in tiny monospace.
>
> The overall feel should be a precision instrument panel — structured, calm, everything in a fixed position. A barely-visible grid pattern (like spacetime fabric) should be perceptible in the base background at about 1% opacity with teal-tinted lines.

---

## Competitive Differentiation vs. Vibe Island

| Dimension          | Vibe Island                        | NotchOS                                     |
|--------------------|------------------------------------|----------------------------------------------|
| Modes              | 2 (notch pill → dropdown list)     | 3 (notch → pill → command center)            |
| Approval           | Binary allow/deny                  | 3-tier risk-scored, learning over time        |
| Layout             | Vertical notification feed         | Fixed 4-zone spatial dashboard                |
| Cost tracking      | None                               | Per-agent + session total, real-time          |
| Context health     | None                               | Murmuration toroidal field indicator          |
| Typography         | All monospace                      | Proportional UI + mono evidence + mono identity |
| Design language    | Hacker terminal (ASCII, void black)| Deep Field physics (spacetime, orbital, murmuration) |
| Framework          | Native Swift                       | Tauri 2 (Rust + React/TypeScript)            |

**Positioning:** Their entire product is our State 2 (expanded pill). We match their functionality as a transition state and go where they can't with the command center.

---

## Implementation Tiers

### V1 — Ships with MVP (CSS + lightweight canvas)
- Spacetime grid: CSS `background-image` (static, no deformation)
- Orbital frequencies: CSS `@keyframes` with variable durations
- Risk spacing: CSS custom properties toggled by risk-tier class
- Toroidal fields: SVG `stroke-dasharray` (simplified ring, no particles)
- Bioluminescent state: Conditional CSS class with `box-shadow` spread
- Spark color: CSS variable swap on executing state

### V1.5 — Post-launch polish (canvas addition ~2-3KB JS)
- Spacetime grid deformation (canvas, 60fps, mouse/agent-follow warp)
- Murmuration particle toroidal fields (canvas, flocking particles)
- Smooth orbital frequency transitions between states
- Bioluminescent mote particles (canvas, drifting detach-and-fade)
- Interference patterns when multiple agents execute simultaneously

### V2 — If concept proves out (WebGL)
- Full spacetime fabric simulation with real gravitational lensing
- Cymatics generation responding to agent activity frequency
- Agent interference wave patterns (3+ agents create standing waves)
- GPU-accelerated particle systems for all toroidal fields


---

## Stitch MCP Integration — Design-to-Code Pipeline

NotchOS uses Google Stitch as the design generation layer, connected to Claude Code via MCP for direct design-to-React conversion.

### Setup

**1. Install Stitch MCP server for Claude Code:**
```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["@_davideast/stitch-mcp", "proxy"]
    }
  }
}
```
Run `npx @_davideast/stitch-mcp init` to authenticate and configure.

**2. Install Stitch Agent Skills (Claude Code global skills):**
```bash
# Core design workflow
npx skills add google-labs-code/stitch-skills --skill stitch-design --global

# Prompt enhancement (injects DESIGN.md context automatically)
npx skills add google-labs-code/stitch-skills --skill enhance-prompt --global

# React component conversion
npx skills add google-labs-code/stitch-skills --skill react:components --global

# Auto-generate multi-page sites
npx skills add google-labs-code/stitch-skills --skill stitch-loop --global

# Design system extraction/synthesis
npx skills add google-labs-code/stitch-skills --skill design-md --global
```

**3. Design system file placement:**
The `.stitch/DESIGN.md` file in this repo is the Stitch-optimized design system in semantic language. The `enhance-prompt` skill automatically reads this file and injects design system context into every screen generation prompt. The `stitch-design` skill uses it as the source of truth for design synthesis.

### Workflow: Stitch → Claude Code → React/Tauri

**Step 1: Generate screens in Stitch**
Use the Stitch canvas (stitch.withgoogle.com) or Claude Code with the stitch-design skill. The enhance-prompt skill automatically enriches your prompts with the design system from `.stitch/DESIGN.md`.

**Step 2: Fetch designs via MCP**
Claude Code can pull screen HTML/CSS directly:
```
# In Claude Code:
"Use the Stitch MCP to fetch the NotchOS command center screen and show me the code."
```
Key MCP tools: `get_screen_code`, `get_screen_image`, `build_site`

**Step 3: Convert to React components**
The `react:components` skill converts Stitch HTML output to React component systems with design token consistency:
```
# In Claude Code:
"Convert the fetched Stitch screens to React/TypeScript components for our Tauri app."
```

**Step 4: Multi-page generation with stitch-loop**
For generating all three modes (notch, pill, command center) autonomously, use the stitch-loop skill which chains screen generation via a baton system (next-prompt.md).

### File Structure
```
notchos/
├── .stitch/
│   └── DESIGN.md          ← Stitch-optimized design system (semantic language)
├── DESIGN.md               ← Full canonical spec (this file — human + CC reference)
├── src/
│   ├── App.tsx
│   ├── components/
│   ├── styles/
│   └── ...
└── src-tauri/
```

The `.stitch/DESIGN.md` is optimized for Stitch's agent pipeline (natural language, descriptive, no code). The root `DESIGN.md` is the comprehensive engineering spec with exact values, implementation tiers, and competitive analysis.
