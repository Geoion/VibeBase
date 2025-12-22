use crate::models::git::*;
use crate::services::git_service::GitService;
use crate::services::keychain::KeychainService;
use std::sync::Mutex;
use git2::Config;
use serde::{Serialize, Deserialize};

pub struct GitState {
    #[allow(dead_code)]
    pub current_workspace: Mutex<Option<String>>,
}

impl GitState {
    pub fn new() -> Self {
        Self {
            current_workspace: Mutex::new(None),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemGitConfig {
    pub user_name: Option<String>,
    pub user_email: Option<String>,
}

#[tauri::command]
pub async fn get_git_config(workspace_path: String) -> Result<GitConfig, String> {
    let service = GitService::new(&workspace_path);
    service.load_config().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_git_config(
    workspace_path: String,
    config: GitConfig,
    ssh_passphrase: Option<String>,
    git_token: Option<String>,
) -> Result<(), String> {
    let service = GitService::new(&workspace_path);
    
    // Generate workspace ID from path
    let workspace_id = workspace_path.replace(['/', '\\', ':'], "_");
    
    // Save sensitive data to Keychain
    if let Some(passphrase) = ssh_passphrase {
        if !passphrase.is_empty() {
            KeychainService::save_git_ssh_passphrase(&workspace_id, &passphrase)
                .map_err(|e| format!("Failed to save SSH passphrase: {}", e))?;
        }
    }
    
    if let Some(token) = git_token {
        if !token.is_empty() {
            KeychainService::save_git_token(&workspace_id, &token)
                .map_err(|e| format!("Failed to save Git token: {}", e))?;
        }
    }
    
    // Save config to database
    service.save_config(&config).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_git_status(workspace_path: String) -> Result<GitStatus, String> {
    let service = GitService::new(&workspace_path);
    service.get_status().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_branches(workspace_path: String) -> Result<Vec<GitBranch>, String> {
    let service = GitService::new(&workspace_path);
    service.list_branches().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn checkout_branch(workspace_path: String, branch_name: String) -> Result<(), String> {
    let service = GitService::new(&workspace_path);
    service.checkout_branch(&branch_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_branch(workspace_path: String, branch_name: String) -> Result<(), String> {
    let service = GitService::new(&workspace_path);
    service.create_branch(&branch_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stage_files(workspace_path: String, files: Vec<String>) -> Result<(), String> {
    let service = GitService::new(&workspace_path);
    service.stage_files(&files).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn commit_changes(workspace_path: String, message: String) -> Result<String, String> {
    let service = GitService::new(&workspace_path);
    service.commit(&message).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pull_changes(workspace_path: String) -> Result<PullResult, String> {
    let service = GitService::new(&workspace_path);
    service.pull().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn push_changes(workspace_path: String) -> Result<PushResult, String> {
    let service = GitService::new(&workspace_path);
    service.push().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_commit_history(workspace_path: String, limit: usize) -> Result<Vec<GitCommit>, String> {
    let service = GitService::new(&workspace_path);
    service.get_commit_history(limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_git_diff(workspace_path: String) -> Result<String, String> {
    let service = GitService::new(&workspace_path);
    service.get_diff().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_workspace_git_summary(workspace_path: String) -> Result<GitSummary, String> {
    let service = GitService::new(&workspace_path);
    service.get_summary().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_commit_message(
    workspace_path: String,
    _provider_name: Option<String>,
) -> Result<String, String> {
    let service = GitService::new(&workspace_path);
    let diff = service.get_diff().map_err(|e| e.to_string())?;
    
    if diff.is_empty() {
        return Err("No changes to commit".to_string());
    }
    
    // TODO: Integrate with LLM service to generate commit message
    // For now, return a placeholder
    let message = format!("chore: update files\n\nGenerated from {} lines of diff", diff.lines().count());
    Ok(message)
}

#[tauri::command]
pub async fn get_system_git_config() -> Result<SystemGitConfig, String> {
    match Config::open_default() {
        Ok(config) => {
            let user_name = config.get_string("user.name").ok();
            let user_email = config.get_string("user.email").ok();
            
            Ok(SystemGitConfig {
                user_name,
                user_email,
            })
        }
        Err(e) => Err(format!("Failed to read git config: {}", e))
    }
}

#[tauri::command]
pub async fn init_git_repository(workspace_path: String) -> Result<(), String> {
    let service = GitService::new(&workspace_path);
    service.init_repo().map_err(|e| e.to_string())
}

