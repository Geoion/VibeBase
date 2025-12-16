use crate::models::prompt::{PromptRuntime, parse_markdown_prompt, ModelConfig, Provider, ModelParameters};
use std::fs;
use std::path::Path;

#[tauri::command]
pub fn read_prompt(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_prompt_runtime(file_path: String) -> Result<PromptRuntime, String> {
    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    
    // Determine file type by extension
    if file_path.ends_with(".vibe.md") {
        // Parse Markdown file
        let messages = parse_markdown_prompt(&content)?;
        
        // For Markdown files, metadata comes from database
        // For now, return a basic runtime with placeholder config
        Ok(PromptRuntime {
            schema: "v1".to_string(),
            name: Path::new(&file_path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Untitled")
                .to_string(),
            description: None,
            config: ModelConfig {
                provider: Provider::OpenAI,
                model: "gpt-4o-mini".to_string(),
                parameters: Some(ModelParameters {
                    temperature: Some(0.7),
                    top_p: None,
                    max_tokens: None,
                }),
            },
            test_data: None,
            messages,
            evaluation: None,
        })
    } else {
        // Parse YAML file (legacy support)
        parse_yaml(content)
    }
}

#[tauri::command]
pub fn save_prompt(file_path: String, content: String) -> Result<(), String> {
    // Create parent directories if they don't exist
    if let Some(parent) = Path::new(&file_path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    
    fs::write(&file_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn create_new_prompt(
    workspace_path: String,
    relative_path: String,
) -> Result<String, String> {
    let file_path = Path::new(&workspace_path).join(&relative_path);
    
    // Check if file already exists
    if file_path.exists() {
        return Err(format!("File already exists: {}", relative_path));
    }

    // Create parent directories
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Create template content based on file extension
    let template = if relative_path.ends_with(".vibe.md") {
        // Markdown template
        r#"# New Prompt

## System Message

You are a helpful assistant.

## User Message

Your prompt content here.
Use {{variable_name}} for variables.
"#
    } else {
        // YAML template (legacy)
        r#"schema: "v1"
name: "New Prompt"
description: "Description of your prompt"

config:
  provider: openai
  model: "gpt-4o-mini"
  parameters:
    temperature: 0.7

messages:
  - role: system
    content: "You are a helpful assistant."
  
  - role: user
    content: |
      Your prompt content here.
      Use {{variable_name}} for variables.
"#
    };

    fs::write(&file_path, template).map_err(|e| e.to_string())?;
    
    Ok(file_path.to_str().unwrap_or("").to_string())
}

#[tauri::command]
pub fn parse_yaml(content: String) -> Result<PromptRuntime, String> {
    serde_yaml::from_str::<PromptRuntime>(&content).map_err(|e| {
        format!("YAML parse error: {}", e)
    })
}

#[tauri::command]
pub fn extract_variables(content: String) -> Result<Vec<String>, String> {
    let prompt = parse_yaml(content)?;
    Ok(prompt.extract_variables())
}

#[tauri::command]
pub fn extract_variables_from_markdown(content: String) -> Result<Vec<String>, String> {
    let messages = parse_markdown_prompt(&content)?;
    
    let mut variables = Vec::new();
    let regex = regex::Regex::new(r"\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}").unwrap();

    for message in &messages {
        for cap in regex.captures_iter(&message.content) {
            let var_name = cap[1].to_string();
            if !variables.contains(&var_name) {
                variables.push(var_name);
            }
        }
    }

    Ok(variables)
}
