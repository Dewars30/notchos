use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct PluginManifest {
    pub name: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    pub version: String,
    pub abbreviation: String,
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(rename = "hookFormat", default = "default_hook_format")]
    pub hook_format: String,
    #[serde(rename = "configPath")]
    pub config_path: Option<String>,
    #[serde(rename = "installInstructions")]
    pub install_instructions: Option<String>,
    pub author: Option<String>,
}

fn default_model() -> String { "auto".into() }
fn default_hook_format() -> String { "claude-compatible".into() }

/// Scan ~/.notchos/plugins/*/manifest.json for agent plugins
pub fn discover_plugins() -> Vec<PluginManifest> {
    let plugins_dir = match dirs::home_dir() {
        Some(home) => home.join(".notchos/plugins"),
        None => return vec![],
    };

    if !plugins_dir.exists() {
        return vec![];
    }

    let mut manifests = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&plugins_dir) {
        for entry in entries.flatten() {
            let manifest_path = entry.path().join("manifest.json");
            if manifest_path.exists() {
                match std::fs::read_to_string(&manifest_path) {
                    Ok(content) => match serde_json::from_str::<PluginManifest>(&content) {
                        Ok(manifest) => {
                            manifests.push(manifest);
                        }
                        Err(e) => {
                            eprintln!("[plugins] Invalid manifest at {:?}: {}", manifest_path, e);
                        }
                    },
                    Err(e) => {
                        eprintln!("[plugins] Failed to read {:?}: {}", manifest_path, e);
                    }
                }
            }
        }
    }

    manifests
}
