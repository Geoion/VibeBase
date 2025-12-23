use rusqlite::{Connection, Result, params};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// Global Application Database (~/.vibebase/app.db)
/// Stores LLM configurations, app settings, recent projects
pub struct AppDatabase {
    pub conn: Connection,  // Make public for variables commands
}

impl AppDatabase {
    pub fn new() -> Result<Self> {
        let db_path = Self::get_db_path();
        
        // Create directory if it doesn't exist
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(db_path)?;
        
        // Initialize schema
        conn.execute_batch(include_str!("../sql/app_schema.sql"))?;

        let db = Self { conn };
        
        // Run migrations
        db.migrate_v0_1_11()?;

        Ok(db)
    }

    fn get_db_path() -> PathBuf {
        let home = dirs_next::home_dir().unwrap_or_else(|| PathBuf::from("."));
        home.join(".vibebase").join("app.db")
    }

    pub fn save_llm_provider(&self, config: &LLMProviderConfig) -> Result<()> {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
        
        self.conn.execute(
            "INSERT INTO llm_providers (id, name, provider, model, base_url, api_key, api_key_source, api_key_ref, parameters, enabled, enabled_models, is_default, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
             ON CONFLICT(name) DO UPDATE SET
                provider = ?3,
                model = ?4,
                base_url = ?5,
                api_key = ?6,
                api_key_source = ?7,
                api_key_ref = ?8,
                parameters = ?9,
                enabled = ?10,
                enabled_models = ?11,
                is_default = ?12,
                updated_at = ?14",
            params![
                config.id,
                config.name,
                config.provider,
                config.model,
                config.base_url,
                config.api_key,
                config.api_key_source,
                config.api_key_ref,
                config.parameters,
                config.enabled as i32,
                config.enabled_models,
                config.is_default as i32,
                now,
                now,
            ],
        )?;

        Ok(())
    }

    pub fn get_llm_provider(&self, name: &str) -> Result<LLMProviderConfig> {
        self.conn.query_row(
            "SELECT id, name, provider, model, base_url, api_key, api_key_source, api_key_ref, parameters, enabled, enabled_models, is_default
             FROM llm_providers WHERE name = ?1",
            params![name],
            |row| {
                Ok(LLMProviderConfig {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    provider: row.get(2)?,
                    model: row.get(3)?,
                    base_url: row.get(4)?,
                    api_key: row.get(5)?,
                    api_key_source: row.get(6)?,
                    api_key_ref: row.get(7)?,
                    parameters: row.get(8)?,
                    enabled: row.get::<_, i32>(9)? != 0,
                    enabled_models: row.get(10)?,
                    is_default: row.get::<_, i32>(11)? != 0,
                })
            },
        )
    }

