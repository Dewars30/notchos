mod agents;
mod editor;
mod history;
mod terminal;
mod transport;

use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

// ─── Event types matching Claude Code / Codex hook payloads ─────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookEvent {
    pub hook_event_name: String,  // PreToolUse | PostToolUse | Notification | Stop
    pub session_id: String,
    pub tool_name: Option<String>,
    pub tool_input: Option<serde_json::Value>,
    pub tool_response: Option<serde_json::Value>,
    pub message: Option<String>,
    // injected by our bridge
    pub agent: Option<String>,
    // V2 fields
    pub cwd: Option<String>,
    pub question: Option<String>,
    pub options: Option<Vec<String>>,
    pub plan_markdown: Option<String>,
    // Fields from Claude Code (captured for context)
    pub transcript_path: Option<String>,
    pub permission_mode: Option<String>,
    pub tool_use_id: Option<String>,
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
    pub cwd: Option<String>,
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
    pub risk_tier: RiskTier,
}

// ─── Approval response sent back to hook via stdout ─────────────────────────

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalResponse {
    pub decision: String,   // "approve" | "deny"
    pub reason: Option<String>,
}

// ─── Risk classification ────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RiskTier {
    Low,
    Medium,
    High,
}

fn classify_risk(tool: &str, input: &serde_json::Value) -> RiskTier {
    match tool {
        "Bash" => {
            let cmd = input.get("command").and_then(|v| v.as_str()).unwrap_or("");
            if cmd.contains("rm -rf") || cmd.contains("DROP") || cmd.contains("prod")
                || cmd.contains("deploy") || cmd.contains("push --force")
                || cmd.contains("sudo") || cmd.contains("systemctl") {
                RiskTier::High
            } else {
                RiskTier::Medium
            }
        }
        "WebFetch" | "WebSearch" => RiskTier::Medium,
        "Write" | "Edit" | "MultiEdit" | "NotebookEdit" => {
            let path = input.get("file_path").and_then(|v| v.as_str()).unwrap_or("");
            if path.contains("auth") || path.contains("secret") || path.contains(".env")
                || path.contains("config") || path.contains("prod")
                || path.contains("migration") || path.contains("Cargo.toml")
                || path.contains("package.json") {
                RiskTier::High
            } else {
                RiskTier::Medium
            }
        }
        "Read" | "Glob" | "Grep" | "LS" | "TodoRead" | "TaskList" | "TaskGet" => RiskTier::Low,
        _ => RiskTier::Medium,
    }
}

// ─── App state ───────────────────────────────────────────────────────────────

pub struct AppState {
    pub sessions: Mutex<Vec<Session>>,
    pub pending_tx: Mutex<std::collections::HashMap<String, tokio::sync::oneshot::Sender<ApprovalResponse>>>,
    pub history: history::HistoryDb,
    pub bridge_path: Mutex<String>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(Vec::new()),
            pending_tx: Mutex::new(std::collections::HashMap::new()),
            history: history::HistoryDb::open().expect("Failed to open history database"),
            bridge_path: Mutex::new(String::new()),
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

#[tauri::command]
async fn set_window_size(width: f64, height: f64, app: AppHandle) {
    if let Some(win) = app.get_webview_window("hud") {
        let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width,
            height,
        }));
        // Re-center horizontally at top of screen on every resize
        if let Ok(Some(monitor)) = win.current_monitor() {
            let screen_w = monitor.size().width as f64 / monitor.scale_factor();
            let x = (screen_w - width) / 2.0;
            let _ = win.set_position(tauri::Position::Logical(
                tauri::LogicalPosition { x, y: 0.0 }
            ));
        }
    }
}

#[tauri::command]
fn get_session_metrics(state: State<Arc<AppState>>) -> serde_json::Value {
    let sessions = state.sessions.lock().unwrap();
    let total = sessions.len();
    let waiting = sessions.iter().filter(|s| s.status == "waiting").count();
    let running = sessions.iter().filter(|s| s.status == "running").count();
    serde_json::json!({
        "totalSessions": total,
        "waitingSessions": waiting,
        "runningSessions": running,
        "approvalsTotal": 0,
        "approvalsDenied": 0,
        "totalCost": 0.0,
        "totalTokens": 0,
        "contextHealth": 100,
    })
}

// ─── Agent discovery commands ───────────────────────────────────────────────

