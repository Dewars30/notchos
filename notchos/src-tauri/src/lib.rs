use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{UnixListener, UnixStream};
use uuid::Uuid;

// ─── Event types matching Claude Code / Codex hook payloads ─────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HookEvent {
    pub hook_event_name: String,  // PreToolUse | PostToolUse | Notification | Stop
    pub session_id: String,
    pub tool_name: Option<String>,
    pub tool_input: Option<serde_json::Value>,
    pub tool_response: Option<serde_json::Value>,
    pub message: Option<String>,
    // injected by our bridge
    pub agent: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub agent: String,          // "claude" | "codex" | "gemini"
    pub status: String,         // "running" | "waiting" | "done" | "error"
    pub current_tool: Option<String>,
    pub pending_approval: Option<PendingApproval>,
    pub last_message: Option<String>,
    pub started_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingApproval {
    pub approval_id: String,
    pub tool_name: String,
    pub tool_input: serde_json::Value,
    pub summary: String,
}

// ─── Approval response sent back to hook via stdout ─────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalResponse {
    pub decision: String,   // "approve" | "deny"
    pub reason: Option<String>,
}

// ─── App state ───────────────────────────────────────────────────────────────

pub struct AppState {
    pub sessions: Mutex<Vec<Session>>,
    pub pending_tx: Mutex<std::collections::HashMap<String, tokio::sync::oneshot::Sender<ApprovalResponse>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(Vec::new()),
            pending_tx: Mutex::new(std::collections::HashMap::new()),
        }
    }
}

// ─── Tauri commands (called from React) ─────────────────────────────────────

#[tauri::command]
fn get_sessions(state: State<Arc<AppState>>) -> Vec<Session> {
    state.sessions.lock().unwrap().clone()
}

#[tauri::command]
fn approve(approval_id: String, reason: Option<String>, state: State<Arc<AppState>>) {
    let mut pending = state.pending_tx.lock().unwrap();
    if let Some(tx) = pending.remove(&approval_id) {
        let _ = tx.send(ApprovalResponse {
            decision: "approve".into(),
            reason,
        });
    }
    // Update session status
    let mut sessions = state.sessions.lock().unwrap();
    for s in sessions.iter_mut() {
        if let Some(ref pa) = s.pending_approval.clone() {
            if pa.approval_id == approval_id {
                s.pending_approval = None;
                s.status = "running".into();
            }
        }
    }
}

#[tauri::command]
fn deny(approval_id: String, reason: Option<String>, state: State<Arc<AppState>>) {
    let mut pending = state.pending_tx.lock().unwrap();
    if let Some(tx) = pending.remove(&approval_id) {
        let _ = tx.send(ApprovalResponse {
            decision: "deny".into(),
            reason,
        });
    }
    let mut sessions = state.sessions.lock().unwrap();
    for s in sessions.iter_mut() {
        if let Some(ref pa) = s.pending_approval.clone() {
            if pa.approval_id == approval_id {
                s.pending_approval = None;
                s.status = "running".into();
            }
        }
    }
}

#[tauri::command]
fn dismiss_session(session_id: String, state: State<Arc<AppState>>) {
    let mut sessions = state.sessions.lock().unwrap();
    sessions.retain(|s| s.id != session_id);
}

#[tauri::command]
async fn set_window_height(height: f64, app: AppHandle) {
    if let Some(win) = app.get_webview_window("hud") {
        let _ = win.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: 640,
            height: height as u32,
        }));
    }
}

// ─── Socket server ───────────────────────────────────────────────────────────

const SOCKET_PATH: &str = "/tmp/notchos.sock";

