# NotchOS — Creative Brief

> **Design system:** See `DESIGN.md` for the canonical specification.
> **Stitch integration:** See `.stitch/DESIGN.md` for the Stitch-optimized design system.

## What it is

A macOS desktop app (Tauri 2: Rust backend + React frontend) that monitors and controls AI coding agents — Claude Code, Codex, Gemini CLI — from a single floating interface. Air traffic control for your AI agents.

## The problem it solves

Developers running multiple AI coding agents have no unified way to see what's happening, approve tool use, or understand cost and risk without context-switching to each terminal. Existing tools (Vibe Island) are thin notification bars. We're building a command center.

## Design direction: "Deep Field"

Named for the Hubble/JWST deep field images. Cool darkness with warm light. Mathematical fabric, not void. Physics-based information architecture where the physics encodes real agent state — not decoration.

All design tokens, typography, spacing, physics layer, mode transitions, and implementation details are in `DESIGN.md`.

## Execution workflow

1. Design screens in Google Stitch using `.stitch/DESIGN.md` as the design system
2. Stitch MCP connects to Claude Code (see DESIGN.md § Stitch MCP Integration)
3. Claude Code fetches designs via MCP and converts to React/TypeScript components
4. Build in Tauri 2 (Rust + React) — native macOS, not Electron
5. Target: under 50MB RAM, instant response to approval events

## The bar

Match Vibe Island's core functionality (monitoring, approval, terminal jump) but differentiate on: command center depth, smart approval tiers, cost visibility, physics-based design language, and a three-mode decompression architecture that subsumes their entire product as our transition state.