#[tauri::command]
fn discover_agents(state: State<Arc<AppState>>) -> Vec<agents::DiscoveredAgent> {
    let bridge = state.bridge_path.lock().unwrap().clone();
    agents::discover_all(&bridge)
}

#[tauri::command]
fn setup_agents(state: State<Arc<AppState>>) -> Vec<(String, bool)> {
    let bridge = state.bridge_path.lock().unwrap().clone();
    agents::setup_all(&bridge)
}

// ─── History commands ────────────────────────────────────────────────────────

#[tauri::command]
fn get_history_sessions(limit: Option<i64>, state: State<Arc<AppState>>) -> Vec<history::HistorySession> {
    state.history.get_sessions(limit.unwrap_or(50))
}

#[tauri::command]
fn get_session_events(session_id: String, state: State<Arc<AppState>>) -> Vec<history::HistoryEvent> {
    state.history.get_session_events(&session_id)
}

#[tauri::command]
fn search_history(query: String, state: State<Arc<AppState>>) -> Vec<history::HistorySession> {
    state.history.search_sessions(&query)
}

// ─── Socket server ───────────────────────────────────────────────────────────

async fn handle_connection(
    conn: transport::Connection,
    app: AppHandle,
    state: Arc<AppState>,
) {
    let transport::Connection { mut lines, mut writer } = conn;

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
                    let session = find_or_create(&mut sessions, &event.session_id, &agent, now, event.cwd.clone());
                    session.status = "waiting".into();
                    session.current_tool = Some(tool.clone());
                    session.updated_at = now;
                    session.pending_approval = Some(PendingApproval {
                        approval_id: approval_id.clone(),
                        tool_name: tool.clone(),
                        tool_input: input.clone(),
                        summary: summary.clone(),
                        risk_tier: classify_risk(&tool, &input),
                    });
                }

                // Persist to history (outside sessions lock)
                state.history.upsert_session(&event.session_id, &agent, event.cwd.as_deref(), "waiting", now as i64);
                state.history.record_event(&event.session_id, "approval_requested", Some(&tool), Some(&format!("{:?}", classify_risk(&tool, &input))), Some(&summary), now as i64);

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
                {
                    let mut sessions = state.sessions.lock().unwrap();
                    if let Some(s) = sessions.iter_mut().find(|s| s.id == event.session_id) {
                        s.status = "running".into();
                        s.current_tool = event.tool_name.clone();
                        s.updated_at = now;
                        s.pending_approval = None;
                    }
                }

                // Persist to history (outside sessions lock)
                state.history.upsert_session(&event.session_id, &agent, event.cwd.as_deref(), "running", now as i64);
                state.history.record_event(&event.session_id, "tool_use", event.tool_name.as_deref(), None, None, now as i64);

                let _ = app.emit("sessions_updated", ());
                let _ = writer.write_all(b"\n").await;
            }

            "AskUser" => {
                let (tx, rx) = tokio::sync::oneshot::channel::<ApprovalResponse>();
                let question_id = Uuid::new_v4().to_string();

                {
                    let mut pending = state.pending_tx.lock().unwrap();
                    pending.insert(question_id.clone(), tx);
                }

                {
                    let mut sessions = state.sessions.lock().unwrap();
                    let session = find_or_create(&mut sessions, &event.session_id, &agent, now, event.cwd.clone());
                    session.status = "waiting".into();
                    session.updated_at = now;
                }

                let _ = app.emit("sessions_updated", ());
                let _ = app.emit("ask_user", serde_json::json!({
                    "questionId": question_id,
                    "sessionId": event.session_id,
                    "question": event.question,
                    "options": event.options,
                }));

                match rx.await {
                    Ok(resp) => {
                        let json = serde_json::to_string(&resp).unwrap_or_default();
                        let _ = writer.write_all(format!("{}\n", json).as_bytes()).await;
                    }
                    Err(_) => {
                        let _ = writer.write_all(b"{\"decision\":\"deny\"}\n").await;
                    }
                }
            }

            "PlanReview" => {
                let (tx, rx) = tokio::sync::oneshot::channel::<ApprovalResponse>();
                let review_id = Uuid::new_v4().to_string();

                {
                    let mut pending = state.pending_tx.lock().unwrap();
                    pending.insert(review_id.clone(), tx);
                }

                {
                    let mut sessions = state.sessions.lock().unwrap();
                    let session = find_or_create(&mut sessions, &event.session_id, &agent, now, event.cwd.clone());
                    session.status = "waiting".into();
                    session.updated_at = now;
                }

                let _ = app.emit("sessions_updated", ());
                let _ = app.emit("plan_review", serde_json::json!({
                    "reviewId": review_id,
                    "sessionId": event.session_id,
                    "planMarkdown": event.plan_markdown,
                }));

                match rx.await {
                    Ok(resp) => {
                        let json = serde_json::to_string(&resp).unwrap_or_default();
                        let _ = writer.write_all(format!("{}\n", json).as_bytes()).await;
                    }
                    Err(_) => {
                        let _ = writer.write_all(b"{\"decision\":\"deny\"}\n").await;
                    }
                }
            }

            "Notification" | "Stop" => {
                {
                    let mut sessions = state.sessions.lock().unwrap();
                    let session = find_or_create(&mut sessions, &event.session_id, &agent, now, event.cwd.clone());
                    session.last_message = event.message.clone();
                    session.updated_at = now;
                    if event.hook_event_name == "Stop" {
                        session.status = "done".into();
                        session.current_tool = None;
                    }
                }

                // Persist to history (outside sessions lock)
                let status = if event.hook_event_name == "Stop" { "done" } else { "running" };
                state.history.upsert_session(&event.session_id, &agent, event.cwd.as_deref(), status, now as i64);
                state.history.record_event(&event.session_id, &event.hook_event_name.to_lowercase(), None, None, event.message.as_deref(), now as i64);

                let _ = app.emit("sessions_updated", ());
                let _ = writer.write_all(b"\n").await;
            }

            _ => {
                let _ = writer.write_all(b"\n").await;
            }
        }
    }
}

