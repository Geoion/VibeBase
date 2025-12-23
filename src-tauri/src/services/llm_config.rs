use crate::models::config::Environment;
use crate::models::prompt::{Provider, ModelParameters};
use crate::services::database::{AppDatabase, LLMProviderConfig};
use crate::services::keychain::KeychainService;
use std::sync::Arc;

/// Resolved LLM configuration ready for execution
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct ResolvedLLMConfig {
    pub provider: Provider,
    pub model: String,
    pub base_url: Option<String>,
    pub api_key: String,
    pub parameters: ModelParameters,
}

/// LLM Configuration Resolver
/// Resolves provider_ref from project config to actual LLM configuration
#[allow(dead_code)]
pub struct LLMConfigResolver {
    app_db: Arc<AppDatabase>,
}

#[allow(dead_code)]
impl LLMConfigResolver {
    pub fn new(app_db: Arc<AppDatabase>) -> Self {
        Self { app_db }
    }

    /// Resolve environment configuration to executable LLM config
    pub fn resolve_environment(
        &self,
        env: &Environment,
    ) -> Result<ResolvedLLMConfig, String> {
        // Check if using provider_ref (v2.0) or legacy direct config
        if let Some(provider_ref) = &env.provider_ref {
            // v2.0: Use provider_ref
            self.resolve_from_provider_ref(env, provider_ref)
        } else if let Some(provider) = &env.provider {
            // Legacy: Direct configuration
            self.resolve_from_legacy(env, provider)
        } else {
            Err("Neither provider_ref nor provider specified in environment".to_string())
        }
    }

    /// Resolve using provider_ref (v2.0 method)
    fn resolve_from_provider_ref(
        &self,
        env: &Environment,
        provider_ref: &str,
    ) -> Result<ResolvedLLMConfig, String> {
        // Get global LLM provider configuration
        let global_config = self.app_db.get_llm_provider(provider_ref)
            .map_err(|e| format!("Provider '{}' not found in global config: {}", provider_ref, e))?;

        // Parse provider enum
        let provider = self.parse_provider(&global_config.provider)?;

        // Get model (use override from environment if specified, otherwise use global)
        let model = env.model.clone().unwrap_or(global_config.model.clone());

        // Get base URL
        let base_url = env.base_url.clone().or(global_config.base_url.clone());

        // Get API Key
        let api_key = self.get_api_key(&global_config)?;

        // Merge parameters (environment overrides global)
        let parameters = self.merge_parameters(
            &global_config.parameters,
            &env.parameters,
        )?;

        Ok(ResolvedLLMConfig {
            provider,
            model,
            base_url,
            api_key,
            parameters,
        })
    }

    /// Resolve using legacy direct configuration (backward compatibility)
    fn resolve_from_legacy(
        &self,
        env: &Environment,
        provider: &Provider,
    ) -> Result<ResolvedLLMConfig, String> {
        let model = env.model.clone()
            .ok_or("Model not specified in legacy config")?;

        let api_key = if let Some(env_var) = &env.api_key_env_var {
            std::env::var(env_var)
                .map_err(|_| format!("Environment variable '{}' not found", env_var))?
        } else {
            String::new()
        };

        let parameters = ModelParameters {
            temperature: env.parameters.as_ref().and_then(|p| p.temperature),
            top_p: env.parameters.as_ref().and_then(|p| p.top_p),
            max_tokens: env.parameters.as_ref().and_then(|p| p.max_tokens),
        };

        Ok(ResolvedLLMConfig {
            provider: provider.clone(),
            model,
            base_url: env.base_url.clone(),
            api_key,
            parameters,
        })
    }

