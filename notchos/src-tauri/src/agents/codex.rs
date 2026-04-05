use super::AgentAdapter;
use std::path::PathBuf;

pub struct CodexAdapter;

impl CodexAdapter {
    fn config_dir() -> PathBuf {
        dirs::home_dir().unwrap_or_default().join(".codex")
    }
}

impl AgentAdapter for CodexAdapter {
    fn agent_key(&self) -> &str { "codex" }
    fn display_name(&self) -> &str { "Codex CLI" }

    fn detect(&self) -> bool {
        Self::config_dir().exists() || which::which("codex").is_ok()
    }

    fn config_path(&self) -> Option<String> {
        Some(Self::config_dir().to_string_lossy().to_string())
    }

    fn inject_hooks(&self, bridge_path: &str) -> Result<(), String> {
        let dir = Self::config_dir();
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

        // Codex uses a hooks configuration — write to hooks.json
        let hooks_path = dir.join("hooks.json");
        let hooks = serde_json::json!({
            "pre_tool_use": format!("node {} --agent codex", bridge_path),
            "post_tool_use": format!("node {} --agent codex", bridge_path),
            "notification": format!("node {} --agent codex", bridge_path),
            "stop": format!("node {} --agent codex", bridge_path),
        });

        let json = serde_json::to_string_pretty(&hooks).map_err(|e| e.to_string())?;
        std::fs::write(&hooks_path, json).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn verify_hooks(&self) -> bool {
        let hooks_path = Self::config_dir().join("hooks.json");
        if !hooks_path.exists() { return false; }
        std::fs::read_to_string(hooks_path).unwrap_or_default().contains("notchos-bridge")
    }
}