fn find_or_create<'a>(sessions: &'a mut Vec<Session>, session_id: &str, agent: &str, now: u64, cwd: Option<String>) -> &'a mut Session {
    if let Some(pos) = sessions.iter().position(|s| s.id == session_id) {
        let session = &mut sessions[pos];
        if cwd.is_some() {
            session.cwd = cwd;
        }
        return session;
    }
    sessions.push(Session {
        id: session_id.to_string(),
        agent: agent.to_string(),
        status: "running".into(),
        current_tool: None,
        pending_approval: None,
        last_message: None,
        cwd,
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

            // Position window at top-center (in the macOS notch area)
            if let Some(win) = app.get_webview_window("hud") {
                if let Ok(monitor) = win.current_monitor() {
                    if let Some(monitor) = monitor {
                        let screen_w = monitor.size().width as f64 / monitor.scale_factor();
                        let win_w = 220.0;
                        let x = (screen_w - win_w) / 2.0;
                        let _ = win.set_position(tauri::Position::Logical(
                            tauri::LogicalPosition { x, y: 0.0 }
                        ));
                    }
                }
            }

            // Set bridge path — always use ~/.notchos/bin/notchos-bridge.cjs
            // If missing, write the embedded bridge script
            {
                let mut bp = state_clone.bridge_path.lock().unwrap();
                let home_bridge = dirs::home_dir()
                    .unwrap_or_default()
                    .join(".notchos/bin/notchos-bridge.cjs");

                // Self-install: if bridge doesn't exist, write it from embedded content
                if !home_bridge.exists() {
                    let _ = std::fs::create_dir_all(home_bridge.parent().unwrap());
                    let bridge_content = include_str!("../../scripts/notchos-bridge.cjs");
                    let _ = std::fs::write(&home_bridge, bridge_content);
                }

                *bp = home_bridge.to_string_lossy().to_string();
            }

            // Start IPC server (Unix socket on macOS/Linux, named pipe on Windows)
            tauri::async_runtime::spawn(async move {
                let listener = transport::Listener::bind()
                    .expect("Failed to bind IPC listener");

                loop {
                    if let Ok(conn) = listener.accept().await {
                        let app = app_handle.clone();
                        let s = state_clone.clone();
                        tauri::async_runtime::spawn(async move {
                            handle_connection(conn, app, s).await;
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
            set_window_size,
            get_session_metrics,
            discover_agents,
            setup_agents,
            get_history_sessions,
            get_session_events,
            search_history,
            editor::open_in_editor,
            editor::reveal_in_file_manager,
            terminal::jump_to_terminal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
