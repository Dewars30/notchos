# Design Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the top 10 design issues identified by three-way AI review (Claude + Codex + Claude subagent). Transform NotchOS from "nice React app" to "feels like Apple built it."

**Architecture:** Focused fixes across existing components. Framer Motion added for transition physics. No new backend changes.

**Tech Stack:** React 18, TypeScript, Framer Motion, CSS custom properties, Canvas 2D

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `package.json` | Modify | Add framer-motion dependency |
| `src/App.tsx` | Major rewrite | Single shell container, Framer Motion AnimatePresence, auto-collapse |
| `src/styles/index.css` | Modify | Vibrancy, Departure Mono @font-face, focus ring updates |
| `src/fonts/DepartureMono-Regular.woff2` | Create | Bundled font file |
| `src/components/command-center/CommandCenter.tsx` | Modify | Wire SpacetimeGrid props, pass approval state |
| `src/components/command-center/CommandCenter.css` | Modify | Vibrancy backdrop-filter |
| `src/components/shared/StatusOrb.tsx` | Modify | overflow: visible |
| `src/components/command-center/ActiveSession.tsx` | Modify | Approve/deny micro-interactions, activity feed |
| `src/components/command-center/TopBar.tsx` | Modify | Connection status indicator |
| `src/hooks/useSessionBridge.ts` | Modify | Sound triggers on events, connection state |

---

### Task 1: Bundle Departure Mono + Vibrancy + StatusOrb Fix

Quick wins that improve visual quality immediately.

- [ ] Copy Departure Mono .woff2 to `src/fonts/` (user has it locally)
- [ ] Add @font-face to index.css, update --font-label
- [ ] Add backdrop-filter to CommandCenter.css
- [ ] Fix StatusOrb overflow: hidden → visible
- [ ] Verify and commit

### Task 2: Wire SpacetimeGrid Props + Sound Triggers

Connect the physics layer to real data and wire sound events.

- [ ] In CommandCenter.tsx, compute activeAgentCount and hasHighRiskPending from agents prop
- [ ] Pass these to SpacetimeGrid component
- [ ] In useSessionBridge.ts, call playSound() on session state changes
- [ ] Verify and commit

### Task 3: Framer Motion Transitions

The single most impactful change. Replace conditional rendering with animated container.

- [ ] Install framer-motion
- [ ] Rewrite App.tsx to use a single animated shell container
- [ ] Use motion.div with layoutId for shared orb elements
- [ ] Spring physics for width/height transitions
- [ ] AnimatePresence for mode content fade
- [ ] Auto-collapse to pill 1.5s after approve/deny
- [ ] Verify and commit

### Task 4: Activity Feed + Connection Status + Micro-interactions

Fill the idle state, show connection health, polish approve/deny.

- [ ] Create ActivityFeed in ActiveSession for idle agents
- [ ] Add connection status indicator to TopBar (CONNECTING/OFFLINE/DEMO)
- [ ] Add button scale + badge crossfade on approve/deny
- [ ] Verify and commit
