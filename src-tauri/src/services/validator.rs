use crate::models::prompt::parse_markdown_prompt;
use crate::services::database::ProjectDatabase;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidationStatus {
    Valid,
    Warning,
    Invalid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub error_type: String,
    pub message: String,
    pub file_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationWarning {
    pub warning_type: String,
    pub message: String,
    pub suggestion: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyInfo {
    pub target_file: String,
    pub dependency_type: String,
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub status: ValidationStatus,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationWarning>,
    pub dependencies: Vec<DependencyInfo>,
}

pub struct FileValidator {
    project_db: ProjectDatabase,
    workspace_path: String,
}

impl FileValidator {
    pub fn new(project_db: ProjectDatabase, workspace_path: String) -> Self {
        Self {
            project_db,
            workspace_path,
        }
    }

    /// Validate a single file
    pub fn validate_file(&self, file_path: &Path) -> Result<ValidationResult, String> {
        let mut result = ValidationResult {
            status: ValidationStatus::Valid,
            errors: Vec::new(),
            warnings: Vec::new(),
            dependencies: Vec::new(),
        };

        // 1. File existence check
        if !file_path.exists() {
            result.errors.push(ValidationError {
                error_type: "file_not_found".to_string(),
                message: format!("File not found: {:?}", file_path),
                file_path: Some(file_path.to_str().unwrap_or("").to_string()),
            });
            result.status = ValidationStatus::Invalid;
            return Ok(result);
        }

        // 2. Checksum validation
        if let Err(e) = self.verify_checksum(file_path) {
            result.errors.push(ValidationError {
                error_type: "checksum_mismatch".to_string(),
                message: e,
                file_path: Some(file_path.to_str().unwrap_or("").to_string()),
            });
            result.status = ValidationStatus::Invalid;
        }

        // 3. Schema validation (Markdown parsing)
        let content = match fs::read_to_string(file_path) {
            Ok(c) => c,
            Err(e) => {
                result.errors.push(ValidationError {
                    error_type: "read_error".to_string(),
                    message: format!("Failed to read file: {}", e),
                    file_path: Some(file_path.to_str().unwrap_or("").to_string()),
                });
                result.status = ValidationStatus::Invalid;
                return Ok(result);
            }
        };

        match self.validate_schema(&content) {
            Ok(warnings) => result.warnings.extend(warnings),
            Err(e) => {
                result.errors.push(ValidationError {
                    error_type: "schema_invalid".to_string(),
                    message: e,
                    file_path: Some(file_path.to_str().unwrap_or("").to_string()),
                });
                result.status = ValidationStatus::Invalid;
            }
        }

        // 4. Dependency check
        if let Ok(deps) = self.check_dependencies(file_path) {
            result.dependencies = deps.clone();
            for dep in &deps {
                if !dep.exists {
                    result.errors.push(ValidationError {
                        error_type: "dependency_missing".to_string(),
                        message: format!("Missing dependency: {}", dep.target_file),
                        file_path: Some(file_path.to_str().unwrap_or("").to_string()),
                    });
                    result.status = ValidationStatus::Invalid;
                }
            }
        }

        // Determine final status
        if result.errors.is_empty() {
            if !result.warnings.is_empty() {
                result.status = ValidationStatus::Warning;
            } else {
                result.status = ValidationStatus::Valid;
            }
        }

        Ok(result)
    }

    /// Validate entire workspace
    pub fn validate_workspace(&self) -> Result<Vec<(String, ValidationResult)>, String> {
        let mut results = Vec::new();

        // Get all prompt files from database
        let prompt_files = self.project_db.list_prompt_files()
            .map_err(|e| format!("Failed to list files: {}", e))?;

        for file_meta in prompt_files {
            let file_path = Path::new(&self.workspace_path).join(&file_meta.file_path);
            match self.validate_file(&file_path) {
                Ok(validation) => {
                    results.push((file_meta.file_path, validation));
                }
                Err(e) => {
                    let error_result = ValidationResult {
                        status: ValidationStatus::Invalid,
                        errors: vec![ValidationError {
                            error_type: "validation_failed".to_string(),
                            message: e,
                            file_path: Some(file_meta.file_path.clone()),
                        }],
                        warnings: Vec::new(),
                        dependencies: Vec::new(),
                    };
                    results.push((file_meta.file_path, error_result));
                }
            }
        }

        Ok(results)
    }

    /// Verify file checksum
    fn verify_checksum(&self, file_path: &Path) -> Result<(), String> {
        let relative_path = file_path.strip_prefix(&self.workspace_path)
            .map_err(|_| "Invalid file path")?
            .to_str()
            .ok_or("Invalid path encoding")?;

        // Get stored metadata
        let stored_metadata = self.project_db.get_prompt_metadata(relative_path)
            .map_err(|_| "File not found in database")?;

        // Calculate current hash
        let content = fs::read(file_path)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        
        let mut hasher = Sha256::new();
        hasher.update(&content);
        let current_hash = format!("{:x}", hasher.finalize());

        if current_hash != stored_metadata.file_hash {
            return Err(format!(
                "Checksum mismatch. File may have been modified outside VibeBase. Expected: {}, Got: {}",
                stored_metadata.file_hash, current_hash
            ));
        }

        Ok(())
    }

    /// Validate Markdown schema
    fn validate_schema(&self, content: &str) -> Result<Vec<ValidationWarning>, String> {
        let mut warnings = Vec::new();

        // Try to parse Markdown
        match parse_markdown_prompt(content) {
            Ok(messages) => {
                // Check if at least one message exists
                if messages.is_empty() {
                    return Err("No valid messages found. Use ## System Message, ## User Message, or ## Assistant headings.".to_string());
                }

                // Warn if no System Message
                if !messages.iter().any(|m| matches!(m.role, crate::models::prompt::MessageRole::System)) {
                    warnings.push(ValidationWarning {
                        warning_type: "no_system_message".to_string(),
                        message: "No System Message found. Consider adding one for better results.".to_string(),
                        suggestion: Some("Add a ## System Message section".to_string()),
                    });
                }

                // Warn if no User Message
                if !messages.iter().any(|m| matches!(m.role, crate::models::prompt::MessageRole::User)) {
                    warnings.push(ValidationWarning {
                        warning_type: "no_user_message".to_string(),
                        message: "No User Message found. Most prompts should have a user message.".to_string(),
                        suggestion: Some("Add a ## User Message section".to_string()),
                    });
                }

                // Check for very short content
                for message in &messages {
                    if message.content.trim().len() < 10 {
                        warnings.push(ValidationWarning {
                            warning_type: "short_content".to_string(),
                            message: format!("Very short {} message (< 10 chars)", 
                                match message.role {
                                    crate::models::prompt::MessageRole::System => "System",
                                    crate::models::prompt::MessageRole::User => "User",
                                    crate::models::prompt::MessageRole::Assistant => "Assistant",
                                }),
                            suggestion: Some("Consider adding more context".to_string()),
                        });
                    }
                }
            }
            Err(e) => {
                return Err(format!("Markdown parsing failed: {}", e));
            }
        }

        Ok(warnings)
    }

    /// Check file dependencies
    fn check_dependencies(&self, file_path: &Path) -> Result<Vec<DependencyInfo>, String> {
        let mut dependencies = Vec::new();

        let relative_path = file_path.strip_prefix(&self.workspace_path)
            .map_err(|_| "Invalid file path")?
            .to_str()
            .ok_or("Invalid path encoding")?;

        // Get metadata
        let metadata = self.project_db.get_prompt_metadata(relative_path)
            .map_err(|e| format!("Failed to get metadata: {}", e))?;

        // Check test_data_path
        if let Some(test_data) = metadata.test_data_path {
            let test_data_path = Path::new(&self.workspace_path).join(&test_data);
            dependencies.push(DependencyInfo {
                target_file: test_data,
                dependency_type: "test_data".to_string(),
                exists: test_data_path.exists(),
            });
        }

        // Check evaluation_config
        if let Some(eval_config) = metadata.evaluation_config {
            if let Ok(evals) = serde_json::from_str::<Vec<serde_json::Value>>(&eval_config) {
                for eval in evals {
                    if let Some(ref_path) = eval.get("ref").and_then(|v| v.as_str()) {
                        let eval_file_path = Path::new(&self.workspace_path).join(ref_path);
                        dependencies.push(DependencyInfo {
                            target_file: ref_path.to_string(),
                            dependency_type: "evaluation".to_string(),
                            exists: eval_file_path.exists(),
                        });
                    }
                }
            }
        }

        Ok(dependencies)
    }

    /// Quick validation (only check if file exists and can be parsed)
    pub fn quick_validate(&self, file_path: &Path) -> bool {
        if !file_path.exists() {
            return false;
        }

        if let Ok(content) = fs::read_to_string(file_path) {
            parse_markdown_prompt(&content).is_ok()
        } else {
            false
        }
    }
}

// Note: Integration tests for FileValidator require database setup
// See tests/ directory for integration tests









