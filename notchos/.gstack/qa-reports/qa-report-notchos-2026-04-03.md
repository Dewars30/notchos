# NotchOS V1.5 QA Report + Competitive Analysis

**Date:** 2026-04-03
**Target:** http://localhost:5199 (NotchOS V1.5)
**Competitor:** https://vibeisland.app
**Duration:** ~8 min
**Framework:** React 18 + TypeScript + Vite + Tauri 2
**Pages tested:** Command Center (all 4 agents), responsive viewports
**Console errors:** 0

---

## Health Score: 91/100

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Console | 100 | 15% | 15.0 |
| Links | 100 | 10% | 10.0 |
| Visual | 85 | 10% | 8.5 |
| Functional | 95 | 20% | 19.0 |
| UX | 90 | 15% | 13.5 |
| Performance | 95 | 10% | 9.5 |
| Content | 100 | 5% | 5.0 |
| Accessibility | 70 | 15% | 10.5 |
| **Total** | | | **91.0** |

Previous score: 94/100 (pre-V1.5). Delta: -3 (accessibility items added scope).

---

## Top 3 Things to Fix

1. **QA-V15-001: TopBar mini-pills missing from ARIA tree** — buttons render as cursor:pointer spans to assistive tech, not as proper toolbar buttons. Missing `aria-label` on each pill.
2. **QA-V15-002: AgentRoster option buttons not exposing role="option"** — listbox container detected but child options not in accessibility tree. May need explicit `aria-label` per button.
3. **QA-V15-003: Mobile viewport — Deny button hidden below fold** — at 375px width, only Approve is visible. Deny button scrolled off. (Low priority: desktop Tauri app.)

---

## Issues

### QA-V15-001: TopBar pills not in accessibility tree
- **Severity:** Medium
- **Category:** Accessibility
- **Evidence:** `snapshot -i -C` shows `@c3 [cursor:pointer] "CC"` instead of `[button] "CC"` with `aria-pressed`
- **Impact:** Screen readers can't navigate the agent selector toolbar
- **Fix:** Add `aria-label={agent.name}` to each TopBar button

### QA-V15-002: AgentRoster options not in accessibility tree
- **Severity:** Medium
- **Category:** Accessibility
- **Evidence:** `@e1 [listbox] "Agent list"` container found, but no `[option]` children detected
- **Impact:** Screen readers see the list but can't navigate items
- **Fix:** Add `aria-label={agent.name}` to each roster button

### QA-V15-003: Deny button clipped on mobile viewport
- **Severity:** Low
- **Category:** Visual / Responsive
- **Evidence:** screenshots/responsive-mobile.png — only Approve visible
- **Impact:** Cannot deny actions on narrow viewports
- **Note:** Desktop Tauri app, not a mobile target. Informational only.

### QA-V15-004: TopBar cost/tokens text wraps on narrow viewport
- **Severity:** Low
- **Category:** Visual
- **Evidence:** screenshots/responsive-mobile.png — "$2.47 · 38.2k tok" overlaps pill area
- **Note:** Desktop Tauri app, fixed window width. Informational only.

---

## What's Working Well (V1.5 Verification)

| Feature | Status | Evidence |
|---------|--------|----------|
| Murmuration ring (66%) | **Working** | Particles visible at correct density, teal color for <70% |
| Spacetime grid canvas | **Working** | CSS ::before removed, canvas rendering in background |
| Gravitational weight (low) | **Working** | Claude Code: no border, no hints, compact |
| Gravitational weight (medium) | **Working** | Codex: gold left border accent, standard buttons with ⌘Y/⌘N |
| Gravitational weight (high) | **Working** | Codex prod: coral border, "⚠ Destructive..." summary, full diff |
| High-risk auto-expand | **Working** | App auto-switches to CC mode when high-risk agent present |
| Focus ring styles | **Deployed** | CSS `:focus-visible` with teal outline in index.css |
| ARIA listbox on roster | **Working** | `role="listbox"` detected in snapshot |
| ARIA toolbar on TopBar | **Deployed** | `role="toolbar"` in source, needs accessible names |
| ARIA menu on ExpandedPill | **Deployed** | `role="menu"` and `role="menuitem"` in source |
| `aria-live` on approvals | **Deployed** | `aria-live="polite"` on approval container |
| Reduced-motion targeting | **Deployed** | `.orb-ring`/`.orb-glow` classes + CSS rules |
| Zero console errors | **Verified** | Checked after each agent click |

