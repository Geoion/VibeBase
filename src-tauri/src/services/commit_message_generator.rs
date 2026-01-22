use anyhow::{anyhow, Result};
use crate::models::prompt::Provider;
use crate::models::execution::OpenAIMessage;
use crate::services::providers;
use crate::services::database::AppDatabase;

pub struct CommitMessageGenerator;

impl CommitMessageGenerator {
    pub fn new() -> Self {
        Self
    }

    /// Generate commit message from git diff using LLM
    pub async fn generate(
        &self,
        diff: &str,
        style: &str,      // 'concise' | 'detailed'
        language: &str,   // 'auto' | 'zh-CN' | 'en'
        provider_ref: Option<&str>,
    ) -> Result<String> {
        // Check if diff is empty
        if diff.trim().is_empty() {
            return Err(anyhow!("No changes to commit"));
        }

        // Determine language for prompt
        let lang_instruction = match language {
            "zh-CN" => "请用中文回复。",
            "en" => "Please respond in English.",
            _ => "Respond in the same language as the system.",
        };

        // Build prompt based on style
        let system_prompt = match style {
            "concise" => {
                format!(
                    "You are an expert at writing concise git commit messages following Conventional Commits format.\n\n\
                    Rules:\n\
                    1. Use the format: <type>(<scope>): <description>\n\
                    2. Type must be one of: feat, fix, docs, style, refactor, test, chore, perf\n\
                    3. Description should be brief (max 50 characters)\n\
                    4. Use imperative mood (\"add\" not \"added\")\n\
                    5. No period at the end\n\
                    6. Focus on WHAT changed, not HOW\n\n\
                    {}\n\n\
                    Output ONLY the commit message, nothing else.",
                    lang_instruction
                )
            }
            "detailed" => {
                format!(
                    "You are an expert at writing comprehensive git commit messages following Conventional Commits format.\n\n\
                    Rules:\n\
                    1. Use the format:\n\
                       <type>(<scope>): <short description>\n\n\
                       <detailed description>\n\n\
                       <optional footer>\n\n\
                    2. Type must be one of: feat, fix, docs, style, refactor, test, chore, perf, build, ci\n\
                    3. Short description: imperative mood, max 72 characters, no period\n\
                    4. Detailed description:\n\
                       - Explain WHY the change was made\n\
                       - Describe WHAT changed at a high level\n\
                       - Include any side effects or implications\n\
                       - Wrap at 72 characters\n\
                    5. Footer (optional):\n\
                       - Breaking changes: BREAKING CHANGE: <description>\n\
                       - Issue references: Refs #123, Fixes #456\n\n\
                    {}\n\n\
                    Output ONLY the commit message, nothing else.",
                    lang_instruction
                )
            }
            _ => {
                return Err(anyhow!("Invalid style: {}. Must be 'concise' or 'detailed'", style));
            }
        };

        let user_prompt = format!(
            "Based on the following git diff, generate a commit message:\n\n```diff\n{}\n```",
            diff
        );

        // Get LLM configuration
        let (provider, model, api_key, base_url) = if let Some(prov_ref) = provider_ref {
            // Use specified provider
            match self.resolve_provider(prov_ref) {
                Ok(config) => config,
                Err(e) => {
                    eprintln!("⚠️ Failed to resolve provider '{}': {}", prov_ref, e);
                    eprintln!("⚠️ Using fallback generation");
                    return Ok(self.generate_fallback(diff, style, language));
                }
            }
        } else {
            // Try to get default provider
            match self.get_default_provider() {
                Ok(config) => config,
                Err(e) => {
                    eprintln!("⚠️ No LLM provider configured: {}", e);
                    eprintln!("⚠️ Using fallback generation");
                    eprintln!("💡 Tip: Configure an LLM provider in Settings → LLM Providers");
                    return Ok(self.generate_fallback(diff, style, language));
                }
            }
        };

        // Call LLM
        let result = match self.call_llm(
            &provider,
            &model,
            &api_key,
            base_url.as_deref(),
            &system_prompt,
            &user_prompt,
        ).await {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("⚠️ LLM call failed: {}", e);
                eprintln!("⚠️ Using fallback generation");
                return Ok(self.generate_fallback(diff, style, language));
            }
        };

