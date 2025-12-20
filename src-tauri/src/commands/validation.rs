use crate::services::database::ProjectDatabase;
use crate::services::validator::{FileValidator, ValidationResult};
use std::path::Path;

#[tauri::command]
pub fn validate_prompt_file(
    workspace_path: String,
    file_path: String,
) -> Result<ValidationResult, String> {
    let project_db = ProjectDatabase::new(Path::new(&workspace_path))
        .map_err(|e| format!("Failed to open project database: {}", e))?;

    let validator = FileValidator::new(project_db, workspace_path.clone());
    
    let full_path = Path::new(&workspace_path).join(&file_path);
    validator.validate_file(&full_path)
}

#[tauri::command]
pub fn validate_workspace(
    workspace_path: String,
) -> Result<Vec<(String, ValidationResult)>, String> {
    let project_db = ProjectDatabase::new(Path::new(&workspace_path))
        .map_err(|e| format!("Failed to open project database: {}", e))?;

    let validator = FileValidator::new(project_db, workspace_path);
    validator.validate_workspace()
}

#[tauri::command]
pub fn quick_validate_file(
    workspace_path: String,
    file_path: String,
) -> Result<bool, String> {
    let project_db = ProjectDatabase::new(Path::new(&workspace_path))
        .map_err(|e| format!("Failed to open project database: {}", e))?;

    let validator = FileValidator::new(project_db, workspace_path.clone());

    let full_path = Path::new(&workspace_path).join(&file_path);
    Ok(validator.quick_validate(&full_path))
}
