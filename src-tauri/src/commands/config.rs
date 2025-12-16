use crate::models::config::WorkspaceConfig;
use crate::services::keychain::KeychainService;
use std::fs;
use std::path::Path;

#[tauri::command]
pub fn read_config(workspace_path: String) -> Result<WorkspaceConfig, String> {
    let config_path = Path::new(&workspace_path).join("vibe.config.yaml");
    
    if !config_path.exists() {
        return Err("vibe.config.yaml not found".to_string());
    }

    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    
    serde_yaml::from_str::<WorkspaceConfig>(&content)
        .map_err(|e| format!("Config parse error: {}", e))
}

#[tauri::command]
pub fn save_api_key_to_keychain(
    environment: String,
    api_key: String,
) -> Result<(), String> {
    KeychainService::save_api_key(&environment, &api_key)
}

#[tauri::command]
pub fn get_api_key_from_keychain(environment: String) -> Result<String, String> {
    KeychainService::get_api_key(&environment)
}

#[tauri::command]
pub fn has_api_key_in_keychain(environment: String) -> Result<bool, String> {
    Ok(KeychainService::has_api_key(&environment))
}

#[tauri::command]
pub fn delete_api_key_from_keychain(environment: String) -> Result<(), String> {
    KeychainService::delete_api_key(&environment)
}

#[tauri::command]
pub fn get_api_key_for_environment(
    config: WorkspaceConfig,
    environment_name: String,
) -> Result<String, String> {
    let env = config
        .get_environment(&environment_name)
        .ok_or_else(|| format!("Environment '{}' not found", environment_name))?;

    // Try to get from keychain first
    if KeychainService::has_api_key(&environment_name) {
        return KeychainService::get_api_key(&environment_name);
    }

    // Try to get from environment variable
    if let Some(env_var) = &env.api_key_env_var {
        if let Ok(key) = std::env::var(env_var) {
            return Ok(key);
        }
    }

    Err(format!(
        "API key not found for environment '{}'. Please configure it.",
        environment_name
    ))
}