    pub fn list_llm_providers(&self) -> Result<Vec<LLMProviderConfig>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, provider, model, base_url, api_key, api_key_source, api_key_ref, parameters, enabled, enabled_models, is_default
             FROM llm_providers ORDER BY name"
        )?;

        let providers = stmt.query_map([], |row| {
            Ok(LLMProviderConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                provider: row.get(2)?,
                model: row.get(3)?,
                base_url: row.get(4)?,
                api_key: row.get(5)?,
                api_key_source: row.get(6)?,
                api_key_ref: row.get(7)?,
                parameters: row.get(8)?,
                enabled: row.get::<_, i32>(9)? != 0,
                enabled_models: row.get(10)?,
                is_default: row.get::<_, i32>(11)? != 0,
            })
        })?;

        providers.collect()
    }

    pub fn delete_llm_provider(&self, name: &str) -> Result<()> {
        self.conn.execute("DELETE FROM llm_providers WHERE name = ?1", params![name])?;
        Ok(())
    }

    /// Migrate data for v0.1.11
    /// Fixes provider naming convention for built-in providers
    fn migrate_v0_1_11(&self) -> Result<()> {
        // Check if migration already applied
        let migration_applied: bool = self.conn
            .query_row(
                "SELECT COUNT(*) FROM schema_version WHERE version = '1.1.0'",
                [],
                |row| row.get::<_, i32>(0).map(|count| count > 0),
            )
            .unwrap_or(false);

        if migration_applied {
            return Ok(());
        }

        println!("🔄 [Migration] Running v0.1.11 migration...");

        // List of built-in provider IDs
        let builtin_ids = vec!["openai", "anthropic", "deepseek", "openrouter", "ollama", "aihubmix", "google", "azure", "github"];

        // Migrate built-in providers: remove _default suffix if exists
        for provider_id in builtin_ids {
            let old_name_with_suffix = format!("{}_default", provider_id);
            
            // Check if there's a provider with {id}_default format (needs migration)
            let has_old_format = self.conn
                .query_row(
                    "SELECT COUNT(*) FROM llm_providers WHERE name = ?1",
                    params![old_name_with_suffix],
                    |row| row.get::<_, i32>(0),
                )
                .unwrap_or(0) > 0;

            if has_old_format {
                // Check if simple name already exists
                let simple_name_exists = self.conn
                    .query_row(
                        "SELECT COUNT(*) FROM llm_providers WHERE name = ?1",
                        params![provider_id],
                        |row| row.get::<_, i32>(0),
                    )
                    .unwrap_or(0) > 0;

                if !simple_name_exists {
                    // Rename from {id}_default to {id}
                    println!("🔄 [Migration] Simplifying {} -> {}", old_name_with_suffix, provider_id);
                    self.conn.execute(
                        "UPDATE llm_providers SET name = ?1 WHERE name = ?2",
                        params![provider_id, old_name_with_suffix],
                    )?;
                    println!("✅ [Migration] Renamed to {}", provider_id);
                } else {
                    println!("⚠️ [Migration] {} already exists, keeping {}", provider_id, old_name_with_suffix);
                }
            }
        }

        // Migrate custom providers from 'openai' type to 'custom' type
        println!("🔄 [Migration] Migrating custom providers to 'custom' type...");
        
        // Find all custom providers (provider='openai' with custom base_url)
        let custom_provider_names: Vec<String> = {
            let mut stmt = self.conn.prepare(
                "SELECT name FROM llm_providers 
                 WHERE provider = 'openai' AND base_url IS NOT NULL AND base_url != '' 
                 AND base_url NOT LIKE '%api.openai.com%' AND name != 'openai_default'"
            )?;
            
            let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
            rows.collect::<Result<Vec<_>>>()?
        };

        for name in custom_provider_names {
            println!("🔄 [Migration] Migrating custom provider '{}' to 'custom' type", name);
            self.conn.execute(
                "UPDATE llm_providers SET provider = 'custom', enabled_models = '[]' WHERE name = ?1",
                params![name],
            )?;
            println!("✅ [Migration] Migrated '{}' and cleared its model list", name);
        }

        // Mark migration as applied
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
        self.conn.execute(
            "INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (?1, ?2)",
            params!["1.1.0", now],
        )?;

        println!("✅ [Migration] v0.1.11 migration completed");

        Ok(())
    }

    pub fn save_app_setting(&self, key: &str, value: &str) -> Result<()> {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
        
        self.conn.execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
            params![key, value, now],
        )?;
        Ok(())
    }

    pub fn get_app_setting(&self, key: &str) -> Result<String> {
        self.conn.query_row(
            "SELECT value FROM app_settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
    }
}

#[derive(Debug, Clone)]
pub struct LLMProviderConfig {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub model: String,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub api_key_source: String,
    pub api_key_ref: Option<String>,
    pub parameters: Option<String>,
    pub enabled: bool,
    pub enabled_models: Option<String>,
    pub is_default: bool,
}

/// Project Database ({project}/.vibebase/project.db)
/// Stores file metadata, execution history, evaluation results
pub struct ProjectDatabase {
    conn: Connection,
}

impl ProjectDatabase {
    pub fn new(workspace_path: &Path) -> Result<Self> {
        let db_dir = workspace_path.join(".vibebase");
        std::fs::create_dir_all(&db_dir).ok();
        
        let db_path = db_dir.join("project.db");
        let conn = Connection::open(db_path)?;
        
        // Initialize schema
        conn.execute_batch(include_str!("../sql/project_schema.sql"))?;

        Ok(Self { conn })
    }