        // Clean up the result
        let commit_msg = result.trim().to_string();
        
        // Validate basic format
        if commit_msg.is_empty() {
            return Err(anyhow!("LLM returned empty commit message"));
        }

        Ok(commit_msg)
    }

    /// Resolve provider configuration
    fn resolve_provider(&self, provider_ref: &str) -> Result<(Provider, String, String, Option<String>)> {
        println!("🔍 [CommitMsg] Resolving provider: {}", provider_ref);
        
        let app_db = AppDatabase::new()
            .map_err(|e| anyhow!("Failed to open app database: {}", e))?;
            
        let config = app_db.get_llm_provider(provider_ref)
            .map_err(|e| anyhow!("Provider '{}' not found: {}", provider_ref, e))?;

        println!("🔍 [CommitMsg] Provider config found:");
        println!("   - Provider: {}", config.provider);
        println!("   - Model: {}", config.model);
        println!("   - API Key Source: {}", config.api_key_source);
        println!("   - API Key Ref: {:?}", config.api_key_ref);

        let provider = match config.provider.as_str() {
            "openai" => Provider::OpenAI,
            "anthropic" => Provider::Anthropic,
            "deepseek" => Provider::DeepSeek,
            "openrouter" => Provider::OpenRouter,
            "ollama" => Provider::Ollama,
            "azure_openai" => Provider::AzureOpenAI,
            "google" => Provider::Google,
            "aihubmix" => Provider::AiHubMix,
            "github" => Provider::GitHub,
            "custom" => Provider::Custom,
            _ => return Err(anyhow!("Unsupported provider: {}", config.provider)),
        };

        // Get API key based on api_key_source
        let api_key = match config.api_key_source.as_str() {
            "direct" => {
                println!("🔑 [CommitMsg] Using direct API key");
                if let Some(key) = &config.api_key {
                    if key.is_empty() {
                        return Err(anyhow!("Direct API key is empty"));
                    }
                    println!("✅ [CommitMsg] Direct API key found (length: {} chars)", key.len());
                    key.clone()
                } else {
                    return Err(anyhow!("No API key found in direct config"));
                }
            }
            "keychain" => {
                if let Some(key_ref) = &config.api_key_ref {
                    println!("🔑 [CommitMsg] Getting API key from keychain: {}", key_ref);
                    match crate::services::keychain::KeychainService::get_api_key(key_ref) {
                        Ok(key) => {
                            println!("✅ [CommitMsg] API key retrieved successfully (length: {} chars)", key.len());
                            key
                        }
                        Err(e) => {
                            return Err(anyhow!("Failed to get API key from keychain '{}': {}", key_ref, e));
                        }
                    }
                } else {
                    return Err(anyhow!("No API key reference found in keychain config"));
                }
            }
            "env_var" => {
                if let Some(env_var) = &config.api_key_ref {
                    println!("🔑 [CommitMsg] Getting API key from env var: {}", env_var);
                    match std::env::var(env_var) {
                        Ok(key) => {
                            println!("✅ [CommitMsg] API key from env (length: {} chars)", key.len());
                            key
                        }
                        Err(_) => {
                            return Err(anyhow!("Environment variable '{}' not found", env_var));
                        }
                    }
                } else {
                    return Err(anyhow!("No environment variable specified for API key"));
                }
            }
            _ => return Err(anyhow!("Invalid API key source: {}", config.api_key_source)),
        };

        println!("✅ [CommitMsg] Provider resolved successfully");
        Ok((provider, config.model, api_key, config.base_url))
    }

    /// Get default provider from app settings or first available
    fn get_default_provider(&self) -> Result<(Provider, String, String, Option<String>)> {
        println!("🔍 [CommitMsg] Getting default provider...");
        
        let app_db = AppDatabase::new()
            .map_err(|e| anyhow!("Failed to open app database: {}", e))?;
            
        let providers = app_db.list_llm_providers()
            .map_err(|e| anyhow!("Failed to list providers: {}", e))?;

        println!("🔍 [CommitMsg] Found {} LLM provider(s)", providers.len());

        if providers.is_empty() {
            return Err(anyhow!("No LLM providers configured"));
        }

        // Use first provider
        let config = &providers[0];
        println!("🔍 [CommitMsg] Using first provider: {}", config.name);
        self.resolve_provider(&config.name)
    }

    /// Call LLM with the given parameters
    async fn call_llm(
        &self,
        provider: &Provider,
        model: &str,
        api_key: &str,
        base_url: Option<&str>,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<String> {
        println!("📤 [CommitMsg] Calling LLM...");
        println!("   - Provider: {:?}", provider);
        println!("   - Model: {}", model);
        println!("   - API Key length: {} chars", api_key.len());
        println!("   - Base URL: {:?}", base_url);
        
        // Build messages
        let messages = vec![
            OpenAIMessage {
                role: "system".to_string(),
                content: system_prompt.to_string(),
            },
            OpenAIMessage {
                role: "user".to_string(),
                content: user_prompt.to_string(),
            },
        ];

        println!("📤 [CommitMsg] Messages prepared, calling API...");

        // Call provider
        let (output, usage) = providers::execute_with_provider(
            provider,
            model,
            messages,
            0.3, // Low temperature for consistent output
            api_key,
            base_url,
        ).await.map_err(|e| anyhow!(e))?;

        println!("✅ [CommitMsg] LLM call successful!");
        println!("   - Output length: {} chars", output.len());
        println!("   - Tokens used: {} input, {} output", usage.prompt_tokens, usage.completion_tokens);

        Ok(output)
    }

    /// Fallback: Generate simple commit message without LLM
    fn generate_fallback(&self, diff: &str, style: &str, language: &str) -> String {
        let lines = diff.lines().collect::<Vec<_>>();
        let mut files_changed = Vec::new();
        let mut additions = 0;
        let mut deletions = 0;
        let mut new_files = 0;
        let mut deleted_files = 0;

        for line in lines {
            if line.starts_with("+++") {
                if let Some(file) = line.split_whitespace().nth(1) {
                    if file != "/dev/null" {
                        let clean_file = file.trim_start_matches("b/");
                        if !files_changed.contains(&clean_file) {
                            files_changed.push(clean_file);
                        }
                    } else {
                        deleted_files += 1;
                    }
                }
            } else if line.starts_with("---") {
                if let Some(file) = line.split_whitespace().nth(1) {
                    if file == "/dev/null" {
                        new_files += 1;
                    }
                }
            } else if line.starts_with('+') && !line.starts_with("+++") {
                additions += 1;
            } else if line.starts_with('-') && !line.starts_with("---") {
                deletions += 1;
            }
        }

        // Analyze file types and determine commit type
        let (commit_type, scope) = self.analyze_file_types(&files_changed);
        
        let file_count = files_changed.len();
        let file_list = if file_count <= 3 {
            files_changed.join(", ")
        } else {
            format!("{} files", file_count)
        };

        match (style, language) {
            ("concise", "zh-CN") => {
                if new_files > 0 {
                    format!("feat({}): 新增 {}", scope, file_list)
                } else if deleted_files > 0 {
                    format!("refactor({}): 删除 {}", scope, file_list)
                } else {
                    format!("{}({}): 更新 {}", commit_type, scope, file_list)
                }
            }
            ("concise", _) => {
                if new_files > 0 {
                    format!("feat({}): add {}", scope, file_list)
                } else if deleted_files > 0 {
                    format!("refactor({}): remove {}", scope, file_list)
                } else {
                    format!("{}({}): update {}", commit_type, scope, file_list)
                }
            }
            ("detailed", "zh-CN") => {
                let mut details = Vec::new();
                if new_files > 0 {
                    details.push(format!("- 新增 {} 个文件", new_files));
                }
                if deleted_files > 0 {
                    details.push(format!("- 删除 {} 个文件", deleted_files));
                }
                if additions > 0 {
                    details.push(format!("- 新增 {} 行代码", additions));
                }
                if deletions > 0 {
                    details.push(format!("- 删除 {} 行代码", deletions));
                }
                
                let action = if new_files > 0 { "新增" } else if deleted_files > 0 { "删除" } else { "更新" };
                let file_desc = if file_count == 1 { 
                    files_changed[0].to_string() 
                } else { 
                    format!("{} 个文件", file_count) 
                };
                format!(
                    "{}({}): {} {}\n\n修改内容：\n{}\n\n涉及文件：\n{}",
                    commit_type,
                    scope,
                    action,
                    file_desc,
                    details.join("\n"),
                    files_changed.iter().map(|f| format!("- {}", f)).collect::<Vec<_>>().join("\n")
                )
            }
            _ => {
                let mut details = Vec::new();
                if new_files > 0 {
                    details.push(format!("- {} new file(s)", new_files));
                }
                if deleted_files > 0 {
                    details.push(format!("- {} deleted file(s)", deleted_files));
                }
                if additions > 0 {
                    details.push(format!("- {} additions", additions));
                }
                if deletions > 0 {
                    details.push(format!("- {} deletions", deletions));
                }
                
                let action = if new_files > 0 { "add" } else if deleted_files > 0 { "remove" } else { "update" };
                let file_desc = if file_count == 1 { 
                    files_changed[0].to_string() 
                } else { 
                    format!("{} files", file_count) 
                };
                format!(
                    "{}({}): {} {}\n\nChanges:\n{}\n\nFiles modified:\n{}",
                    commit_type,
                    scope,
                    action,
                    file_desc,
                    details.join("\n"),
                    files_changed.iter().map(|f| format!("- {}", f)).collect::<Vec<_>>().join("\n")
                )
            }
        }
    }

    /// Analyze file types to determine commit type and scope
    fn analyze_file_types(&self, files: &[&str]) -> (&str, &str) {
        let mut has_docs = false;
        let mut has_tests = false;
        let mut has_config = false;
        let mut has_ui = false;
        let mut has_backend = false;
        let mut has_db = false;

        for file in files {
            let lower = file.to_lowercase();
            if lower.contains("readme") || lower.contains(".md") && !lower.contains(".vibe.md") {
                has_docs = true;
            } else if lower.contains("test") || lower.contains("spec") {
                has_tests = true;
            } else if lower.contains("config") || lower.ends_with(".json") || lower.ends_with(".toml") || lower.ends_with(".yaml") || lower.ends_with(".yml") {
                has_config = true;
            } else if lower.contains("component") || lower.contains("ui") || lower.ends_with(".tsx") || lower.ends_with(".css") {
                has_ui = true;
            } else if lower.ends_with(".rs") || lower.contains("api") || lower.contains("service") {
                has_backend = true;
            } else if lower.contains("sql") || lower.contains("database") || lower.contains(".db") {
                has_db = true;
            }
        }

        // Determine commit type and scope
        let commit_type = if has_tests {
            "test"
        } else if has_docs {
            "docs"
        } else if has_config {
            "chore"
        } else {
            "feat"
        };

        let scope = if has_ui {
            "ui"
        } else if has_backend {
            "backend"
        } else if has_db {
            "database"
        } else if has_docs {
            "docs"
        } else if has_tests {
            "tests"
        } else {
            "core"
        };

        (commit_type, scope)
    }
}
