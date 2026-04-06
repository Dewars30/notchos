# Cross-Platform Support (macOS + Windows) — Design Spec

> **Context:** NotchOS is currently macOS-only. This spec adds Windows support to reach the full desktop developer market. Tauri 2 already handles cross-platform windowing and packaging. The actual platform-specific surface is small: IPC transport, terminal integration, build config, and keyboard symbols.
>
> **Philosophy:** Same product, same position, same brand on both platforms. The notch bar floats at top-center on Windows exactly like macOS — no compromises, no "Windows version." The only differences are transport-layer plumbing and OS-native integration points.
>
> **Constraint:** No feature regressions on macOS. All changes are additive (new platform conditionals) or refactors (extracting transport abstraction). The React frontend is untouched except for keyboard symbol display.

---

## 1. IPC Transport Abstraction

### Problem
`src-tauri/src/lib.rs` uses `tokio::net::UnixListener`/`UnixStream` for hook communication. `scripts/notchos-bridge.cjs` connects to `/tmp/notchos.sock`. Neither exists on Windows.

### Design

**New file: `src-tauri/src/transport.rs`**

Create a platform-conditional transport module that abstracts the listener/stream.

```rust
// Platform-conditional IPC transport

#[cfg(unix)]
mod platform {
    use tokio::net::{UnixListener, UnixStream};
    
    pub async fn create_listener() -> std::io::Result<UnixListener> {
        let path = "/tmp/notchos.sock";
        let _ = std::fs::remove_file(path);
        UnixListener::bind(path)
    }
    
    // UnixStream implements AsyncRead + AsyncWrite
    pub type ClientStream = UnixStream;
}

#[cfg(windows)]
mod platform {
    use tokio::net::windows::named_pipe::{ServerOptions, NamedPipeServer};
    
    pub const PIPE_NAME: &str = r"\\.\pipe\notchos";
    
    pub async fn create_listener() -> std::io::Result<NamedPipeServer> {
        ServerOptions::new()
            .first_pipe_instance(true)
            .create(PIPE_NAME)
    }
    
    pub type ClientStream = NamedPipeServer;
}

pub use platform::*;
```

**Modification: `src-tauri/src/lib.rs`**

Replace direct `UnixListener::bind` with `transport::create_listener()`. The JSON-lines protocol and event handling remain identical — only the byte stream source changes.

The `accept()` loop needs a slight abstraction since Windows named pipes use a different accept pattern (create a new pipe instance after each connection) vs Unix sockets (`listener.accept()`). Wrap this in an `async fn accept_connection()` in the transport module.

**Modification: `scripts/notchos-bridge.cjs`**

Add platform detection at the connection point:

```javascript
const net = require('net');

function connect() {
  if (process.platform === 'win32') {
    return net.createConnection('\\\\.\\pipe\\notchos');
  }
  return net.createConnection('/tmp/notchos.sock');
}

const socket = connect();
```

The rest of the bridge script (JSON serialization, event formatting, hook protocol) stays identical. Node.js `net` module handles both Unix sockets and Windows named pipes with the same stream API.

### Testing
- macOS: verify existing socket communication still works (run `node scripts/dev-simulate.cjs basic`)
- Windows: verify named pipe connection (test on Windows machine or GitHub Actions)

---

## 2. Terminal Jump — Windows Implementation

### Problem
`src-tauri/src/terminal.rs` uses AppleScript (`osascript`) to control iTerm2 and Terminal.app. This is fully macOS-specific.

### Design

The file already has a partial Windows stub. Expand it:

**`src-tauri/src/terminal.rs` — Windows implementation:**

```rust
#[cfg(target_os = "windows")]
pub fn jump_to_terminal(cwd: &str) -> Result<(), String> {
    use std::process::Command;
    
    // Try Windows Terminal first (modern, most common for developers)
    let wt_result = Command::new("wt")
        .args(&["-d", cwd])
        .spawn();
    
    if wt_result.is_ok() {
        return Ok(());
    }
    
    // Fallback: open PowerShell at the directory
    Command::new("powershell")
        .args(&["-NoExit", "-Command", &format!("cd '{}'", cwd)])
        .spawn()
        .map_err(|e| format!("Failed to open terminal: {}", e))?;
    
    Ok(())
}
```

The macOS implementation stays behind `#[cfg(target_os = "macos")]` unchanged.

### Graceful degradation
If no terminal is detected, open a new terminal window at the agent's working directory. The user can navigate from there. This is better than failing silently.

---

## 3. Build Configuration — Platform Conditionals