    pub fn get_connection(&self) -> &Connection {
        &self.conn
    }

    pub fn register_prompt_file(&self, metadata: &PromptFileMetadata) -> Result<()> {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
        
        self.conn.execute(
            "INSERT INTO prompt_files (
                id, file_path, name, description, schema_version,
                provider_ref, model_override, parameters,
                test_data_path, evaluation_config,
                tags, variables,
                file_hash, file_size, last_modified,
                last_validated, validation_status, validation_errors,
                created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)
             ON CONFLICT(file_path) DO UPDATE SET
                name = ?3,
                description = ?4,
                provider_ref = ?6,
                model_override = ?7,
                parameters = ?8,
                test_data_path = ?9,
                evaluation_config = ?10,
                tags = ?11,
                variables = ?12,
                file_hash = ?13,
                file_size = ?14,
                last_modified = ?15,
                updated_at = ?20",
            params![
                metadata.id,
                metadata.file_path,
                metadata.name,
                metadata.description,
                metadata.schema_version,
                metadata.provider_ref,
                metadata.model_override,
                metadata.parameters,
                metadata.test_data_path,
                metadata.evaluation_config,
                metadata.tags,
                metadata.variables,
                metadata.file_hash,
                metadata.file_size,
                metadata.last_modified,
                metadata.last_validated,
                metadata.validation_status,
                metadata.validation_errors,
                now,
                now,
            ],
        )?;

