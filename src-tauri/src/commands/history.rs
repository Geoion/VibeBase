use crate::services::database::{ProjectDatabase, FileHistoryEntry};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileHistoryEntryResponse {
    pub id: String,
    pub file_path: String,
    pub content_hash: String,
    pub created_at: i64,
    pub preview: String,
}

impl From<FileHistoryEntry> for FileHistoryEntryResponse {
    fn from(entry: FileHistoryEntry) -> Self {
        Self {
            id: entry.id,
            file_path: entry.file_path,
            content_hash: entry.content_hash,
            created_at: entry.created_at,
            preview: entry.preview,
        }
    }
}

/// Save file history if content has changed
/// Returns true if a new history entry was created
#[tauri::command]
pub fn save_file_history(
    workspace_path: String,
    file_path: String,
    content: String,
) -> Result<bool, String> {
    let workspace = Path::new(&workspace_path);
    
    let db = ProjectDatabase::new(workspace)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    db.save_file_history(&file_path, &content)
        .map_err(|e| format!("Failed to save history: {}", e))
}

/// Get file history entries for a file
#[tauri::command]
pub fn get_file_history(
    workspace_path: String,
    file_path: String,
    limit: Option<usize>,
) -> Result<Vec<FileHistoryEntryResponse>, String> {
    let workspace = Path::new(&workspace_path);
    let limit = limit.unwrap_or(50);
    
    let db = ProjectDatabase::new(workspace)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    let entries = db.get_file_history(&file_path, limit)
        .map_err(|e| format!("Failed to get history: {}", e))?;
    
    Ok(entries.into_iter().map(|e| e.into()).collect())
}

/// Get the full content of a history entry
#[tauri::command]
pub fn get_history_content(
    workspace_path: String,
    history_id: String,
) -> Result<String, String> {
    let workspace = Path::new(&workspace_path);
    
    let db = ProjectDatabase::new(workspace)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    db.get_history_content(&history_id)
        .map_err(|e| format!("Failed to get history content: {}", e))
}

/// Apply a history entry to the file (overwrite the file with history content)
#[tauri::command]
pub fn apply_history(
    workspace_path: String,
    history_id: String,
    file_path: String,
) -> Result<String, String> {
    let workspace = Path::new(&workspace_path);
    
    let db = ProjectDatabase::new(workspace)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // Get the history content
    let content = db.get_history_content(&history_id)
        .map_err(|e| format!("Failed to get history content: {}", e))?;
    
    // Write the content to the file
    fs::write(&file_path, &content)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    // Save the current state as a new history entry
    db.save_file_history(&file_path, &content)
        .map_err(|e| format!("Failed to save history after apply: {}", e))?;
    
    Ok(content)
}
