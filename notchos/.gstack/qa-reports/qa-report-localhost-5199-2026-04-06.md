# QA Report: NotchOS Visual Upgrade

**URL:** http://localhost:5199
**Date:** 2026-04-06
**Branch:** visual-upgrade (26 commits vs main)
**Duration:** ~15 minutes
**Mode:** Diff-aware (full visual upgrade)
**Framework:** React 18 + Vite 5 (SPA, Tauri shell)

---

## Summary

| Metric | Value |
|--------|-------|
| Pages/modes tested | 3 (Notch, Pill, Command Center) |
| Issues found | 1 |
| Fixes applied | 1 (verified) |
| Deferred | 0 |
| Console errors (before) | 16 (SVG attribute errors) |
| Console errors (after) | 0 |

**Health Score: 92/100**

---

## Issues

### ISSUE-001: RadialGauge SVG circle cx/cy undefined on initial render
- **Severity:** High
- **Category:** Console / Functional
- **Fix Status:** verified
- **Commit:** `17f264e`

**Description:** Every time the RadialGauge rendered (2 gauges = 4 circle errors per load), the browser console logged `Error: <circle> attribute cx: Expected length, "undefined"`. Framer Motion's `motion.circle` with both static `cx={dotX}` props and `animate={{ cx: dotX }}` briefly set cx/cy to undefined before the animation engine initialized.

**Fix:** Replaced static `cx`/`cy` props with `initial={{ cx: dotX, cy: dotY, fill: dotColor }}` so Framer Motion has the starting values from the first frame.

**Before:** 4 SVG attribute errors per page load
**After:** 0 console errors

---

## Functional Testing

| Test | Result | Notes |
|------|--------|-------|
| Notch → Pill transition | PASS | Click expands smoothly, activity bar visible |
| Pill → Command Center | PASS | Agent click opens CC, orbs animate via layoutId |
| CC → Pill collapse bar | PASS | Thin bar in top right, collapses to pill |
| Pill → Notch auto-collapse | PASS | Mouse leave triggers 300ms timer |
| Agent switching in CC | PASS | TopBar pills and roster selection work |
| Keyboard: Esc | PASS | Collapses CC → pill → notch |
| RadialGauge (CTX) | PASS | 270-degree arc visible, teal zone active, dot positioned |
| RadialGauge (BURN) | PASS | Smaller 48px gauge, gold zone for partial burn |
| StatusOrb arc indicators | PASS | SVG arcs rotating per status type |
| SpacetimeGrid overlay | PASS | Concentric rings + crosshair visible behind grid |
| EventTimeline strip chart | PASS | Colored bars + skyline path + baseline visible |
| NotchBar pending pulse | PASS | Gold glow animation cycles |
| NotchBar activity bar | PASS | Green bar breathes when agents active |
| Mute button | PASS | Toggles SND/MUTED text |

## Visual Assessment

| Element | Status | Notes |
|---------|--------|-------|
| Glass vibrancy | Good | Deep dark base, proper transparency layering |
| Text contrast | Good | Warm cream palette, zone labels readable |
| Agent roster separation | Good | Left rail visually distinct from center |
| Metrics rail | Good | Gauges, token count, approvals all legible |
| Timeline baseline | Good | Subtle wire grounds the bar chart |
| Grid rings | Good | Concentric circles + crosshair visible at 0.04+ opacity |

## Console Health

**Before fix:** 16 errors (all SVG attribute warnings from RadialGauge)
**After fix:** 0 errors

---

## Top 3 Things to Fix

1. ~~ISSUE-001: RadialGauge cx/cy undefined~~ **FIXED**
2. No remaining critical issues
3. Consider: pill auto-collapse timer can fire during CC expansion in edge cases (mitigated by mode check, but worth watching in Tauri where window resizing interacts with mouse events)

---

**QA found 1 issue, fixed 1, health score 92.**