        Ok(())
    }

    /// Update only the user-editable metadata fields
    pub fn update_prompt_metadata(
        &self,
        file_path: &str,
        provider_ref: &str,
        model_override: Option<&str>,
        parameters: Option<&str>,
        tags: Option<&str>,
        test_data_path: Option<&str>,
    ) -> Result<()> {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
        
        self.conn.execute(
            "UPDATE prompt_files SET
                provider_ref = ?2,
                model_override = ?3,
                parameters = ?4,
                tags = ?5,
                test_data_path = ?6,
                updated_at = ?7
             WHERE file_path = ?1",
            params![
                file_path,
                provider_ref,
                model_override,
                parameters,
                tags,
                test_data_path,
                now,
            ],
        )?;
        
        Ok(())
    }

    /// Ensure a prompt file record exists (create if not)
    pub fn ensure_prompt_file(&self, file_path: &str) -> Result<String> {
        // Check if exists
        let existing_id: Option<String> = self.conn.query_row(
            "SELECT id FROM prompt_files WHERE file_path = ?1",
            params![file_path],
            |row| row.get(0),
        ).ok();
        
        if let Some(id) = existing_id {
            return Ok(id);
        }
        
        // Create new record
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
        let id = uuid::Uuid::new_v4().to_string();
        let name = std::path::Path::new(file_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();
        
        self.conn.execute(
            "INSERT INTO prompt_files (
                id, file_path, name, schema_version, provider_ref,
                file_hash, file_size, last_modified, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                id,
                file_path,
                name,
                "v1",
                "default",
                "",
                0i64,
                now,
                now,
                now,
            ],
        )?;
        
        Ok(id)
    }

    pub fn get_prompt_metadata(&self, file_path: &str) -> Result<PromptFileMetadata> {
        self.conn.query_row(
            "SELECT id, file_path, name, description, schema_version,
                    provider_ref, model_override, parameters,
                    test_data_path, evaluation_config,
                    tags, variables,
                    file_hash, file_size, last_modified,
                    last_validated, validation_status, validation_errors
             FROM prompt_files WHERE file_path = ?1",
            params![file_path],
            |row| {
                Ok(PromptFileMetadata {
                    id: row.get(0)?,
                    file_path: row.get(1)?,
                    name: row.get(2)?,
                    description: row.get(3)?,
                    schema_version: row.get(4)?,
                    provider_ref: row.get(5)?,
                    model_override: row.get(6)?,
                    parameters: row.get(7)?,
                    test_data_path: row.get(8)?,
                    evaluation_config: row.get(9)?,
                    tags: row.get(10)?,
                    variables: row.get(11)?,
                    file_hash: row.get(12)?,
                    file_size: row.get(13)?,
                    last_modified: row.get(14)?,
                    last_validated: row.get(15)?,
                    validation_status: row.get(16)?,
                    validation_errors: row.get(17)?,
                })
            },
        )
    }

    pub fn list_prompt_files(&self) -> Result<Vec<PromptFileMetadata>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, file_path, name, description, schema_version,
                    provider_ref, model_override, parameters,
                    test_data_path, evaluation_config,
                    tags, variables,
                    file_hash, file_size, last_modified,
                    last_validated, validation_status, validation_errors
             FROM prompt_files ORDER BY file_path"
        )?;

        let files = stmt.query_map([], |row| {
            Ok(PromptFileMetadata {
                id: row.get(0)?,
                file_path: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                schema_version: row.get(4)?,
                provider_ref: row.get(5)?,
                model_override: row.get(6)?,
                parameters: row.get(7)?,
                test_data_path: row.get(8)?,
                evaluation_config: row.get(9)?,
                tags: row.get(10)?,
                variables: row.get(11)?,
                file_hash: row.get(12)?,
                file_size: row.get(13)?,
                last_modified: row.get(14)?,
                last_validated: row.get(15)?,
                validation_status: row.get(16)?,
                validation_errors: row.get(17)?,
            })
        })?;

        files.collect()
    }

    // Note: Execution history methods (save_execution, get_recent_executions) 
    // are not currently used but kept for future implementation.

    /// Save file history if content has changed
    /// Returns true if a new history entry was created, false if content unchanged
    pub fn save_file_history(&self, file_path: &str, content: &str) -> Result<bool> {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        // Calculate content hash
        let mut hasher = DefaultHasher::new();
        content.hash(&mut hasher);
        let content_hash = format!("{:x}", hasher.finish());
        
        // Check if the same hash already exists for this file (most recent)
        let existing: Option<String> = self.conn.query_row(
            "SELECT content_hash FROM file_history WHERE file_path = ?1 ORDER BY created_at DESC LIMIT 1",
            params![file_path],
            |row| row.get(0),
        ).ok();
        
        if existing.as_ref() == Some(&content_hash) {
            // Content hasn't changed
            return Ok(false);
        }
        
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
        let id = uuid::Uuid::new_v4().to_string();
        
        self.conn.execute(
            "INSERT INTO file_history (id, file_path, content, content_hash, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, file_path, content, content_hash, now],
        )?;
        
        Ok(true)
    }
    
    /// Get file history entries for a file
    pub fn get_file_history(&self, file_path: &str, limit: usize) -> Result<Vec<FileHistoryEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, file_path, content_hash, created_at, 
                    substr(content, 1, 200) as preview
             FROM file_history 
             WHERE file_path = ?1 
             ORDER BY created_at DESC 
             LIMIT ?2"
        )?;
        
        let entries = stmt.query_map(params![file_path, limit], |row| {
            Ok(FileHistoryEntry {
                id: row.get(0)?,
                file_path: row.get(1)?,
                content_hash: row.get(2)?,
                created_at: row.get(3)?,
                preview: row.get(4)?,
            })
        })?;
        
        entries.collect()
    }
    
    /// Get the full content of a history entry
    pub fn get_history_content(&self, history_id: &str) -> Result<String> {
        self.conn.query_row(
            "SELECT content FROM file_history WHERE id = ?1",
            params![history_id],
            |row| row.get(0),
        )
    }
    
    /// Delete all data related to a file (history, metadata, execution history, etc.)
    pub fn delete_file_related_data(&self, file_path: &str) -> Result<()> {
        // Delete file history
        self.conn.execute(
            "DELETE FROM file_history WHERE file_path = ?1",
            params![file_path],
        )?;
        
        // Get the prompt file id first for cascade deletion
        let prompt_file_id: Option<String> = self.conn.query_row(
            "SELECT id FROM prompt_files WHERE file_path = ?1",
            params![file_path],
            |row| row.get(0),
        ).ok();
        
        // Delete prompt file metadata (this will cascade to execution_history, etc.)
        self.conn.execute(
            "DELETE FROM prompt_files WHERE file_path = ?1",
            params![file_path],
        )?;
        
        // Also clean up any orphaned execution history that might not cascade
        if let Some(id) = prompt_file_id {
            self.conn.execute(
                "DELETE FROM execution_history WHERE prompt_file_id = ?1",
                params![id],
            )?;
        }
        
        Ok(())
    }

    /// Save arena battle result
    pub fn save_arena_battle(
        &self,
        prompt_file_id: Option<String>,
        prompt_content: &str,
        input_variables: &str,  // JSON
        models: &str,           // JSON array
        outputs: &str,          // JSON array
    ) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
        
        self.conn.execute(
            "INSERT INTO arena_battles (
                id, prompt_file_id, prompt_content, input_variables,
                models, outputs, winner_model, votes, timestamp
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                id,
                prompt_file_id,
                prompt_content,
                input_variables,
                models,
                outputs,
                None::<String>,  // winner_model
                None::<String>,  // votes
                now,
            ],
        )?;
        
        Ok(id)
    }

    /// Get arena battles for a specific prompt
    pub fn get_arena_battles(&self, prompt_file_id: Option<&str>, limit: usize) -> Result<Vec<ArenaBattle>> {
        let (query, params): (&str, Vec<Box<dyn rusqlite::ToSql>>) = if let Some(file_id) = prompt_file_id {
            (
                "SELECT id, prompt_file_id, prompt_content, input_variables, models, outputs, winner_model, votes, timestamp
                 FROM arena_battles
                 WHERE prompt_file_id = ?1
                 ORDER BY timestamp DESC
                 LIMIT ?2",
                vec![Box::new(file_id.to_string()), Box::new(limit as i64)]
            )
        } else {
            (
                "SELECT id, prompt_file_id, prompt_content, input_variables, models, outputs, winner_model, votes, timestamp
                 FROM arena_battles
                 ORDER BY timestamp DESC
                 LIMIT ?1",
                vec![Box::new(limit as i64)]
            )
        };

        let mut stmt = self.conn.prepare(query)?;
        
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        
        let battles = stmt.query_map(params_refs.as_slice(), |row| {
            Ok(ArenaBattle {
                id: row.get(0)?,
                prompt_file_id: row.get(1)?,
                prompt_content: row.get(2)?,
                input_variables: row.get(3)?,
                models: row.get(4)?,
                outputs: row.get(5)?,
                winner_model: row.get(6)?,
                votes: row.get(7)?,
                timestamp: row.get(8)?,
            })
        })?;

        battles.collect()
    }

    /// Update arena battle votes and winner
    pub fn update_arena_votes(
        &self,
        battle_id: &str,
        winner_model: Option<String>,
        votes: &str,  // JSON
    ) -> Result<()> {
        self.conn.execute(
            "UPDATE arena_battles SET winner_model = ?1, votes = ?2 WHERE id = ?3",
            params![winner_model, votes, battle_id],
        )?;
        Ok(())
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ArenaBattle {
    pub id: String,
    pub prompt_file_id: Option<String>,
    pub prompt_content: String,
    pub input_variables: String,  // JSON
    pub models: String,            // JSON array
    pub outputs: String,           // JSON array
    pub winner_model: Option<String>,
    pub votes: Option<String>,
    pub timestamp: i64,
}

/// File history entry for version control
#[derive(Debug, Clone)]
pub struct FileHistoryEntry {
    pub id: String,
    pub file_path: String,
    pub content_hash: String,
    pub created_at: i64,
    pub preview: String,
}

#[derive(Debug, Clone)]
pub struct PromptFileMetadata {
    pub id: String,
    pub file_path: String,
    pub name: String,
    pub description: Option<String>,
    pub schema_version: String,
    pub provider_ref: String,
    pub model_override: Option<String>,
    pub parameters: Option<String>,
    pub test_data_path: Option<String>,
    pub evaluation_config: Option<String>,
    pub tags: Option<String>,
    pub variables: Option<String>,
    pub file_hash: String,
    pub file_size: i64,
    pub last_modified: i64,
    pub last_validated: Option<i64>,
    pub validation_status: Option<String>,
    pub validation_errors: Option<String>,
}







