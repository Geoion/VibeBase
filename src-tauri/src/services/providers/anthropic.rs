use crate::models::execution::*;
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    messages: Vec<AnthropicMessage>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Debug, Serialize, Deserialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContent>,
    usage: AnthropicUsage,
}

#[derive(Debug, Deserialize)]
struct AnthropicContent {
    text: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicUsage {
    input_tokens: u32,
    output_tokens: u32,
}

pub async fn execute(
    model: &str,
    messages: Vec<OpenAIMessage>,
    temperature: f32,
    api_key: &str,
) -> Result<(String, OpenAIUsage), String> {
    let client = Client::new();
    
    // Convert OpenAI format to Anthropic format
    let anthropic_messages: Vec<AnthropicMessage> = messages
        .iter()
        .filter(|m| m.role != "system") // Anthropic handles system differently
        .map(|m| AnthropicMessage {
            role: m.role.clone(),
            content: m.content.clone(),
        })
        .collect();

    let system_message = messages
        .iter()
        .find(|m| m.role == "system")
        .map(|m| m.content.clone());

    let request = AnthropicRequest {
        model: model.to_string(),
        messages: anthropic_messages,
        temperature,
        max_tokens: 4096,
    };

    let mut req = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&request);

    if let Some(sys_msg) = system_message {
        req = req.header("anthropic-system", sys_msg);
    }

    let response = req
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Anthropic API error {}: {}", status, error_text));
    }

    let api_response: AnthropicResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let output = api_response.content[0].text.clone();
    let usage = OpenAIUsage {
        prompt_tokens: api_response.usage.input_tokens,
        completion_tokens: api_response.usage.output_tokens,
        total_tokens: api_response.usage.input_tokens + api_response.usage.output_tokens,
    };

    Ok((output, usage))
}






