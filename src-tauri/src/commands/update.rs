use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VersionInfo {
    pub current_version: String,
    pub latest_version: String,
    pub update_available: bool,
    pub download_url: String,
    pub release_notes: String,
}

#[tauri::command]
pub async fn check_for_updates() -> Result<VersionInfo, String> {
    // Current version (read from Cargo.toml or tauri.conf.json)
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    
    // In production, this should call GitHub API or your own update server
    // Example: https://api.github.com/repos/owner/repo/releases/latest
    
    // Simulated check - replace with actual API call in production
    let latest_version = current_version.clone();
    let update_available = false;
    
    Ok(VersionInfo {
        current_version: current_version.clone(),
        latest_version,
        update_available,
        download_url: "https://github.com/vibebase/vibebase/releases".to_string(),
        release_notes: if update_available {
            "New features and bug fixes available!".to_string()
        } else {
            "You are running the latest version.".to_string()
        },
    })
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
