# DESIGN.md — NotchOS Design System

## Atmosphere
NotchOS is an air traffic control interface for AI coding agents on macOS. The visual mood is a staffed deep-space observatory at night — cool, calm, mathematically precise. Not a hacker terminal. Not a gaming HUD. The first emotion is relief: someone competent is already watching.

## Color Palette

### Backgrounds
The backgrounds use cool blue-gray undertones, like deep night sky rather than warm leather or void black.
- Base: a very deep blue-charcoal (#13161C) — the window background and timeline strip
- Surface: slightly lighter cool slate (#1A1E26) — panels, sidebars, agent roster
- Elevated: a step brighter (#232830) — active items, hover states
- Raised: the lightest dark surface (#2C323C) — selected or pressed states
- Structural border: a cool medium-dark (#3A4050) — window edges, primary containment

### Text
Text uses warm cream and sage tones that glow against the cool dark backgrounds — temperature inversion.
- Primary text: warm cream (#E0D8D0) — not clinical white, not yellow
- Secondary text: sage-tinted muted (#B0B8B4) — readable but receded
- Tertiary text: cool gray (#6A7080) — structural labels
- Dim text: near-invisible (#3E4655) — timestamps, separator labels

### Accents and Signal Colors
All accent colors are desaturated and purposeful — used sparingly for meaning, never decoration.
- Teal (#38A89A): primary accent, success, active state, focus borders, links. The observatory color.
- Coral (#E08870): danger, high-risk approvals, deny actions. Warm urgency without panic.
- Gold (#D4AE48): warning, medium-risk, pending state, writing status. Attention without alarm.
- Steel blue (#5B7EA0): info, waiting state, secondary accent. Cool and patient.
- Muted warm-green (#9ABF40): executing/active-write state only. Reserved for "tokens flowing to disk right now."

### Semantic Tinting
Signal colors appear as tinted backgrounds at very low opacity (4-8%) with matching borders at 12-20% opacity. Never as solid fills on large surfaces. The tint whispers; it doesn't shout.

## Typography

Three fonts with distinct, non-overlapping roles:

### Sora (UI Voice)
A geometric sans-serif with Japanese-influenced precision. Used for all interface text: headlines, body, buttons, agent names, metric values. Weights: 400 regular, 500 medium, 600 semibold, 700 bold. This is the proportional voice — editorial, not terminal.

### B612 Mono (Cockpit Evidence)
Designed by Airbus for flight-deck displays. Used for all operational data: timestamps, costs, token counts, model IDs, file paths, code diffs. This is the evidence font — if the data can be verified, it's in B612 Mono.

### Departure Mono (Identity and Labels)
High-character personality font. Single weight. Used for section labels (AGENTS, METRICS, ACTIVE), risk badges, status tags, and the NP brand mark. This is the branding voice — it makes NotchOS recognizable.

Rule: Sora speaks. B612 measures. Departure brands. The interface never goes all-monospace.

## Spacing and Density

Base unit: 4px. Comfortable instrument density — breathing room to feel calm, tight enough to scan fast.

Scale: 2px (diff line gaps) · 4px (tight inner padding) · 6px (pill row padding) · 8px (universal element gap) · 12px (zone internal padding) · 16px (section gaps) · 20px (zone dividers) · 24px (outer padding) · 32px (maximum spacer).

Gravitational spacing rule: risk tier controls density. Low-risk items compress (6-8px padding, small text, translucent). Medium-risk items use standard spacing (8-10px). High-risk items physically expand (12px+ padding, larger text, full diff surface, impact summary). You feel the weight of a decision before you read the label.

## Borders and Surfaces

Every border is 0.5px. No exceptions. Thicker borders are for consumer apps — 0.5px reads as etched, like machined lines on an instrument face.

Four border roles:
- Subtle (#2A2E38): panel divisions, internal structure
- Structural (#3A4050): window edge, primary containment
- Active (teal): selected agent, focused input — one thing at a time
- Signal (coral or gold): risk badges, approval borders — semantic only

No shadows. No blur. No glow. No backdrop-filter. Depth comes exclusively from background color steps — base → surface → elevated → raised. Each layer is 6-8 lightness points above the last.

## Corner Radius

Decreasing radius from outer shell to inner data. Outer = warm and approachable. Inner = sharp and precise.
- 12px: main window, modals
- 8px: panels, cards, zone containers
- 6px: agent pills, list items
- 4px: buttons, inputs, diff blocks
- 3px: tags, badges, risk labels
- Pill (full round): compact notch bar only — the singularity form factor

## Physics-Based Design Language

The design language draws from orbital mechanics, gravitational fields, and murmuration dynamics. The physics encodes real information — it is the information architecture, not decoration.

### Spacetime Grid
A barely-visible grid of teal-tinted lines at the base background level (~1% opacity, 28px cell size). In interactive implementations, the grid deforms near active zones — lines pull toward the point of highest activity like a gravitational field warping spacetime. Grid intensity and cell tightness scale with risk tier.

### Orbital Frequency
Agent status orbs pulse at distinct frequencies. Idle agents drift slowly (3.5s period). Writing agents pulse faster with double rings (0.9s). Waiting agents hold tension then snap (2.4s). Executing agents emit a soft bioluminescent glow with drifting motes. Error agents tremor laterally (0.3s). The rhythm is the status.

### Murmuration Toroidal Fields
Progress indicators use particle swarms (1px motes) orbiting a ring path, like a murmuration of starlings forming a circle. Metric value = flock density. At 28%, sparse wisps drift slowly. At 96%, hundreds of particles form a near-solid ring. Color shifts from teal (healthy) through gold (warning) to coral (critical). Not a bar filling — a field saturating.

### Gravitational Weight
Risk tier controls physical density of the approval surface. Low-risk items are compressed, translucent, lightweight. High-risk items expand physically — more padding, larger text, fuller diff surfaces, impact summaries, accent borders. The spacetime grid tenses around danger.

### Bioluminescent Executing State
When an agent actively writes to disk, its orb shifts to muted warm-green with a soft inner glow. Tiny motes (~0.8px) occasionally detach and drift before fading, like bioluminescent plankton. Multiple agents executing create staggered, gently interfering glow fields. Deep-sea luminescence, not radar ping.

## Motion

Minimal-functional. Transitions serve comprehension, never decoration.
- Mode transitions: 120-250ms ease-out
- Panel reveals: 150ms
- Status crossfades: 100ms
- No bounces, no springs, no ambient shimmer
- All orbital animations respect prefers-reduced-motion

## Layout — Three Modes

### Mode 1: Notch Compact
A tiny ambient display inside the MacBook notch (200px wide, 32px tall). Shows 3-5 agent status orbs (7px, 8px gap) with pulse animations encoding state, a small agent count, and running session cost in B612 Mono at 8px. Background is pure black (inside the notch). On external monitors, appears as a floating pill bar at top-center.

### Mode 2: Expanded Pill
Drops below the notch on hover or click. 380px wide. Contains an agent roster with rows at 28px height showing: status orb (5px), agent name (Sora 11px), operational meta (B612 Mono 9px), cost, and optional pending badge (Departure Mono 8px). Footer shows session summary and keyboard hint for full view. This state handles 80% of daily interaction.

### Mode 3: Command Center
Full four-zone operational surface. 12px border-radius window with spacetime grid visible at base level.
- Top bar (36px): NP mark in Departure Mono, agent mini-pills, session cost + token count in B612 Mono, LIVE indicator
- Left rail (140px): Agent roster with status orbs, names in Sora, meta in B612 Mono, per-agent costs, session total
- Center bay (flexible): Active session with risk badge in Departure Mono, impact summary in B612 Mono, code diff block (additions in teal, deletions in coral), approve/deny buttons in Sora
- Right rail (120px): Metrics with murmuration toroidal fields for context health and budget, token counts in Sora, approval history
- Bottom strip (36-40px): Event timeline with variable-height bars (3px wide) colored by event type — teal (auto-approved), gold (pending), coral (high-risk)

## What This Should NOT Look Like
- No void black backgrounds (#000, #0a0c0e) — use cool blue-charcoal
- No neon greens, electric cyans, or phosphor colors
- No monospace for all text — proportional UI, mono for evidence only
- No ASCII art, pixel art, dot-matrix aesthetics
- No glassmorphism, gradient meshes, or frosted glass effects
- No gaming HUD elements or notification bar layouts
- No centered card grids or startup dashboard patterns
