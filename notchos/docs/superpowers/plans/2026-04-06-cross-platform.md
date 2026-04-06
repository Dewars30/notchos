# Cross-Platform (macOS + Windows) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Windows support to NotchOS — same product, same position, same brand on both platforms.

**Architecture:** Platform-conditional IPC transport (Unix sockets on macOS, named pipes on Windows), platform-conditional terminal integration, build config conditionals, and cross-platform keyboard symbol display. 90%+ of the codebase is already cross-platform (React, CSS, SVG, Web Audio). Only 4 targeted changes needed.

**Tech Stack:** Rust (Tauri 2), tokio (async IPC), Node.js (bridge script), TypeScript (React frontend), GitHub Actions (CI matrix)

**Spec:** `docs/superpowers/specs/2026-04-06-cross-platform-design.md`

---

## File Structure

### New Files
```
src-tauri/src/transport.rs              — NEW: platform-conditional IPC transport abstraction
src-tauri/tauri.macos.conf.json         — NEW: macOS-specific config override
src/utils/platform.ts                   — NEW: platform detection + keyboard symbol constants
.github/workflows/release.yml           — NEW: cross-platform CI/CD release pipeline
```

### Modified Files
```
src-tauri/src/lib.rs                    — REFACTOR: use transport module instead of direct UnixListener
src-tauri/Cargo.toml                    — UPDATE: conditional macos-private-api feature
src-tauri/tauri.conf.json               — UPDATE: remove macOSPrivateApi (moved to platform override)
src-tauri/src/terminal.rs               — UPDATE: improve Windows terminal jump implementation
scripts/notchos-bridge.cjs              — UPDATE: platform-conditional socket/pipe connection
src/components/ExpandedPill.tsx          — UPDATE: use MOD_KEY constant
src/components/command-center/ActiveSession.tsx — UPDATE: use MOD_KEY constant
src/components/command-center/QuestionPanel.tsx — UPDATE: use MOD_KEY constant
src/components/command-center/PlanReview.tsx    — UPDATE: use MOD_KEY constant
src/components/ApprovalPanel.tsx         — UPDATE: use MOD_KEY constant
```

---

## Task 1: IPC Transport Abstraction

**Files:**
- Create: `src-tauri/src/transport.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create transport.rs**

Create `src-tauri/src/transport.rs`:

```rust
//! Platform-conditional IPC transport.
//! Unix: domain socket at /tmp/notchos.sock
//! Windows: named pipe at \\.\pipe\notchos

use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

#[cfg(unix)]
mod platform {
    use tokio::net::{UnixListener, UnixStream};

    pub const DISPLAY_NAME: &str = "/tmp/notchos.sock";

    pub struct Listener {
        inner: UnixListener,
    }

    impl Listener {
        pub fn bind() -> std::io::Result<Self> {
            let _ = std::fs::remove_file(DISPLAY_NAME);
            Ok(Self {
                inner: UnixListener::bind(DISPLAY_NAME)?,
            })
        }

        pub async fn accept(&self) -> std::io::Result<Connection> {
            let (stream, _) = self.inner.accept().await?;
            let (reader, writer) = stream.into_split();
            Ok(Connection {
                reader: Box::new(BufReader::new(reader)),
                writer: Box::new(writer),
            })
        }
    }
}

#[cfg(windows)]
mod platform {
    use tokio::net::windows::named_pipe::{ServerOptions, NamedPipeServer};

    pub const PIPE_NAME: &str = r"\\.\pipe\notchos";
    pub const DISPLAY_NAME: &str = r"\\.\pipe\notchos";

    pub struct Listener;

    impl Listener {
        pub fn bind() -> std::io::Result<Self> {
            Ok(Self)
        }

        pub async fn accept(&self) -> std::io::Result<Connection> {
            let server = ServerOptions::new()
                .first_pipe_instance(false)
                .create(PIPE_NAME)?;
            server.connect().await?;
            let (reader, writer) = tokio::io::split(server);
            Ok(Connection {
                reader: Box::new(BufReader::new(reader)),
                writer: Box::new(writer),
            })
        }
    }
}

pub use platform::{Listener, DISPLAY_NAME};

