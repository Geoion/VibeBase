use serde::{Deserialize, Serialize};
use reqwest;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
}

#[tauri::command]
pub async fn fetch_provider_models(
    provider: String,
    api_key: String,
    base_url: Option<String>,
) -> Result<Vec<ModelInfo>, String> {
    match provider.as_str() {
        "openrouter" => fetch_openrouter_models(api_key, base_url).await,
        "openai" => fetch_openai_models(api_key, base_url).await,
        "anthropic" => fetch_anthropic_models(api_key, base_url).await,
        _ => Err(format!("Provider '{}' not supported yet", provider)),
    }
}

async fn fetch_openrouter_models(api_key: String, base_url: Option<String>) -> Result<Vec<ModelInfo>, String> {
    let url = base_url.unwrap_or_else(|| "https://openrouter.ai/api/v1/models".to_string());
    
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API returned status: {}", response.status()));
    }

    #[derive(Deserialize)]
    struct OpenRouterResponse {
        data: Vec<OpenRouterModel>,
    }

    #[derive(Deserialize)]
    struct OpenRouterModel {
        id: String,
        name: Option<String>,
    }

    let data: OpenRouterResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(data.data.into_iter().map(|m| ModelInfo {
        id: m.id.clone(),
        name: m.name.unwrap_or(m.id),
        description: None,
    }).collect())
}

async fn fetch_openai_models(api_key: String, base_url: Option<String>) -> Result<Vec<ModelInfo>, String> {
    let url = format!("{}/models", base_url.unwrap_or_else(|| "https://api.openai.com/v1".to_string()));
    
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API returned status: {}", response.status()));
    }

    #[derive(Deserialize)]
    struct OpenAIResponse {
        data: Vec<OpenAIModel>,
    }

    #[derive(Deserialize)]
    struct OpenAIModel {
        id: String,
    }

    let data: OpenAIResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Filter to only include GPT models
    Ok(data.data.into_iter()
        .filter(|m| m.id.starts_with("gpt-") || m.id.starts_with("o1"))
        .map(|m| ModelInfo {
            id: m.id.clone(),
            name: m.id,
            description: None,
        })
        .collect())
}

async fn fetch_anthropic_models(_api_key: String, _base_url: Option<String>) -> Result<Vec<ModelInfo>, String> {
    // Anthropic doesn't have a models list endpoint, return known models
    Ok(vec![
        ModelInfo {
            id: "claude-3-5-sonnet-20241022".to_string(),
            name: "Claude 3.5 Sonnet".to_string(),
            description: Some("Most capable model".to_string()),
        },
        ModelInfo {
            id: "claude-3-5-haiku-20241022".to_string(),
            name: "Claude 3.5 Haiku".to_string(),
            description: Some("Fast and efficient".to_string()),
        },
        ModelInfo {
            id: "claude-3-opus-20240229".to_string(),
            name: "Claude 3 Opus".to_string(),
            description: Some("Previous generation flagship".to_string()),
        },
    ])
}

#[tauri::command]
pub async fn test_provider_connection(
    provider: String,
    api_key: String,
    base_url: Option<String>,
) -> Result<String, String> {
    match provider.as_str() {
        "openrouter" => test_openrouter_connection(api_key, base_url).await,
        "openai" => test_openai_connection(api_key, base_url).await,
        "anthropic" => test_anthropic_connection(api_key, base_url).await,
        _ => Err(format!("Provider '{}' not supported yet", provider)),
    }
}

async fn test_openrouter_connection(api_key: String, base_url: Option<String>) -> Result<String, String> {
    let url = base_url.unwrap_or_else(|| "https://openrouter.ai/api/v1/models".to_string());
    
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if response.status().is_success() {
        Ok("Connection successful! API key is valid.".to_string())
    } else {
        Err(format!("Connection failed with status: {}", response.status()))
    }
}

async fn test_openai_connection(api_key: String, base_url: Option<String>) -> Result<String, String> {
    let url = format!("{}/models", base_url.unwrap_or_else(|| "https://api.openai.com/v1".to_string()));
    
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if response.status().is_success() {
        Ok("Connection successful! API key is valid.".to_string())
    } else {
        Err(format!("Connection failed with status: {}", response.status()))
    }
}

async fn test_anthropic_connection(api_key: String, _base_url: Option<String>) -> Result<String, String> {
    // For Anthropic, we can't easily test without making a real API call
    // Just check if the key format looks valid
    if api_key.starts_with("sk-ant-") {
        Ok("API key format looks valid. (Note: Actual connection not tested)".to_string())
    } else {
        Err("Invalid API key format. Anthropic keys should start with 'sk-ant-'".to_string())
    }
}
