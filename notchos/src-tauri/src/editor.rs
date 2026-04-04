use std::process::Command;

/// Open a file in the user's preferred editor
#[tauri::command]
pub fn open_in_editor(path: String) -> Result<(), String> {
    // Try $EDITOR first
    if let Ok(editor) = std::env::var("EDITOR") {
        return Command::new(&editor)
            .arg(&path)
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("Failed to open {}: {}", editor, e));
    }

    // Auto-detect common editors
    #[cfg(target_os = "macos")]
    {
        // Try VS Code, then Cursor, then Zed, then system default
        for cmd in &["code", "cursor", "zed"] {
            if Command::new(cmd).arg(&path).spawn().is_ok() {
                return Ok(());
            }
        }
        Command::new("open").arg("-t").arg(&path).spawn()
            .map(|_| ())
            .map_err(|e| format!("Failed to open: {}", e))
    }

    #[cfg(target_os = "windows")]
    {
        for cmd in &["code", "cursor"] {
            if Command::new(cmd).arg(&path).spawn().is_ok() {
                return Ok(());
            }
        }
        Command::new("notepad").arg(&path).spawn()
            .map(|_| ())
            .map_err(|e| format!("Failed to open: {}", e))
    }

    #[cfg(target_os = "linux")]
    {
        for cmd in &["code", "cursor", "zed"] {
            if Command::new(cmd).arg(&path).spawn().is_ok() {
                return Ok(());
            }
        }
        Command::new("xdg-open").arg(&path).spawn()
            .map(|_| ())
            .map_err(|e| format!("Failed to open: {}", e))
    }
}

/// Reveal a file in the system file manager
#[tauri::command]
pub fn reveal_in_file_manager(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open").arg("-R").arg(&path).spawn()
            .map(|_| ())
            .map_err(|e| format!("Failed to reveal: {}", e))
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer").arg(format!("/select,{}", path)).spawn()
            .map(|_| ())
            .map_err(|e| format!("Failed to reveal: {}", e))
    }

    #[cfg(target_os = "linux")]
    {
        // Try nautilus, then dolphin, then xdg-open on parent dir
        let parent = std::path::Path::new(&path).parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| path.clone());
        Command::new("xdg-open").arg(&parent).spawn()
            .map(|_| ())
            .map_err(|e| format!("Failed to reveal: {}", e))
    }
}
