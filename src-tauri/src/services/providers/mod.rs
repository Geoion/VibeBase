pub mod openai;
pub mod anthropic;

use crate::models::execution::*;
use crate::models::prompt::Provider;

pub async fn execute_with_provider(
    provider: &Provider,
    model: &str,
    messages: Vec<OpenAIMessage>,
    temperature: f32,
    api_key: &str,
    base_url: Option<&str>,
) -> Result<(String, OpenAIUsage), String> {
    match provider {
        Provider::OpenAI => {
            openai::execute(model, messages, temperature, api_key, None).await
        }
        Provider::Anthropic => {
            anthropic::execute(model, messages, temperature, api_key).await
        }
        Provider::DeepSeek => {
            let url = base_url.unwrap_or("https://api.deepseek.com/v1");
            openai::execute(model, messages, temperature, api_key, Some(url)).await
        }
        Provider::OpenRouter => {
            let url = base_url.unwrap_or("https://openrouter.ai/api/v1");
            openai::execute(model, messages, temperature, api_key, Some(url)).await
        }
        Provider::Ollama => {
            let url = base_url.unwrap_or("http://localhost:11434/v1");
            openai::execute(model, messages, temperature, "", Some(url)).await
        }
        Provider::AzureOpenAI => {
            Err("Azure OpenAI not yet implemented".to_string())
        }
    }
}






