use super::AgentAdapter;
use std::path::PathBuf;

pub struct GeminiAdapter;

impl GeminiAdapter {
    fn settings_path() -> PathBuf {
        dirs::home_dir().unwrap_or_default().join(".gemini").join("settings.json")
    }
}

impl AgentAdapter for GeminiAdapter {
    fn agent_key(&self) -> &str { "gemini" }
    fn display_name(&self) -> &str { "Gemini CLI" }

    fn detect(&self) -> bool {
        Self::settings_path().parent().map(|p| p.exists()).unwrap_or(false)
            || which::which("gemini").is_ok()
    }

    fn config_path(&self) -> Option<String> {
        Some(Self::settings_path().to_string_lossy().to_string())
    }

    fn inject_hooks(&self, bridge_path: &str) -> Result<(), String> {
        let path = Self::settings_path();
        let mut settings: serde_json::Value = if path.exists() {
            let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
            serde_json::from_str(&content).unwrap_or(serde_json::json!({}))
        } else {
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            serde_json::json!({})
        };

        let hooks = settings.as_object_mut().ok_or("Invalid settings")?
            .entry("hooks").or_insert(serde_json::json!({}));

        for event in &["PreToolUse", "PostToolUse", "Notification", "Stop"] {
            let cmd = format!("node {} --agent gemini", bridge_path);
            hooks[*event] = serde_json::json!([{"type": "command", "command": cmd}]);
        }

        let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
        std::fs::write(&path, json).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn verify_hooks(&self) -> bool {
        let path = Self::settings_path();
        if !path.exists() { return false; }
        std::fs::read_to_string(&path).unwrap_or_default().contains("notchos-bridge")
    }
}
