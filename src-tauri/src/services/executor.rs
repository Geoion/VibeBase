use crate::models::execution::*;
use crate::models::prompt::*;
use crate::services::template::replace_variables;
use crate::services::providers;
use std::collections::HashMap;
use std::time::Instant;
use uuid::Uuid;

pub struct Executor;

impl Executor {
    pub fn new() -> Self {
        Self
    }

    pub async fn execute(
        &self,
        prompt: &PromptRuntime,
        variables: HashMap<String, String>,
        api_key: &str,
        base_url: Option<&str>,
    ) -> Result<ExecutionResult, String> {
        let start = Instant::now();

        // Replace variables in messages
        let mut messages = Vec::new();
        for msg in &prompt.messages {
            let content = replace_variables(&msg.content, &variables)?;
            messages.push(OpenAIMessage {
                role: format!("{:?}", msg.role).to_lowercase(),
                content,
            });
        }

        // Get temperature
        let temperature = prompt
            .config
            .parameters
            .as_ref()
            .and_then(|p| p.temperature)
            .unwrap_or(0.7);

        // Call provider
        let (output, usage) = providers::execute_with_provider(
            &prompt.config.provider,
            &prompt.config.model,
            messages,
            temperature,
            api_key,
            base_url,
        )
        .await?;

        let latency = start.elapsed().as_millis() as u64;

        // Calculate cost
        let cost = calculate_cost(
            &prompt.config.model,
            &prompt.config.provider,
            usage.prompt_tokens,
            usage.completion_tokens,
        );

        Ok(ExecutionResult {
            id: Uuid::new_v4().to_string(),
            output,
            metadata: ExecutionMetadata {
                model: prompt.config.model.clone(),
                provider: format!("{:?}", prompt.config.provider),
                latency_ms: latency,
                tokens_input: usage.prompt_tokens,
                tokens_output: usage.completion_tokens,
                cost_usd: cost,
                timestamp: chrono::Utc::now().timestamp(),
            },
        })
    }
}

fn calculate_cost(model: &str, provider: &Provider, input_tokens: u32, output_tokens: u32) -> f64 {
    let (input_price, output_price) = match provider {
        Provider::OpenAI => match model {
            "gpt-4o" => (2.5, 10.0),
            "gpt-4o-mini" => (0.15, 0.60),
            "gpt-4-turbo" => (10.0, 30.0),
            "gpt-4" => (30.0, 60.0),
            "gpt-3.5-turbo" => (0.5, 1.5),
            _ => (0.0, 0.0),
        },
        Provider::Anthropic => match model {
            "claude-3-opus-20240229" => (15.0, 75.0),
            "claude-3-sonnet-20240229" => (3.0, 15.0),
            "claude-3-haiku-20240307" => (0.25, 1.25),
            "claude-3-5-sonnet-20241022" => (3.0, 15.0),
            _ => (0.0, 0.0),
        },
        Provider::DeepSeek => (0.14, 0.28),     // DeepSeek pricing
        Provider::Ollama => (0.0, 0.0),         // Local, free
        Provider::OpenRouter => (0.0, 0.0),     // Depends on model
        Provider::AiHubMix => (0.0, 0.0),       // Depends on model
        Provider::Google => (0.0, 0.0),         // Google pricing varies
        Provider::GitHub => (0.0, 0.0),         // GitHub pricing
        Provider::Custom => (0.0, 0.0),         // Custom provider, pricing unknown
        _ => (0.0, 0.0),
    };

    let cost_input = (input_tokens as f64 / 1_000_000.0) * input_price;
    let cost_output = (output_tokens as f64 / 1_000_000.0) * output_price;

    cost_input + cost_output
}

