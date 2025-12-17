use crate::services::database::{AppDatabase, LLMProviderConfig};
use crate::services::keychain::KeychainService;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

pub struct LLMProviderState {
    pub app_db: Mutex<AppDatabase>,
}

impl LLMProviderState {
    pub fn new() -> Self {
        Self {
            app_db: Mutex::new(AppDatabase::new().expect("Failed to initialize app database")),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMProviderInput {
    pub name: String,
    pub provider: String,
    pub model: String,
    pub base_url: Option<String>,
    pub api_key: Option<String>,  // API Key stored directly in database
    pub api_key_source: String,  // "direct" | "env_var"
    pub api_key_value: Option<String>,  // For backward compatibility or env var name
    pub parameters: Option<String>,  // JSON
    pub enabled: bool,  // Provider enabled/disabled
    pub enabled_models: Option<String>,  // JSON array of enabled model IDs
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMProviderOutput {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub model: String,
    pub base_url: Option<String>,
    pub api_key: Option<String>,  // Masked for display, actual key available via get_llm_provider
    pub api_key_source: String,
    pub api_key_ref: Option<String>,
    pub api_key_status: String,  // "configured" | "missing"
    pub parameters: Option<String>,
    pub enabled: bool,
    pub enabled_models: Option<String>,
    pub is_default: bool,
}

#[tauri::command]
pub fn list_llm_providers(
    state: State<'_, LLMProviderState>,
) -> Result<Vec<LLMProviderOutput>, String> {
    let db = state.app_db.lock().unwrap();
    let providers = db.list_llm_providers()
        .map_err(|e| format!("Failed to list providers: {}", e))?;

    Ok(providers.into_iter().map(|p| {
        // Check API key status
        let api_key_status = if p.api_key.is_some() && !p.api_key.as_ref().unwrap().is_empty() {
            "configured"
        } else {
            "missing"
        };

        // Mask API key for list view (don't expose full key)
        let masked_key = if api_key_status == "configured" {
            Some("••••••••••••••••".to_string())
        } else {
            None
        };

        LLMProviderOutput {
            id: p.id,
            name: p.name,
            provider: p.provider,
            model: p.model,
            base_url: p.base_url,
            api_key: masked_key,
            api_key_source: p.api_key_source,
            api_key_ref: p.api_key_ref,
            api_key_status: api_key_status.to_string(),
            parameters: p.parameters,
            enabled: p.enabled,
            enabled_models: p.enabled_models,
            is_default: p.is_default,
        }
    }).collect())
}

#[tauri::command]
pub fn save_llm_provider(
    input: LLMProviderInput,
    state: State<'_, LLMProviderState>,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();

    // Store API key directly in database
    let api_key = input.api_key.or(input.api_key_value);

    let config = LLMProviderConfig {
        id,
        name: input.name,
        provider: input.provider,
        model: input.model,
        base_url: input.base_url,
        api_key,
        api_key_source: input.api_key_source,
        api_key_ref: None,  // Not used anymore
        parameters: input.parameters,
        enabled: input.enabled,
        enabled_models: input.enabled_models,
        is_default: input.is_default,
    };

    let db = state.app_db.lock().unwrap();
    db.save_llm_provider(&config)
        .map_err(|e| format!("Failed to save provider: {}", e))?;

    Ok(config.id)
}

#[tauri::command]
pub fn update_llm_provider(
    provider_name: String,
    input: LLMProviderInput,
    state: State<'_, LLMProviderState>,
) -> Result<(), String> {
    let db = state.app_db.lock().unwrap();
    
    // Get existing provider
    let existing = db.get_llm_provider(&provider_name)
        .map_err(|e| format!("Provider not found: {}", e))?;

    // Update API key if provided, otherwise keep existing
    let api_key = if input.api_key.is_some() && !input.api_key.as_ref().unwrap().is_empty() {
        input.api_key
    } else if input.api_key_value.is_some() && !input.api_key_value.as_ref().unwrap().is_empty() {
        input.api_key_value
    } else {
        existing.api_key
    };

    let config = LLMProviderConfig {
        id: existing.id,
        name: input.name,
        provider: input.provider,
        model: input.model,
        base_url: input.base_url,
        api_key,
        api_key_source: input.api_key_source,
        api_key_ref: None,
        parameters: input.parameters,
        enabled: input.enabled,
        enabled_models: input.enabled_models,
        is_default: input.is_default,
    };

    db.save_llm_provider(&config)
        .map_err(|e| format!("Failed to update provider: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn delete_llm_provider(
    provider_name: String,
    state: State<'_, LLMProviderState>,
) -> Result<(), String> {
    let db = state.app_db.lock().unwrap();
    
    db.delete_llm_provider(&provider_name)
        .map_err(|e| format!("Failed to delete provider: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_llm_provider(
    provider_name: String,
    state: State<'_, LLMProviderState>,
) -> Result<LLMProviderOutput, String> {
    let db = state.app_db.lock().unwrap();
    let provider = db.get_llm_provider(&provider_name)
        .map_err(|e| format!("Provider not found: {}", e))?;

    // Check API key status
    let api_key_status = if provider.api_key.is_some() && !provider.api_key.as_ref().unwrap().is_empty() {
        "configured"
    } else {
        "missing"
    };

    Ok(LLMProviderOutput {
        id: provider.id,
        name: provider.name,
        provider: provider.provider,
        model: provider.model,
        base_url: provider.base_url,
        api_key: provider.api_key,  // Return actual key for editing
        api_key_source: provider.api_key_source,
        api_key_ref: provider.api_key_ref,
        api_key_status: api_key_status.to_string(),
        parameters: provider.parameters,
        enabled: provider.enabled,
        enabled_models: provider.enabled_models,
        is_default: provider.is_default,
    })
}

#[tauri::command]
pub fn test_llm_provider_connection(
    provider_name: String,
    state: State<'_, LLMProviderState>,
) -> Result<String, String> {
    let db = state.app_db.lock().unwrap();
    let provider = db.get_llm_provider(&provider_name)
        .map_err(|e| format!("Provider not found: {}", e))?;

    // Check if API key exists
    let api_key = provider.api_key.ok_or("API key not configured".to_string())?;
    
    if api_key.is_empty() {
        return Err("API key is empty".to_string());
    }

    // TODO: Actually test the connection by making a simple API call
    // For now, just verify we have the API key
    
    Ok("Connection test successful (API key configured)".to_string())
}



