use crate::services::database::ProjectDatabase;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptMetadataResponse {
    pub id: String,
    pub file_path: String,
    pub provider_ref: String,
    pub model_override: Option<String>,
    pub parameters: Option<String>,
    pub tags: Option<String>,
    pub test_data_path: Option<String>,
    pub variables: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveMetadataRequest {
    pub file_path: String,
    pub provider_ref: String,
    pub model_override: Option<String>,
    pub parameters: Option<String>,
    pub tags: Option<String>,
    pub test_data_path: Option<String>,
}

/// Get metadata for a prompt file
#[tauri::command]
pub fn get_prompt_metadata(
    workspace_path: String,
    file_path: String,
) -> Result<PromptMetadataResponse, String> {
    let workspace = Path::new(&workspace_path);
    
    let db = ProjectDatabase::new(workspace)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // Ensure the file record exists
    db.ensure_prompt_file(&file_path)
        .map_err(|e| format!("Failed to ensure file record: {}", e))?;
    
    let metadata = db.get_prompt_metadata(&file_path)
        .map_err(|e| format!("Failed to get metadata: {}", e))?;
    
    Ok(PromptMetadataResponse {
        id: metadata.id,
        file_path: metadata.file_path,
        provider_ref: metadata.provider_ref,
        model_override: metadata.model_override,
        parameters: metadata.parameters,
        tags: metadata.tags,
        test_data_path: metadata.test_data_path,
        variables: metadata.variables,
    })
}

/// Save metadata for a prompt file
#[tauri::command]
pub fn save_prompt_metadata(
    workspace_path: String,
    metadata: SaveMetadataRequest,
) -> Result<(), String> {
    let workspace = Path::new(&workspace_path);
    
    let db = ProjectDatabase::new(workspace)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // Ensure the file record exists first
    db.ensure_prompt_file(&metadata.file_path)
        .map_err(|e| format!("Failed to ensure file record: {}", e))?;
    
    // Update metadata
    db.update_prompt_metadata(
        &metadata.file_path,
        &metadata.provider_ref,
        metadata.model_override.as_deref(),
        metadata.parameters.as_deref(),
        metadata.tags.as_deref(),
        metadata.test_data_path.as_deref(),
    ).map_err(|e| format!("Failed to save metadata: {}", e))?;
    
    Ok(())
}

/// Get all unique tags from workspace
#[tauri::command]
pub fn get_all_tags(workspace_path: String) -> Result<Vec<String>, String> {
    let workspace = Path::new(&workspace_path);
    
    let db = ProjectDatabase::new(workspace)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    db.get_all_tags()
        .map_err(|e| format!("Failed to get tags: {}", e))
}