    /// Get API key from keychain or environment variable
    fn get_api_key(&self, config: &LLMProviderConfig) -> Result<String, String> {
        match config.api_key_source.as_str() {
            "keychain" => {
                let key_ref = config.api_key_ref.as_ref()
                    .ok_or("API key reference not specified")?;
                
                KeychainService::get_api_key(key_ref)
            }
            "env_var" => {
                let env_var = config.api_key_ref.as_ref()
                    .ok_or("Environment variable name not specified")?;
                
                std::env::var(env_var)
                    .map_err(|_| format!("Environment variable '{}' not found", env_var))
            }
            _ => Err(format!("Invalid API key source: {}", config.api_key_source)),
        }
    }

    /// Parse provider string to enum
    fn parse_provider(&self, provider_str: &str) -> Result<Provider, String> {
        match provider_str {
            "openai" => Ok(Provider::OpenAI),
            "anthropic" => Ok(Provider::Anthropic),
            "deepseek" => Ok(Provider::DeepSeek),
            "openrouter" => Ok(Provider::OpenRouter),
            "ollama" => Ok(Provider::Ollama),
            "azure_openai" => Ok(Provider::AzureOpenAI),
            "google" => Ok(Provider::Google),
            "aihubmix" => Ok(Provider::AiHubMix),
            "github" => Ok(Provider::GitHub),
            "custom" => Ok(Provider::Custom),
            _ => Err(format!("Unknown provider: {}", provider_str)),
        }
    }

    /// Merge parameters (environment overrides global)
    fn merge_parameters(
        &self,
        global_params: &Option<String>,
        env_params: &Option<crate::models::config::EnvironmentParameters>,
    ) -> Result<ModelParameters, String> {
        // Parse global parameters from JSON
        let mut params = if let Some(json) = global_params {
            serde_json::from_str::<ModelParameters>(json)
                .unwrap_or_else(|_| ModelParameters {
                    temperature: Some(0.7),
                    top_p: None,
                    max_tokens: None,
                })
        } else {
            ModelParameters {
                temperature: Some(0.7),
                top_p: None,
                max_tokens: None,
            }
        };

        // Override with environment parameters
        if let Some(env_p) = env_params {
            if let Some(temp) = env_p.temperature {
                params.temperature = Some(temp);
            }
            if let Some(top_p) = env_p.top_p {
                params.top_p = Some(top_p);
            }
            if let Some(max_tokens) = env_p.max_tokens {
                params.max_tokens = Some(max_tokens);
            }
        }

        Ok(params)
    }

    /// List all available provider references
    pub fn list_available_providers(&self) -> Result<Vec<String>, String> {
        let providers = self.app_db.list_llm_providers()
            .map_err(|e| format!("Failed to list providers: {}", e))?;
        
        Ok(providers.into_iter().map(|p| p.name).collect())
    }

    /// Check if a provider reference exists
    pub fn provider_exists(&self, provider_ref: &str) -> bool {
        self.app_db.get_llm_provider(provider_ref).is_ok()
    }

    /// Validate provider reference in environment
    pub fn validate_provider_ref(&self, provider_ref: &str) -> Result<(), String> {
        // Check if provider exists
        let config = self.app_db.get_llm_provider(provider_ref)
            .map_err(|_| format!("Provider '{}' not found in global configuration", provider_ref))?;

        // Check if API key is available
        match config.api_key_source.as_str() {
            "keychain" => {
                if let Some(key_ref) = &config.api_key_ref {
                    if !KeychainService::has_api_key(key_ref) {
                        return Err(format!("API key '{}' not found in keychain", key_ref));
                    }
                }
            }
            "env_var" => {
                if let Some(env_var) = &config.api_key_ref {
                    if std::env::var(env_var).is_err() {
                        return Err(format!("Environment variable '{}' not set", env_var));
                    }
                }
            }
            _ => {}
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_provider() {
        let app_db = Arc::new(AppDatabase::new().unwrap());
        let resolver = LLMConfigResolver::new(app_db);
        
        assert!(matches!(resolver.parse_provider("openai").unwrap(), Provider::OpenAI));
        assert!(matches!(resolver.parse_provider("anthropic").unwrap(), Provider::Anthropic));
        assert!(resolver.parse_provider("invalid").is_err());
    }
}


