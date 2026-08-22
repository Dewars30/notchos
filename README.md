# NotchOS

**Air traffic control for AI coding agents on macOS.**

NotchOS is a native desktop control surface for monitoring Claude Code, Codex CLI, and Gemini CLI from one floating interface. It surfaces approvals, plans, agent questions, session history, terminal jumps, and cost signals without forcing a context switch back to every terminal.

Built with Tauri 2, Rust, React, and TypeScript.

## What it does

- Discovers supported coding agents and connects through their hook systems.
- Shows live status across concurrent sessions and project teams.
- Brings permission requests, questions, and plan reviews into one approval surface.
- Persists searchable session history locally with SQLite.
- Jumps back to the correct terminal or editor context.
- Uses a three-mode interface that expands from notch bar to command center.

## Build from source

Requirements: macOS, Node.js 18+, Rust, and Xcode Command Line Tools.

```bash
git clone https://github.com/Dewars30/notchos.git
cd notchos/notchos
npm install
npx tauri build
```

The built application is written to `src-tauri/target/release/bundle/macos/NotchOS.app`.

[Full feature, architecture, and development documentation](./notchos/README.md)

## License

MIT
