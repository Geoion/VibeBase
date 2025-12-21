use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VersionInfo {
    pub current_version: String,
    pub latest_version: String,
    pub update_available: bool,
    pub download_url: String,
    pub release_notes: String,
}

#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<VersionInfo, String> {
    let current_version = app.package_info().version.to_string();
    
    // Use Tauri updater to check for updates
    match app.updater().check().await {
        Ok(update) => {
            if update.is_update_available() {
                let body = update.body().map(|s| s.to_string()).unwrap_or_default();
                Ok(VersionInfo {
                    current_version,
                    latest_version: update.latest_version().to_string(),
                    update_available: true,
                    download_url: format!("https://github.com/Geoion/VibeBase/releases/tag/{}", update.latest_version()),
                    release_notes: body,
                })
            } else {
                Ok(VersionInfo {
                    current_version: current_version.clone(),
                    latest_version: current_version,
                    update_available: false,
                    download_url: String::new(),
                    release_notes: "You are using the latest version".to_string(),
                })
            }
        }
        Err(e) => Err(format!("Failed to check for updates: {}", e))
    }
}

#[tauri::command]
pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    match app.updater().check().await {
        Ok(update) => {
            if update.is_update_available() {
                update.download_and_install().await
                    .map_err(|e| format!("Failed to install update: {}", e))?;
                Ok(())
            } else {
                Err("No update available".to_string())
            }
        }
        Err(e) => Err(format!("Failed to check for updates: {}", e))
    }
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
