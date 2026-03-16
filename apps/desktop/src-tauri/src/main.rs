#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashSet;
use sysinfo::{ProcessesToUpdate, System};
use tauri::Manager;

const API_URL: &str = "http://localhost:8787";

#[tauri::command]
fn detect_tools() -> Vec<String> {
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let mut detected = HashSet::new();

    for (_pid, process) in sys.processes() {
        let name = process.name().to_string_lossy().to_lowercase();

        if name.contains("cursor") && !name.contains("cursorfixer") {
            detected.insert("cursor".to_string());
        }
        if name.contains("windsurf") {
            detected.insert("windsurf".to_string());
        }
        if name == "claude" || name.contains("claude-code") {
            detected.insert("claude_code".to_string());
        }
        if name == "zed" {
            detected.insert("zed".to_string());
        }
        if name.contains("aider") {
            detected.insert("aider".to_string());
        }
        if ["idea", "webstorm", "pycharm", "goland", "rustrover", "clion"]
            .iter()
            .any(|ide| name.contains(ide))
        {
            detected.insert("jetbrains_ai".to_string());
        }
        if name == "code" || name.contains("code helper") {
            detected.insert("copilot".to_string());
        }
    }

    detected.into_iter().collect()
}

#[tauri::command]
async fn send_heartbeat(anon_id: String, tools: Vec<String>) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let payload = serde_json::json!({
        "anon_id": anon_id,
        "tools": tools,
        "ts": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    });

    match client
        .post(format!("{}/api/v1/heartbeat", API_URL))
        .json(&payload)
        .send()
        .await
    {
        Ok(resp) => Ok(resp.status().is_success() || resp.status().as_u16() == 204),
        Err(e) => Err(e.to_string()),
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![detect_tools, send_heartbeat])
        .setup(|app| {
            let _window = app.get_webview_window("main").unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
