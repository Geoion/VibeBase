use crate::models::execution::*;
use reqwest::Client;

pub async fn execute(
    model: &str,
    messages: Vec<OpenAIMessage>,
    temperature: f32,
    api_key: &str,
    base_url: Option<&str>,
) -> Result<(String, OpenAIUsage), String> {
    let client = Client::new();
    let url = format!(
        "{}/chat/completions",
        base_url.unwrap_or("https://api.openai.com/v1")
    );

    let request = OpenAIRequest {
        model: model.to_string(),
        messages,
        temperature,
        stream: Some(false),
    };

    let mut req = client.post(&url).json(&request);

    // Add auth header if API key is provided (not needed for Ollama)
    if !api_key.is_empty() {
        req = req.header("Authorization", format!("Bearer {}", api_key));
    }

    let response = req
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, error_text));
    }

    let api_response: OpenAIResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let output = api_response.choices[0].message.content.clone();
    Ok((output, api_response.usage))
}