/// A platform-agnostic connection with buffered reader and writer.
pub struct Connection {
    pub reader: Box<dyn tokio::io::AsyncBufRead + Unpin + Send>,
    pub writer: Box<dyn tokio::io::AsyncWrite + Unpin + Send>,
}
```

Note: The Windows named pipe implementation creates a new pipe instance per connection. The `connect().await` blocks until a client connects, then returns the stream. This mirrors the Unix `listener.accept()` pattern.

- [ ] **Step 2: Update lib.rs imports and socket server**

In `src-tauri/src/lib.rs`:

Add the module declaration at the top:
```rust
mod transport;
```

Remove from imports:
```rust
// REMOVE these two:
use tokio::net::{UnixListener, UnixStream};
```

Remove the constant:
```rust
// REMOVE:
const SOCKET_PATH: &str = "/tmp/notchos.sock";
```

Update the `handle_connection` function signature. Currently it takes `UnixStream`. Change to use the transport's Connection type:
```rust
async fn handle_connection(
    conn: transport::Connection,
    app: AppHandle,
    state: Arc<AppState>,
) {
    let mut lines = conn.reader.lines();
    let mut writer = conn.writer;
    // ... rest of function body stays identical, using `writer` and `lines`
}
```

The function body (`while let Ok(Some(line)) = lines.next_line().await { ... }`) remains unchanged since it operates on the `AsyncBufRead` and `AsyncWrite` traits.

Update the socket server spawn block (around line 549-565):
```rust
            // Start IPC server (Unix socket on macOS/Linux, named pipe on Windows)
            tauri::async_runtime::spawn(async move {
                let listener = transport::Listener::bind()
                    .expect("Failed to bind IPC transport");

                loop {
                    match listener.accept().await {
                        Ok(conn) => {
                            let app = app_handle.clone();
                            let s = state_clone.clone();
                            tauri::async_runtime::spawn(async move {
                                handle_connection(conn, app, s).await;
                            });
                        }
                        Err(e) => {
                            eprintln!("IPC accept error: {}", e);
                        }
                    }
                }
            });
```

- [ ] **Step 3: Update bridge script**

In `scripts/notchos-bridge.cjs`, replace the constant and connection logic:

Replace:
```javascript
const SOCKET_PATH = "/tmp/notchos.sock";
```

With:
```javascript
const SOCKET_PATH = process.platform === 'win32'
  ? '\\\\.\\pipe\\notchos'
  : '/tmp/notchos.sock';
```

The rest of the bridge script (JSON protocol, event handling, stdin reading) stays identical. Node.js `net.createConnection()` handles both Unix sockets and Windows named pipes transparently.

- [ ] **Step 4: Build and commit**

```bash
cd src-tauri && cargo check 2>&1 | tail -5
cd .. && npm run build
git add src-tauri/src/transport.rs src-tauri/src/lib.rs scripts/notchos-bridge.cjs
git commit -m "feat: platform-conditional IPC transport (Unix socket + Windows named pipe)"
```

---

## Task 2: Windows Terminal Jump

**Files:**
- Modify: `src-tauri/src/terminal.rs`

- [ ] **Step 1: Replace the Windows terminal jump implementation**

In `src-tauri/src/terminal.rs`, replace the `jump_windows` function (lines 73-83):

```rust
#[cfg(target_os = "windows")]
fn jump_windows(cwd: &str) -> Result<(), String> {
    use std::process::Command;

    // Try Windows Terminal first (modern, most common for developers)
    if Command::new("wt")
        .args(&["-d", cwd])
        .spawn()
        .is_ok()
    {
        return Ok(());
    }

    // Fallback: open PowerShell at the directory
    if Command::new("powershell")
        .args(&["-NoExit", "-Command", &format!("cd '{}'", cwd)])
        .spawn()
        .is_ok()
    {
        return Ok(());
    }

    // Last resort: open cmd
    Command::new("cmd")
        .args(&["/k", &format!("cd /d \"{}\"", cwd)])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Terminal jump failed: {}", e))
}
```

- [ ] **Step 2: Build and commit**

```bash
cd src-tauri && cargo check 2>&1 | tail -5
git add src-tauri/src/terminal.rs
git commit -m "feat: Windows terminal jump — Windows Terminal, PowerShell, cmd fallback"
```

---

## Task 3: Build Configuration + CI Pipeline

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`
- Create: `src-tauri/tauri.macos.conf.json`
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Update Cargo.toml**

Replace the `[dependencies]` tauri line and `[features]` section:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
tokio-stream = "0.1"
uuid = { version = "1", features = ["v4"] }
rusqlite = { version = "0.31", features = ["bundled"] }
dirs = "5"
which = "7"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
macos-private-api = ["tauri/macos-private-api"]
```

The `macos-private-api` feature is now opt-in, not default.

- [ ] **Step 2: Update tauri.conf.json**

Remove the `"macOSPrivateApi": true` line from `src-tauri/tauri.conf.json`. The `"app"` section becomes:

```json
  "app": {
    "windows": [
      {
        "label": "hud",
        "title": "NotchOS",
        "width": 220,
        "height": 48,
        "minWidth": 200,
        "minHeight": 48,
        "resizable": false,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "center": false,
        "x": null,
        "y": 0,
        "visible": true,
        "focus": false,
        "shadow": false
      }
    ],
    "security": {
      "csp": null
    }
  },
