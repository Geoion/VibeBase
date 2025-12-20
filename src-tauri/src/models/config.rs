use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use super::prompt::Provider;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceConfig {
    pub project_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub theme: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_control: Option<SourceControlConfig>,
    pub environments: HashMap<String, Environment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceControlConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_generate_commit_message: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit_message_model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit_message_style: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit_message_language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Environment {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    
    // v2.0: Use provider_ref to reference global LLM configuration
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_ref: Option<String>,
    
    // Legacy fields (for backward compatibility)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider: Option<Provider>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key_env_var: Option<String>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parameters: Option<EnvironmentParameters>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentParameters {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
}

#[allow(dead_code)]
impl WorkspaceConfig {
    pub fn get_environment(&self, name: &str) -> Option<&Environment> {
        self.environments.get(name)
    }

    pub fn get_default_environment(&self) -> Option<(&String, &Environment)> {
        self.environments.iter().next()
    }
}

/// Arena Mode Settings
/// Stored in app_settings table (global settings)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArenaSettings {
    /// Enable concurrent execution of multiple models
    pub concurrent_execution: bool,
    
    /// Maximum number of models that can be selected (1-10)
    /// Also controls max concurrent execution count
    pub max_concurrent: u8,
    
    /// Cost warning threshold in USD
    pub cost_warning_threshold: f64,
    
    /// Remember last selected models
    pub remember_last_selection: bool,
    
    /// Auto save arena results to database
    pub auto_save_results: bool,
    
    /// Card display density: "compact" | "normal" | "detailed"
    pub card_density: String,
}

impl Default for ArenaSettings {
    fn default() -> Self {
        Self {
            concurrent_execution: true,
            max_concurrent: 3,
            cost_warning_threshold: 0.5,
            remember_last_selection: true,
            auto_save_results: true,
            card_density: "normal".to_string(),
        }
    }
}





