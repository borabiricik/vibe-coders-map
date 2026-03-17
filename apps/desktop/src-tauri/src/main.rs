#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use log::{error, info, warn, LevelFilter};
use std::collections::HashSet;
use sysinfo::{ProcessesToUpdate, System};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, TrayIconEvent},
    ActivationPolicy, Manager, WindowEvent,
};
use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};

const MAIN_WINDOW_LABEL: &str = "main";
const TRAY_ID: &str = "main";
const TRAY_OPEN_ID: &str = "tray_open";
const TRAY_QUIT_ID: &str = "tray_quit";
const LOG_FILE_NAME: &str = "desktop";

fn api_url() -> &'static str {
    option_env!("VIBE_API_URL")
        .filter(|url| !url.is_empty())
        .expect("VIBE_API_URL should be injected from desktop env files during build")
}

fn redact_anon_id(anon_id: &str) -> String {
    format!("{}...", &anon_id.chars().take(8).collect::<String>())
}

fn install_panic_hook() {
    std::panic::set_hook(Box::new(|panic_info| {
        error!(target: "panic", "Unhandled panic: {panic_info}");
    }));
}

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
        if name.contains("antigravity") {
            detected.insert("antigravity".to_string());
        }
        if name.contains("cline") {
            detected.insert("cline".to_string());
        }
        if name.contains("continue") {
            detected.insert("continue".to_string());
        }
        if name == "codex" || name.contains("codex") {
            detected.insert("codex".to_string());
        }
    }

    detected.into_iter().collect()
}

#[tauri::command]
async fn send_heartbeat(
    anon_id: String,
    tools: Vec<String>,
    lat: Option<f64>,
    lng: Option<f64>,
) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let anon_id_log = redact_anon_id(&anon_id);
    let mut payload = serde_json::json!({
        "anon_id": anon_id,
        "tools": tools,
        "ts": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    });

    if let Some(lat) = lat {
        payload["lat"] = serde_json::json!(lat);
    }

    if let Some(lng) = lng {
        payload["lng"] = serde_json::json!(lng);
    }

    let heartbeat_url = format!("{}/api/v1/heartbeat", api_url());

    info!(
        target: "heartbeat",
        "Sending heartbeat to {heartbeat_url} for {anon_id_log} with {} detected tools (client_coordinates={})",
        payload["tools"].as_array().map_or(0, |values| values.len()),
        payload.get("lat").is_some() && payload.get("lng").is_some(),
    );

    match client.post(&heartbeat_url).json(&payload).send().await {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() || status.as_u16() == 204 {
                info!(
                    target: "heartbeat",
                    "Heartbeat succeeded for {anon_id_log} with status {status}"
                );
                Ok(true)
            } else {
                warn!(
                    target: "heartbeat",
                    "Heartbeat returned non-success status {status} for {anon_id_log}"
                );
                Ok(false)
            }
        }
        Err(err) => {
            error!(
                target: "heartbeat",
                "Heartbeat request failed for {anon_id_log}: {err}"
            );
            Err(err.to_string())
        }
    }
}

fn show_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_geolocation::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(LevelFilter::Info)
                .rotation_strategy(RotationStrategy::KeepAll)
                .max_file_size(1_000_000)
                .timezone_strategy(TimezoneStrategy::UseLocal)
                .target(Target::new(TargetKind::LogDir {
                    file_name: Some(LOG_FILE_NAME.to_string()),
                }))
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![detect_tools, send_heartbeat])
        .on_window_event(|window, event| {
            if window.label() != MAIN_WINDOW_LABEL {
                return;
            }

            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            TRAY_OPEN_ID => show_main_window(app),
            TRAY_QUIT_ID => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|app, event| {
            if let TrayIconEvent::Click {
                id,
                button: MouseButton::Left,
                ..
            } = event
            {
                if id.as_ref() == TRAY_ID {
                    show_main_window(app);
                }
            }
        })
        .setup(|app| {
            install_panic_hook();
            info!(target: "app", "Desktop app initialized with API URL {}", api_url());

            #[cfg(target_os = "macos")]
            {
                let _ = app.set_activation_policy(ActivationPolicy::Accessory);
                let _ = app.set_dock_visibility(false);
            }

            let open_item = MenuItem::with_id(
                app,
                TRAY_OPEN_ID,
                "Open Vibe Coders Map",
                true,
                None::<&str>,
            )?;
            let quit_item =
                MenuItem::with_id(app, TRAY_QUIT_ID, "Quit", true, Some("CmdOrCtrl+Q"))?;
            let tray_menu = Menu::with_items(
                app,
                &[&open_item, &PredefinedMenuItem::separator(app)?, &quit_item],
            )?;

            let tray = app
                .tray_by_id(TRAY_ID)
                .ok_or_else(|| tauri::Error::AssetNotFound("main tray icon".into()))?;

            tray.set_menu(Some(tray_menu))?;
            tray.set_show_menu_on_left_click(false)?;

            if let Some(icon) = app.default_window_icon() {
                tray.set_icon(Some(Image::clone(icon)))?;
            }

            let _window = app.get_webview_window(MAIN_WINDOW_LABEL).unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
