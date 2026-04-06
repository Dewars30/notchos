use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistorySession {
    pub id: String,
    pub agent: String,
    pub cwd: Option<String>,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub status: String,
    pub event_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEvent {
    pub id: i64,
    pub session_id: String,
    pub timestamp: i64,
    pub event_type: String,
    pub tool_name: Option<String>,
    pub risk_tier: Option<String>,
    pub summary: Option<String>,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cost_estimate: f64,
}

pub struct HistoryDb {
    conn: Mutex<Connection>,
}

impl HistoryDb {
    pub fn open() -> Result<Self, String> {
        let db_path = dirs::home_dir()
            .map(|h| {
                let dir = h.join(".notchos");
                let _ = std::fs::create_dir_all(&dir);
                dir.join("history.db").to_string_lossy().to_string()
            })
            .unwrap_or_else(|| "/tmp/notchos-history.db".to_string());

        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open history db: {}", e))?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                agent TEXT NOT NULL,
                cwd TEXT,
                started_at INTEGER NOT NULL,
                ended_at INTEGER,
                status TEXT DEFAULT 'running'
            );
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                tool_name TEXT,
                risk_tier TEXT,
                summary TEXT,
                input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0,
                cost_estimate REAL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_cwd ON sessions(cwd);"
        ).map_err(|e| format!("Failed to init tables: {}", e))?;

        // Migration: add cost columns if they don't exist (safe to ignore errors)
        let _ = conn.execute("ALTER TABLE events ADD COLUMN input_tokens INTEGER DEFAULT 0", []);
        let _ = conn.execute("ALTER TABLE events ADD COLUMN output_tokens INTEGER DEFAULT 0", []);
        let _ = conn.execute("ALTER TABLE events ADD COLUMN cost_estimate REAL DEFAULT 0", []);

        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn upsert_session(&self, id: &str, agent: &str, cwd: Option<&str>, status: &str, now: i64) {
        let conn = self.conn.lock().unwrap();
        let _ = conn.execute(
            "INSERT INTO sessions (id, agent, cwd, started_at, status) VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET status = ?5, ended_at = CASE WHEN ?5 = 'done' THEN ?4 ELSE ended_at END",
            params![id, agent, cwd, now, status],
        );
    }

    pub fn record_event(&self, session_id: &str, event_type: &str, tool_name: Option<&str>, risk_tier: Option<&str>, summary: Option<&str>, input_tokens: i64, output_tokens: i64, cost_estimate: f64, now: i64) {
        let conn = self.conn.lock().unwrap();
        let _ = conn.execute(
            "INSERT INTO events (session_id, timestamp, event_type, tool_name, risk_tier, summary, input_tokens, output_tokens, cost_estimate) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![session_id, now, event_type, tool_name, risk_tier, summary, input_tokens, output_tokens, cost_estimate],
        );
    }

    pub fn get_sessions(&self, limit: i64) -> Vec<HistorySession> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT s.id, s.agent, s.cwd, s.started_at, s.ended_at, s.status,
                    (SELECT COUNT(*) FROM events WHERE session_id = s.id) as event_count
             FROM sessions s ORDER BY s.started_at DESC LIMIT ?1"
        ).unwrap();

        stmt.query_map(params![limit], |row| {
            Ok(HistorySession {
                id: row.get(0)?,
                agent: row.get(1)?,
                cwd: row.get(2)?,
                started_at: row.get(3)?,
                ended_at: row.get(4)?,
                status: row.get(5)?,
                event_count: row.get(6)?,
            })
        }).unwrap().filter_map(|r| r.ok()).collect()
    }

    pub fn get_session_events(&self, session_id: &str) -> Vec<HistoryEvent> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, session_id, timestamp, event_type, tool_name, risk_tier, summary, input_tokens, output_tokens, cost_estimate
             FROM events WHERE session_id = ?1 ORDER BY timestamp ASC"
        ).unwrap();

        stmt.query_map(params![session_id], |row| {
            Ok(HistoryEvent {
                id: row.get(0)?,
                session_id: row.get(1)?,
                timestamp: row.get(2)?,
                event_type: row.get(3)?,
                tool_name: row.get(4)?,
                risk_tier: row.get(5)?,
                summary: row.get(6)?,
                input_tokens: row.get::<_, Option<i64>>(7)?.unwrap_or(0),
                output_tokens: row.get::<_, Option<i64>>(8)?.unwrap_or(0),
                cost_estimate: row.get::<_, Option<f64>>(9)?.unwrap_or(0.0),
            })
        }).unwrap().filter_map(|r| r.ok()).collect()
    }

    pub fn search_sessions(&self, query: &str) -> Vec<HistorySession> {
        let conn = self.conn.lock().unwrap();
        let pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT s.id, s.agent, s.cwd, s.started_at, s.ended_at, s.status,
                    (SELECT COUNT(*) FROM events WHERE session_id = s.id) as event_count
             FROM sessions s
             WHERE s.agent LIKE ?1 OR s.cwd LIKE ?1 OR s.id LIKE ?1
             ORDER BY s.started_at DESC LIMIT 50"
        ).unwrap();

        stmt.query_map(params![pattern], |row| {
            Ok(HistorySession {
                id: row.get(0)?,
                agent: row.get(1)?,
                cwd: row.get(2)?,
                started_at: row.get(3)?,
                ended_at: row.get(4)?,
                status: row.get(5)?,
                event_count: row.get(6)?,
            })
        }).unwrap().filter_map(|r| r.ok()).collect()
    }
}
