use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredAgent {
    pub name: String,
    pub agent_key: String,
    pub installed: bool,
    pub hooks_injected: bool,
    pub config_path: Option<String>,
}

pub trait AgentAdapter: Send + Sync {
    fn agent_key(&self) -> &str;
    fn display_name(&self) -> &str;
    fn detect(&self) -> bool;
    fn config_path(&self) -> Option<String>;
    fn inject_hooks(&self, bridge_path: &str) -> Result<(), String>;
    fn verify_hooks(&self) -> bool;
}

mod claude;
mod codex;
mod gemini;

pub use claude::ClaudeAdapter;
pub use codex::CodexAdapter;
pub use gemini::GeminiAdapter;

pub fn all_adapters() -> Vec<Box<dyn AgentAdapter>> {
    vec![
        Box::new(ClaudeAdapter),
        Box::new(CodexAdapter),
        Box::new(GeminiAdapter),
    ]
}

pub fn discover_all(_bridge_path: &str) -> Vec<DiscoveredAgent> {
    let mut agents: Vec<DiscoveredAgent> = all_adapters().iter().map(|adapter| {
        let installed = adapter.detect();
        let hooks_injected = if installed { adapter.verify_hooks() } else { false };
        DiscoveredAgent {
            name: adapter.display_name().to_string(),
            agent_key: adapter.agent_key().to_string(),
            installed,
            hooks_injected,
            config_path: adapter.config_path(),
        }
    }).collect();

    // Discover plugin agents
    let plugins = crate::plugins::discover_plugins();
    for plugin in plugins {
        // Don't override built-in agents
        if agents.iter().any(|a| a.agent_key == plugin.name) {
            continue;
        }
        agents.push(DiscoveredAgent {
            name: plugin.display_name,
            agent_key: plugin.name,
            installed: true,
            hooks_injected: false,
            config_path: plugin.config_path,
        });
    }

    agents
}

pub fn setup_all(bridge_path: &str) -> Vec<(String, bool)> {
    all_adapters().iter().filter_map(|adapter| {
        if adapter.detect() && !adapter.verify_hooks() {
            let result = adapter.inject_hooks(bridge_path);
            Some((adapter.agent_key().to_string(), result.is_ok()))
        } else {
            None
        }
    }).collect()
}