---

## Competitive Analysis: NotchOS vs Vibe Island

### What Vibe Island ships that NotchOS doesn't (yet)

| Capability | Vibe Island | NotchOS |
|-----------|------------|---------|
| Real agent integration | 6 agents (Claude, Codex, Gemini, Cursor, OpenCode, Droid) | Mock data only |
| Terminal jump | 13+ terminals, precise tab/split targeting | Not implemented |
| Zero-config hooks | Auto-configures on launch | Manual Tauri setup |
| Sound alerts | 8-bit synthesized, custom packs | None |
| Question answering | Numbered options (⌘1/⌘2/⌘3) for agent questions | Approve/Deny only |
| Plan review | Markdown rendering for plans | Not implemented |
| Native Swift | Under 50MB RAM, Apple Silicon native | Tauri 2 (Rust+WebView) |
| Shipping product | $14.99, free trial, real users | Prototype |

### Where NotchOS is ahead

| Capability | NotchOS | Vibe Island |
|-----------|---------|------------|
| Physics-based design language | Murmuration particles, spacetime grid, gravitational weight | Standard flat UI, no physics metaphors |
| Risk-tier visual density | Three distinct visual weights — you feel the danger before reading | Color badges only |
| Spacetime grid deformation | Canvas warps toward active agent by risk | Static background |
| Metrics dashboard | Context health ring, token count, approval stats, event timeline | No metrics/analytics view |
| Design system coherence | Deep Field: 4 bg layers, orbital animations, signal colors | Clean but conventional |
| Diff rendering | Inline diff with syntax-colored lines | Basic diff in mockup |
| Event timeline | 24-event risk-tier-colored timeline strip | No timeline |
| Cross-platform potential | Tauri 2 (macOS/Windows/Linux) | macOS only |

### Strategic Assessment

**Vibe Island is a shipped product solving a real problem for real users.** They nailed the core loop: see agent status, approve/deny, jump back to terminal. Zero-config is a killer feature. Sound alerts are clever. Six-agent support covers the market.

**NotchOS has a stronger design thesis.** The physics layer is genuinely differentiated. No other tool in this space communicates risk through spatial density, particle behavior, and gravitational deformation. The Deep Field design system is more ambitious than anything in the competitive landscape.

**The gap is real integration, not UI.** NotchOS needs:
1. Tauri IPC hooks for Claude Code, Codex, Gemini CLI
2. Terminal detection and jump-back (AppleScript for iTerm/Terminal, `$TERM_SESSION_ID`)
3. Question answering UI (beyond approve/deny)
4. Sound/notification system
5. Auto-setup on first launch

**The physics layer is a moat.** Nobody else is doing this. Murmuration density as a data encoding, spacetime warping as risk visualization, gravitational weight as decision architecture. This is the kind of design that gets people to switch from a working product.

---

## Baseline

```json
{
  "date": "2026-04-03",
  "url": "http://localhost:5199",
  "healthScore": 91,
  "version": "V1.5",
  "issues": [
    {"id": "QA-V15-001", "title": "TopBar pills missing from ARIA tree", "severity": "medium", "category": "accessibility"},
    {"id": "QA-V15-002", "title": "AgentRoster options not in ARIA tree", "severity": "medium", "category": "accessibility"},
    {"id": "QA-V15-003", "title": "Deny button hidden on mobile", "severity": "low", "category": "visual"},
    {"id": "QA-V15-004", "title": "TopBar text wraps on narrow viewport", "severity": "low", "category": "visual"}
  ],
  "categoryScores": {
    "console": 100, "links": 100, "visual": 85, "functional": 95,
    "ux": 90, "performance": 95, "content": 100, "accessibility": 70
  }
}
```

---

**STATUS: DONE**
**QA found 4 issues. 2 medium (accessibility), 2 low (responsive). Health: 91/100.**
**Competitor Vibe Island ships real integration. NotchOS ships better design. The moat is the physics layer.**