async fn handle_connection(
    stream: UnixStream,
    app: AppHandle,
    state: Arc<AppState>,
) {
    let (reader, mut writer) = stream.into_split();
    let mut lines = BufReader::new(reader).lines();

    while let Ok(Some(line)) = lines.next_line().await {
        let Ok(event) = serde_json::from_str::<HookEvent>(&line) else {
            continue;
        };

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let agent = event.agent.clone().unwrap_or_else(|| "claude".into());

        match event.hook_event_name.as_str() {
            "PreToolUse" => {
                let tool = event.tool_name.clone().unwrap_or_default();
                let input = event.tool_input.clone().unwrap_or(serde_json::Value::Null);
                let summary = summarize_tool_use(&tool, &input);
                let approval_id = Uuid::new_v4().to_string();

                // Block on approval — create oneshot channel
                let (tx, rx) = tokio::sync::oneshot::channel::<ApprovalResponse>();

                {
                    let mut pending = state.pending_tx.lock().unwrap();
                    pending.insert(approval_id.clone(), tx);
                }

                // Upsert session
                {
                    let mut sessions = state.sessions.lock().unwrap();
                    let session = find_or_create(&mut sessions, &event.session_id, &agent, now);
                    session.status = "waiting".into();
                    session.current_tool = Some(tool.clone());
                    session.updated_at = now;
                    session.pending_approval = Some(PendingApproval {
                        approval_id: approval_id.clone(),
                        tool_name: tool,
                        tool_input: input,
                        summary,
                    });
                }

                let _ = app.emit("sessions_updated", ());

                // Wait for decision (blocking this connection)
                match rx.await {
                    Ok(resp) => {
                        // Write response back to hook process on stdout
                        let json = serde_json::to_string(&resp).unwrap_or_default();
                        let _ = writer.write_all(format!("{}\n", json).as_bytes()).await;
                    }
                    Err(_) => {
                        // App closed — deny by default
                        let _ = writer.write_all(b"{\"decision\":\"deny\"}\n").await;
                    }
                }
            }

            "PostToolUse" => {
                let mut sessions = state.sessions.lock().unwrap();
                if let Some(s) = sessions.iter_mut().find(|s| s.id == event.session_id) {
                    s.status = "running".into();
                    s.current_tool = event.tool_name.clone();
                    s.updated_at = now;
                    s.pending_approval = None;
                }
                let _ = app.emit("sessions_updated", ());
                let _ = writer.write_all(b"\n").await;
            }

            "Notification" | "Stop" => {
                let mut sessions = state.sessions.lock().unwrap();
                let session = find_or_create(&mut sessions, &event.session_id, &agent, now);
                session.last_message = event.message.clone();
                session.updated_at = now;
                if event.hook_event_name == "Stop" {
                    session.status = "done".into();
                    session.current_tool = None;
                }
                let _ = app.emit("sessions_updated", ());
                let _ = writer.write_all(b"\n").await;
            }

            _ => {
                let _ = writer.write_all(b"\n").await;
            }
        }
    }
}

fn find_or_create<'a>(sessions: &'a mut Vec<Session>, session_id: &str, agent: &str, now: u64) -> &'a mut Session {
    if let Some(pos) = sessions.iter().position(|s| s.id == session_id) {
        return &mut sessions[pos];
    }
    sessions.push(Session {
        id: session_id.to_string(),
        agent: agent.to_string(),
        status: "running".into(),
        current_tool: None,
        pending_approval: None,
        last_message: None,
        started_at: now,
        updated_at: now,
    });
    sessions.last_mut().unwrap()
}

fn summarize_tool_use(tool: &str, input: &serde_json::Value) -> String {
    match tool {
        "Write" | "Edit" | "MultiEdit" => {
            let path = input.get("file_path")
                .or_else(|| input.get("path"))
                .and_then(|v| v.as_str())
                .unwrap_or("unknown file");
            format!("Edit {}", shorten_path(path))
        }
        "Bash" => {
            let cmd = input.get("command")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            format!("Bash: {}", &cmd[..cmd.len().min(60)])
        }
        "Read" => {
            let path = input.get("file_path")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown file");
            format!("Read {}", shorten_path(path))
        }
        "WebFetch" => {
            let url = input.get("url")
                .and_then(|v| v.as_str())
                .unwrap_or("url");
            format!("Fetch {}", url)
        }
        _ => format!("{} tool call", tool),
    }
}

fn shorten_path(path: &str) -> String {
    path.split('/').last().unwrap_or(path).to_string()
}

// ─── Run ─────────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = Arc::new(AppState::new());
    let state_clone = state.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .setup(move |app| {
            let app_handle = app.handle().clone();

            // Position window at top-center
            if let Some(win) = app.get_webview_window("hud") {
                if let Ok(monitor) = win.current_monitor() {
                    if let Some(monitor) = monitor {
                        let screen_w = monitor.size().width as f64 / monitor.scale_factor();
                        let win_w = 640.0;
                        let x = ((screen_w - win_w) / 2.0) as i32;
                        let _ = win.set_position(tauri::Position::Physical(
                            tauri::PhysicalPosition { x, y: 0 }
                        ));
                    }
                }
            }

            // Start Unix socket server
            tokio::spawn(async move {
                // Remove stale socket
                let _ = std::fs::remove_file(SOCKET_PATH);
                let listener = UnixListener::bind(SOCKET_PATH)
                    .expect("Failed to bind socket");

                loop {
                    if let Ok((stream, _)) = listener.accept().await {
                        let app = app_handle.clone();
                        let s = state_clone.clone();
                        tokio::spawn(async move {
                            handle_connection(stream, app, s).await;
                        });
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_sessions,
            approve,
            deny,
            dismiss_session,
            set_window_height,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
