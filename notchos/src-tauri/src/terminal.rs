use std::process::Command;

/// Jump to the terminal running a session, matched by cwd
#[tauri::command]
pub fn jump_to_terminal(cwd: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        jump_macos(&cwd)
    }

    #[cfg(target_os = "windows")]
    {
        jump_windows(&cwd)
    }

    #[cfg(target_os = "linux")]
    {
        jump_linux(&cwd)
    }
}

#[cfg(target_os = "macos")]
fn jump_macos(cwd: &str) -> Result<(), String> {
    // Try iTerm2 first (most popular among power users)
    let dir_name = cwd.split('/').last().unwrap_or(cwd);
    let iterm_script = format!(
        r#"tell application "System Events"
            if exists process "iTerm2" then
                tell application "iTerm2"
                    activate
                    repeat with w in windows
                        repeat with t in tabs of w
                            repeat with s in sessions of t
                                if name of s contains "{cwd}" or (exists variable named "PWD" of s and value of variable named "PWD" of s contains "{cwd}") then
                                    select t
                                    return
                                end if
                            end repeat
                        end repeat
                    end repeat
                end tell
            end if
        end tell"#,
        cwd = dir_name
    );

    if Command::new("osascript").arg("-e").arg(&iterm_script).status().is_ok() {
        return Ok(());
    }

    // Fallback: try Terminal.app
    let terminal_script = format!(
        r#"tell application "Terminal"
            activate
            repeat with w in windows
                repeat with t in tabs of w
                    if custom title of t contains "{name}" or history of t contains "{name}" then
                        set selected of t to true
                        set index of w to 1
                        return
                    end if
                end repeat
            end repeat
        end tell"#,
        name = dir_name
    );

    Command::new("osascript").arg("-e").arg(&terminal_script).status()
        .map(|_| ())
        .map_err(|e| format!("Terminal jump failed: {}", e))
}

#[cfg(target_os = "windows")]
fn jump_windows(cwd: &str) -> Result<(), String> {
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

#[cfg(target_os = "linux")]
fn jump_linux(cwd: &str) -> Result<(), String> {
    // Try wmctrl to find window by title
    let dir_name = cwd.split('/').last().unwrap_or(cwd);
    if Command::new("wmctrl").arg("-a").arg(dir_name).status().is_ok() {
        return Ok(());
    }
    // Fallback: try xdotool
    let search = Command::new("xdotool")
        .args(["search", "--name", dir_name])
        .output();

    if let Ok(output) = search {
        if let Some(wid) = String::from_utf8_lossy(&output.stdout).lines().next() {
            let _ = Command::new("xdotool").args(["windowactivate", wid]).status();
            return Ok(());
        }
    }

    Err("No matching terminal window found".into())
}
