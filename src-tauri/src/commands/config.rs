use crate::models::config::{WorkspaceConfig, ArenaSettings};
use crate::services::keychain::KeychainService;
use crate::services::database::AppDatabase;
use tauri::State;
use std::sync::Mutex;

/// @deprecated This command is no longer used in v2.0 architecture.
/// Workspace configuration is no longer needed - users select LLM providers
/// directly in the execution panel.
/// 
/// Keeping for backward compatibility only.
#[tauri::command]
pub fn read_config(_workspace_path: String) -> Result<WorkspaceConfig, String> {
    // Return a minimal empty config for backward compatibility
    Err("Workspace configuration is no longer used. Please select LLM Provider directly in execution panel.".to_string())
}

/// @deprecated This command is no longer used in v2.0 architecture.
#[tauri::command]
pub fn save_config(_workspace_path: String, _config: WorkspaceConfig) -> Result<(), String> {
    Err("Workspace configuration is no longer used. Configure LLM Providers in Settings instead.".to_string())
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

/// @deprecated This command is no longer used in v2.0 architecture.
/// API keys are now retrieved directly from keychain using the provider's api_key_ref.
#[tauri::command]
pub fn get_api_key_for_environment(
    _config: WorkspaceConfig,
    _environment_name: String,
) -> Result<String, String> {
    Err("This command is deprecated. Use get_api_key_from_keychain with provider's api_key_ref instead.".to_string())
}

pub struct AppSettingsState {
    pub app_db: Mutex<AppDatabase>,
}

impl AppSettingsState {
    pub fn new() -> Self {
        Self {
            app_db: Mutex::new(AppDatabase::new().expect("Failed to initialize app database")),
        }
    }
}

/// Get Arena settings from app_settings table
#[tauri::command]
pub fn get_arena_settings(state: State<AppSettingsState>) -> Result<ArenaSettings, String> {
    let db = state.app_db.lock().map_err(|e| e.to_string())?;
    
    match db.get_app_setting("arena_settings") {
        Ok(json_str) => {
            serde_json::from_str(&json_str)
                .map_err(|e| format!("Failed to parse arena settings: {}", e))
        }
        Err(_) => {
            // Return default settings if not found
            Ok(ArenaSettings::default())
        }
    }
}

/// Save Arena settings to app_settings table
#[tauri::command]
pub fn save_arena_settings(
    settings: ArenaSettings,
    state: State<AppSettingsState>,
) -> Result<(), String> {
    let db = state.app_db.lock().map_err(|e| e.to_string())?;
    
    let json_str = serde_json::to_string(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    db.save_app_setting("arena_settings", &json_str)
        .map_err(|e| format!("Failed to save settings: {}", e))
}