```

- [ ] **Step 3: Create tauri.macos.conf.json**

Create `src-tauri/tauri.macos.conf.json`:

```json
{
  "app": {
    "macOSPrivateApi": true
  }
}
```

Tauri 2 auto-merges platform-specific config files.

- [ ] **Step 4: Create GitHub Actions release workflow**

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  build:
    strategy:
      fail-fast: false
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

      - name: Install dependencies
        run: npm ci
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

- [ ] **Step 5: Build and commit**

```bash
cd src-tauri && cargo check 2>&1 | tail -5
cd .. && npm run build
git add src-tauri/Cargo.toml src-tauri/tauri.conf.json src-tauri/tauri.macos.conf.json \
        .github/workflows/release.yml
git commit -m "feat: cross-platform build config + GitHub Actions release pipeline (macOS + Windows)"
```

---

## Task 4: Keyboard Symbol Display

**Files:**
- Create: `src/utils/platform.ts`
- Modify: `src/components/ExpandedPill.tsx`
- Modify: `src/components/command-center/ActiveSession.tsx`
- Modify: `src/components/command-center/QuestionPanel.tsx`
- Modify: `src/components/command-center/PlanReview.tsx`
- Modify: `src/components/ApprovalPanel.tsx`

- [ ] **Step 1: Create platform utility**

Create `src/utils/platform.ts`:

```typescript
// Platform detection for keyboard symbol display

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

export const MOD = isMac ? '⌘' : 'Ctrl+';
export const MOD_SHIFT = isMac ? '⌘⇧' : 'Ctrl+Shift+';
```

- [ ] **Step 2: Update ExpandedPill.tsx**

Add import: `import { MOD_SHIFT } from '../utils/platform';`

Replace `⌘⇧N` with `{MOD_SHIFT}N`.

- [ ] **Step 3: Update ActiveSession.tsx**

Add import: `import { MOD } from '../../utils/platform';`

Replace the two keyboard hint spans:
- `⌘Y` → `{MOD}Y`
- `⌘N` → `{MOD}N`

- [ ] **Step 4: Update QuestionPanel.tsx**

Add import: `import { MOD } from '../../utils/platform';`

Replace `⌘{i + 1}` with `{MOD}{i + 1}`.

- [ ] **Step 5: Update PlanReview.tsx**

Add import: `import { MOD } from '../../utils/platform';`

Replace:
- `⌘Y` → `{MOD}Y`
- `⌘N` → `{MOD}N`

- [ ] **Step 6: Update ApprovalPanel.tsx**

Add import: `import { MOD } from '../../utils/platform';`

Replace:
- `⌘Y` → `{MOD}Y`
- `⌘N` → `{MOD}N`

- [ ] **Step 7: Build and commit**

```bash
npm run build
git add src/utils/platform.ts \
        src/components/ExpandedPill.tsx \
        src/components/command-center/ActiveSession.tsx \
        src/components/command-center/QuestionPanel.tsx \
        src/components/command-center/PlanReview.tsx \
        src/components/ApprovalPanel.tsx
git commit -m "feat: cross-platform keyboard symbols (⌘ on macOS, Ctrl+ on Windows)"
```

---

## Task 5: Final Validation

- [ ] **Step 1: macOS build**

```bash
npm run build
cd src-tauri && cargo build --features macos-private-api
```

Must succeed with zero errors.

- [ ] **Step 2: Verify no regressions**

```bash
npx vite dev --port 5199
```

- All three modes render correctly
- Keyboard symbols show `⌘` on macOS
- Socket communication works (run `node scripts/dev-simulate.cjs basic`)
- Terminal jump works

- [ ] **Step 3: Cross-compile check (if Rust Windows target installed)**

```bash
rustup target add x86_64-pc-windows-msvc 2>/dev/null || true
cd src-tauri && cargo check --target x86_64-pc-windows-msvc 2>&1 | tail -10
```

Note: Full Windows cross-compilation requires Windows SDK. The `cargo check` may fail on macOS without the linker, but the Rust code should compile. The real Windows build happens in GitHub Actions.

- [ ] **Step 4: Push and verify CI**

```bash
git push origin visual-upgrade
```

The release workflow triggers on version tags (`v*`), not on push. For testing, the push verifies the branch is up to date.