### Problem
`Cargo.toml` has `features = ["macos-private-api"]` and `tauri.conf.json` has `"macOSPrivateApi": true`. These are macOS-specific and cause issues on Windows builds.

### Design

**`src-tauri/Cargo.toml`:**

Move `macos-private-api` to a feature that's conditionally enabled:

```toml
[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
macos-private-api = ["tauri/macos-private-api"]
```

The build command uses `--features macos-private-api` on macOS and omits it on Windows.

**`src-tauri/tauri.conf.json`:**

Remove `"macOSPrivateApi": true` from the base config. Create a platform override file:

**New file: `src-tauri/tauri.macos.conf.json`:**
```json
{
  "app": {
    "macOSPrivateApi": true
  }
}
```

Tauri 2 automatically merges platform-specific config files.

**GitHub Actions release workflow (`.github/workflows/release.yml`):**

```yaml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-latest
            target: aarch64-apple-darwin
            features: --features macos-private-api
          - os: macos-latest
            target: x86_64-apple-darwin
            features: --features macos-private-api
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            features: ""
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}
      
      - run: npm ci
        working-directory: notchos
      
      - uses: tauri-apps/tauri-action@v0
        with:
          projectPath: notchos
          tagName: v__VERSION__
          releaseName: 'NotchOS v__VERSION__'
          releaseBody: 'Air traffic control for your AI agents.'
          releaseDraft: true
          args: ${{ matrix.features }} --target ${{ matrix.target }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This produces: `.dmg` (macOS ARM + Intel), `.msi` (Windows x64).

---

## 4. Window Positioning + Keyboard Symbols

### Window Positioning

The window already positions at top-center via `set_window_size` in `lib.rs`. On Windows:

- Same position: top-center, y=0 (or offset by taskbar height if taskbar is at top)
- `always_on_top: true` already configured
- `transparent: true` + `decorations: false` already configured
- WebView2 (Windows) supports `backdrop-filter` CSS — the glass effect works

**Tauri window config addition for Windows taskbar detection:**

```rust
#[cfg(target_os = "windows")]
fn get_taskbar_offset() -> i32 {
    // Windows taskbar is at bottom by default — offset is 0
    // If at top, offset by taskbar height (~40px)
    // For now, assume bottom taskbar (most common)
    0
}
```

This is a simplification. Full taskbar detection can be added later if users report issues.

### Keyboard Symbols

The frontend uses `⌘` symbols in the UI. On Windows, these should show `Ctrl+`.

**New utility: `src/utils/platform.ts`:**

```typescript
export const IS_MAC = navigator.platform.includes('Mac');
export const MOD_KEY = IS_MAC ? '⌘' : 'Ctrl+';
export const MOD_SHIFT_KEY = IS_MAC ? '⌘⇧' : 'Ctrl+Shift+';
```

**Files to update:**
- `src/components/ExpandedPill.tsx` — footer shows `⌘⇧N`
- `src/components/command-center/ActiveSession.tsx` — approve/deny hints show `⌘Y`/`⌘N`
- `src/components/command-center/PlanReview.tsx` — same approve/deny hints
- `src/components/command-center/QuestionPanel.tsx` — option shortcuts show `⌘1`/`⌘2`

Replace hardcoded `⌘` with `MOD_KEY` from the utility.

---

## What Does NOT Change

- **All React components** — platform-agnostic
- **All CSS modules** — platform-agnostic
- **Design tokens** — platform-agnostic
- **SVG gauges, StatusOrb arcs** — platform-agnostic
- **Framer Motion animations** — platform-agnostic
- **Sound engine** — Web Audio API works in WebView2
- **Editor integration** (`editor.rs`) — already has Windows support
- **File manager** (`editor.rs`) — already uses `explorer /select,`
- **History database** — `dirs::home_dir()` is cross-platform
- **Bridge self-install** — `dirs::home_dir()` handles Windows paths

---

## Validation

After implementation:

1. **macOS build:** `npx tauri build` produces `.dmg`, no regressions
2. **Windows build:** `npx tauri build --target x86_64-pc-windows-msvc` produces `.msi`
3. **Socket communication:** `node scripts/dev-simulate.cjs basic` works on both platforms
4. **Terminal jump:** opens Windows Terminal or PowerShell fallback on Windows
5. **Keyboard hints:** show `Ctrl+` on Windows, `⌘` on macOS
6. **Glass effect:** `backdrop-filter` renders in WebView2
7. **CI/CD:** GitHub Actions produces all three artifacts (macOS ARM, macOS Intel, Windows)
