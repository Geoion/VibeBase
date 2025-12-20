use sha2::{Sha256, Digest};
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;
use uuid::Uuid;
use crate::services::database::{ProjectDatabase, PromptFileMetadata};
use crate::models::prompt::parse_markdown_prompt;

#[allow(dead_code)]
pub struct FileTracker {
    db: ProjectDatabase,
}

#[allow(dead_code)]
impl FileTracker {
    pub fn new(db: ProjectDatabase) -> Self {
        Self { db }
    }

    /// Calculate SHA-256 hash of file content
    pub fn calculate_file_hash(content: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(content);
        format!("{:x}", hasher.finalize())
    }

    /// Register or update a prompt file in the database
    pub fn track_file(&self, file_path: &Path, default_provider_ref: &str) -> Result<String, String> {
        // Read file content
        let content = fs::read(file_path).map_err(|e| format!("Failed to read file: {}", e))?;
        let content_str = String::from_utf8_lossy(&content);
        
        // Calculate hash
        let file_hash = Self::calculate_file_hash(&content);
        
        // Get file size
        let file_size = content.len() as i64;
        
        // Get last modified time
        let metadata = fs::metadata(file_path).map_err(|e| format!("Failed to get metadata: {}", e))?;
        let last_modified = metadata.modified()
            .map_err(|e| format!("Failed to get modified time: {}", e))?
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        // Parse Markdown to extract variables
        let messages = parse_markdown_prompt(&content_str)
            .map_err(|e| format!("Failed to parse Markdown: {}", e))?;
        
        // Extract variables from all messages
        let variables = self.extract_all_variables(&messages);
        let variables_json = serde_json::to_string(&variables).unwrap_or_default();
        
        // Extract name from first H1 or use filename
        let name = self.extract_name_from_markdown(&content_str)
            .unwrap_or_else(|| {
                file_path.file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("Untitled")
                    .to_string()
            });
        
        // Get relative path
        let relative_path = file_path.to_str().ok_or("Invalid file path")?;
        
        // Check if file already exists in database
        let file_id = match self.db.get_prompt_metadata(relative_path) {
            Ok(existing) => {
                // File exists, update it
                existing.id
            }
            Err(_) => {
                // New file, generate ID
                Uuid::new_v4().to_string()
            }
        };
        
        // Create metadata
        let metadata = PromptFileMetadata {
            id: file_id.clone(),
            file_path: relative_path.to_string(),
            name,
            description: None,
            schema_version: "v1".to_string(),
            provider_ref: default_provider_ref.to_string(),
            model_override: None,
            parameters: None,
            test_data_path: None,
            evaluation_config: None,
            tags: None,
            variables: Some(variables_json),
            file_hash,
            file_size,
            last_modified,
            last_validated: None,
            validation_status: Some("pending".to_string()),
            validation_errors: None,
        };
        
        // Save to database
        self.db.register_prompt_file(&metadata)
            .map_err(|e| format!("Failed to save metadata: {}", e))?;
        
        Ok(file_id)
    }

    /// Extract variables from messages
    fn extract_all_variables(&self, messages: &[crate::models::prompt::Message]) -> Vec<String> {
        let mut variables = Vec::new();
        let regex = regex::Regex::new(r"\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}").unwrap();

        for message in messages {
            for cap in regex.captures_iter(&message.content) {
                let var_name = cap[1].to_string();
                if !variables.contains(&var_name) {
                    variables.push(var_name);
                }
            }
        }

        variables
    }

    /// Extract name from first H1 heading in Markdown
    fn extract_name_from_markdown(&self, content: &str) -> Option<String> {
        use pulldown_cmark::{Parser, Event, Tag, HeadingLevel};
        
        let parser = Parser::new(content);
        let mut in_h1 = false;
        let mut h1_text = String::new();
        
        for event in parser {
            match event {
                Event::Start(Tag::Heading(HeadingLevel::H1, _, _)) => {
                    in_h1 = true;
                }
                Event::End(Tag::Heading(..)) => {
                    if in_h1 && !h1_text.is_empty() {
                        return Some(h1_text.trim().to_string());
                    }
                    in_h1 = false;
                }
                Event::Text(text) if in_h1 => {
                    h1_text.push_str(&text);
                }
                _ => {}
            }
        }
        
        None
    }

    /// Scan directory for .vibe.md files and track them
    pub fn scan_directory(&self, dir_path: &Path, default_provider_ref: &str) -> Result<Vec<String>, String> {
        let mut tracked_files = Vec::new();
        
        self.scan_recursive(dir_path, default_provider_ref, &mut tracked_files)?;
        
        Ok(tracked_files)
    }

    fn scan_recursive(&self, dir_path: &Path, default_provider_ref: &str, tracked_files: &mut Vec<String>) -> Result<(), String> {
        let entries = fs::read_dir(dir_path)
            .map_err(|e| format!("Failed to read directory: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            
            // Skip hidden files and directories
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.starts_with('.') {
                    continue;
                }
            }
            
            if path.is_dir() {
                // Recursively scan subdirectories
                self.scan_recursive(&path, default_provider_ref, tracked_files)?;
            } else if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                // Check if it's a .vibe.md file
                if file_name.ends_with(".vibe.md") {
                    match self.track_file(&path, default_provider_ref) {
                        Ok(file_id) => {
                            tracked_files.push(file_id);
                        }
                        Err(e) => {
                            eprintln!("Warning: Failed to track file {:?}: {}", path, e);
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Check if file has been modified since last tracking
    pub fn is_file_modified(&self, file_path: &Path) -> Result<bool, String> {
        let relative_path = file_path.to_str().ok_or("Invalid file path")?;
        
        // Get stored metadata
        let stored_metadata = self.db.get_prompt_metadata(relative_path)
            .map_err(|_| "File not found in database")?;
        
        // Calculate current hash
        let content = fs::read(file_path).map_err(|e| format!("Failed to read file: {}", e))?;
        let current_hash = Self::calculate_file_hash(&content);
        
        Ok(current_hash != stored_metadata.file_hash)
    }
}


