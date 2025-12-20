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
    let url_base = base_url.unwrap_or("https://api.openai.com/v1");
    let url = format!("{}/chat/completions", url_base);

    let request = OpenAIRequest {
        model: model.to_string(),
        messages,
        temperature,
        stream: Some(false),
    };

    println!("🔍 [OpenAI Provider] URL: {}", url);
    println!("🔍 [OpenAI Provider] Model: {}", model);
    println!("🔍 [OpenAI Provider] Messages count: {}", request.messages.len());
    println!("🔍 [OpenAI Provider] API key length: {} bytes", api_key.len());
    println!("🔍 [OpenAI Provider] API key chars: {} chars", api_key.chars().count());
    
    // 安全地显示 API key 前缀（按字符而非字节）
    let key_prefix: String = api_key.chars().take(15).collect();
    println!("🔍 [OpenAI Provider] API key prefix: {}", key_prefix);
    
    // 检查是否是遮挡字符
    if api_key.contains('•') {
        println!("⚠️ [OpenAI Provider] API key contains bullet characters - may be masked/invalid");
    }

    let mut req = client.post(&url).json(&request);

    // Add auth header if API key is provided (not needed for Ollama)
    if !api_key.is_empty() {
        req = req.header("Authorization", format!("Bearer {}", api_key));
        println!("✅ [OpenAI Provider] Authorization header added");
    } else {
        println!("⚠️ [OpenAI Provider] No API key provided");
    }

    // Add OpenRouter specific headers
    if url_base.contains("openrouter.ai") {
        println!("✅ [OpenAI Provider] Adding OpenRouter headers");
        req = req
            .header("HTTP-Referer", "https://vibebase.dev")
            .header("X-Title", "VibeBase");
    }

    let response = req
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        println!("❌ [OpenAI Provider] API Error: {} - {}", status, error_text);
        return Err(format!("API error {}: {}", status, error_text));
    }

    println!("✅ [OpenAI Provider] Request successful");

    let api_response: OpenAIResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let output = api_response.choices[0].message.content.clone();
    Ok((output, api_response.usage))
}















