# Design Audit: NotchOS Visual Upgrade

**URL:** http://localhost:5199
**Date:** 2026-04-06
**Branch:** visual-upgrade
**Classification:** APP UI (workspace-driven, data-dense, task-focused)
**Design System:** DESIGN.md "Deep Field" (verified against rendered output)

---

## First Impression

The site communicates **quiet authority**. This is an instrument panel, not a dashboard. The dark glass treatment reads as aerospace, not generic SaaS.

I notice **the three-mode transition is the star**. Notch → Pill → Command Center feels like a physical instrument expanding. The StatusOrb SVG arcs rotating by status add mechanical precision. The RadialGauges in the metrics rail read like cockpit instruments.

The first 3 things my eye goes to are: **the selected agent name in teal** (1), **the $5.68 total cost in the roster** (2), and **the RadialGauge arcs** (3). Good hierarchy for agent monitoring.

If I had to describe this in one word: **cockpit**.

---

## Design Score: B+
## AI Slop Score: A

---

## Inferred Design System (verified against DESIGN.md)

**Fonts (3):** Sora (UI), B612 Mono (data), Departure Mono (labels). All present and correctly assigned. No generic stacks. The three-font rule is clean and enforced.

**Color palette:** 7 signal colors in use (teal, coral, gold, steel, ripple + dim variants). Warm cream text family. Backgrounds on the cool blue-grey spectrum. Palette is coherent, purposeful, not scattered.

**Spacing:** 4px base scale used throughout. Consistent.

**Touch targets:** Multiple undersized targets. Agent selector pills in TopBar are 54x22px (should be 44px tall). Mute button is 26x15px. Collapse bar is 32x14px. Approve/Deny buttons are 99x28px and 79x28px. These are fine for a desktop Tauri app but would fail mobile accessibility.

**No heading tags used.** All text hierarchy is via font-size/weight/color, not semantic HTML headings. Fine for a floating overlay app.

---

## Category Grades

| Category | Grade | Notes |
|----------|-------|-------|
| Visual Hierarchy | **A** | Clear focal point, eye flow works, information density appropriate |
| Typography | **A** | Three purposeful fonts, scale follows ratio, no generic stacks |
| Color & Contrast | **B** | Palette coherent, warm cream text works. Some dim labels still borderline |
| Spacing & Layout | **A-** | Grid consistent, 4px scale, alignment clean. Interior zones well-separated |
| Interaction States | **B** | Hover states present via CSS. No visible focus-visible ring on some elements |
| Responsive | **N/A** | Fixed-size Tauri window, not applicable |
| Motion | **A** | SVG arc rotations per status, spring physics on transitions, reduced-motion respected |
| Content Quality | **B+** | "All clear — no pending actions" is good. "listening" empty state is warm. Labels are specific |
| AI Slop | **A** | Zero AI slop patterns detected. Dark instrument aesthetic is original |
| Performance Feel | **B+** | Transitions smooth. Glass backdrop-filter could cause jank on older Macs |

---

## Findings

### FINDING-001: Center bay empty state is dead space (Medium)
When no approval is pending, the center bay shows "All clear — no pending actions" and a single line of session metadata. This is ~70% of the Command Center's real estate sitting empty. The user stares at this most of the time.

**Suggestion:** Show richer agent context when idle — recent tool calls, current file being edited, a mini activity log. The center bay should always feel alive, even when nothing needs approval.

**Impact:** Medium. Not broken, but the main view feels underutilized.
**Status:** Deferred (requires new data, not a CSS fix)

### FINDING-002: Approve/Deny buttons undersized for their importance (Medium)
The Approve and Deny buttons are 99x28px and 79x28px. For the most consequential action in the app (approving a destructive cache purge on production), these feel small and easily missed. The high-risk treatment (coral glow, 2px border) helps but the buttons themselves could be taller.

**Suggestion:** Bump the high-risk buttons to at least 36px height with 14px horizontal padding. Make them the gravitational center of the approval surface.

**Impact:** Medium. Affects the most critical user action.
**Status:** Fixable

### FINDING-003: Collapse bar too subtle for discoverability (Low)
The collapse bar is a 16x2px line at top-right. First-time users won't know it's there. Combined with no Esc key hint on screen, a user might feel trapped in the Command Center.

**Suggestion:** Add a subtle "esc" label near the collapse bar in `--text-dim`, or make the bar slightly larger (20x2px) with more hover contrast.

**Impact:** Low. Power users learn it fast. First-time friction only.
**Status:** Fixable

### FINDING-004: Mute button lacks visual state feedback (Low)
The mute button toggles between "SND" and "MUTED" text. Both use similar dim colors. It's not immediately clear whether sound is on or off without reading the text.

**Suggestion:** Use a teal tint for "SND" (active) and `--text-dim` for "MUTED" (inactive). Or use an icon/glyph that reads faster than text.

**Impact:** Low. Cosmetic.
**Status:** Fixable

### FINDING-005: No `focus-visible` ring on custom buttons (Medium)
The TopBar agent selector pills, mute button, and collapse bar have no visible focus ring when tabbed to. `focus-visible` is defined in index.css (teal outline), but CSS module buttons override `border` which may prevent the outline from showing.

**Suggestion:** Verify keyboard tab navigation shows focus rings on all interactive elements. May need `outline` instead of `border` approach.

**Impact:** Medium. Accessibility concern for keyboard users.
**Status:** Fixable

### FINDING-006: High-risk approval coral gradient is effective (Positive)
The `linear-gradient(135deg, rgba(224,136,112,0.04) 0%, transparent 60%)` background wash on high-risk approvals creates real visual weight without being garish. The 2px coral left border reads like a "redline" indicator. This is where the Porsche tachometer influence shows. Well done.

---

## Litmus Checks

| Check | Result |
|-------|--------|
| Brand/product unmistakable in first screen? | **YES** — NP mark + colored orbs + "4 agents $2.47" is unique |
| One strong visual anchor present? | **YES** — the three-mode expansion IS the anchor |
| Page understandable by scanning? | **YES** — AGENTS, METRICS, ACTIVE labels orient immediately |
| Each section has one job? | **YES** — roster = pick agent, center = act, metrics = monitor |
| Are cards actually necessary? | **N/A** — no cards used. Agent rows are lists. Good |
| Does motion improve hierarchy? | **YES** — StatusOrb arcs encode status, gauge dot encodes value |
| Would design feel premium with all decorative shadows removed? | **YES** — glass treatment is the only "decoration" and it's functional |

**Hard Rejections:** 0 of 7. No fails.

---

## Quick Wins (Top 3)

1. **Bump high-risk approve/deny buttons** to 36px height — 5 min CSS fix, highest-impact UX improvement
2. **Add "esc" hint** next to collapse bar — 2 min, improves discoverability
3. **Verify focus-visible** on all interactive elements — 10 min, accessibility compliance

---

## AI Slop Assessment

Zero out of 10 AI slop patterns detected. No purple gradients, no 3-column feature grids, no centered-everything, no decorative blobs, no generic hero copy. The "Deep Field" design language is genuine and original. The instrument cluster aesthetic (Porsche-inspired gauges, radar-scope grid, strip chart timeline) is genuinely differentiated from any AI-generated template.

**AI Slop Score: A** — This looks like it was designed by someone who cares about craft.

---

**Design review found 5 findings (0 critical, 3 medium, 2 low). Design score B+, AI slop score A.**
