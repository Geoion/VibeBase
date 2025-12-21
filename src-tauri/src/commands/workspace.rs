use crate::models::{FileNode, PromptMetadata, Workspace};
use crate::commands::recent_projects::add_recent_project;
use crate::services::database::ProjectDatabase;
use std::fs;
use std::path::Path;
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspaceStats {
    pub workspace_path: String,
    pub workspace_name: String,
    pub has_database: bool,
    pub prompt_count: i32,
    pub tag_count: i32,
    pub db_size_bytes: i64,
    pub history_count: i32,
    pub execution_count: i32,
}

#[tauri::command]
pub fn open_workspace(path: String) -> Result<Workspace, String> {
    let workspace_path = Path::new(&path);
    
    if !workspace_path.exists() {
        return Err("Workspace path does not exist".to_string());
    }

    if !workspace_path.is_dir() {
        return Err("Workspace path is not a directory".to_string());
    }

    let mut workspace = Workspace::new(path.clone());
    
    // Build file tree
    workspace.file_tree = build_file_tree(&path, &path)?;
    
    // Scan for .vibe.yaml files
    if let Ok(prompts) = scan_vibe_files(&path) {
        workspace.prompts = prompts;
    }

    // Add to recent projects
    let _ = add_recent_project(path);

    Ok(workspace)
}

#[tauri::command]
pub fn list_prompts(workspace_path: String) -> Result<Vec<PromptMetadata>, String> {
    scan_vibe_files(&workspace_path)
}

#[tauri::command]
pub fn create_folder(folder_path: String) -> Result<(), String> {
    let path = Path::new(&folder_path);
    
    // Check if folder already exists
    if path.exists() {
        return Err(format!("Folder already exists: {}", path.file_name().and_then(|n| n.to_str()).unwrap_or("unknown")));
    }
    
    fs::create_dir_all(&folder_path).map_err(|e| format!("Failed to create folder: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn move_file(source_path: String, dest_dir: String) -> Result<String, String> {
    let source = Path::new(&source_path);
    let dest_directory = Path::new(&dest_dir);
    
    if !source.exists() {
        return Err(format!("Source path does not exist: {}", source_path));
    }
    
    if !dest_directory.exists() {
        return Err(format!("Destination directory does not exist: {}", dest_dir));
    }
    
    if !dest_directory.is_dir() {
        return Err(format!("Destination is not a directory: {}", dest_dir));
    }
    
    // Get the file/folder name
    let file_name = source
        .file_name()
        .ok_or_else(|| "Invalid source path".to_string())?;
    
    // Build destination path
    let dest_path = dest_directory.join(file_name);
    
    // Check if destination already exists
    if dest_path.exists() {
        return Err(format!("Destination already exists: {}", dest_path.display()));
    }
    
    // Move the file or directory
    fs::rename(&source, &dest_path).map_err(|e| {
        format!("Failed to move: {}", e)
    })?;
    
    Ok(dest_path.to_str().unwrap_or("").to_string())
}

#[tauri::command]
pub fn delete_file(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Err(format!("Path does not exist: {}", file_path));
    }
    
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| format!("Failed to delete folder: {}", e))?;
    } else {
        fs::remove_file(path).map_err(|e| format!("Failed to delete file: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn delete_file_with_metadata(file_path: String, workspace_path: Option<String>) -> Result<(), String> {
    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Err(format!("Path does not exist: {}", file_path));
    }
    
    // Find workspace path - either provided or find by looking for .vibebase directory
    let workspace = if let Some(ws) = workspace_path {
        ws
    } else {
        find_workspace_path(&file_path).unwrap_or_default()
    };
    
    // Collect all file paths to delete from database
    let files_to_delete = if path.is_dir() {
        collect_vibe_files(&file_path)
    } else {
        vec![file_path.clone()]
    };
    
    // Delete from project database if workspace is found
    if !workspace.is_empty() {
        if let Ok(db) = ProjectDatabase::new(Path::new(&workspace)) {
            for file in &files_to_delete {
                // Delete file history, metadata, and related data
                let _ = db.delete_file_related_data(file);
            }
        }
    }
    
    // Delete from file system
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| format!("Failed to delete folder: {}", e))?;
    } else {
        fs::remove_file(path).map_err(|e| format!("Failed to delete file: {}", e))?;
    }
    
    Ok(())
}

/// Find the workspace path by looking for .vibebase directory in parent directories
fn find_workspace_path(file_path: &str) -> Option<String> {
    let mut current = Path::new(file_path).parent();
    
    while let Some(dir) = current {
        if dir.join(".vibebase").exists() {
            return dir.to_str().map(|s| s.to_string());
        }
        current = dir.parent();
    }
    
    None
}

/// Collect all .vibe.md and .vibe.yaml files in a directory recursively
fn collect_vibe_files(dir_path: &str) -> Vec<String> {
    let mut files = Vec::new();
    
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            
            if path.is_dir() {
                if let Some(path_str) = path.to_str() {
                    files.extend(collect_vibe_files(path_str));
                }
            } else if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.ends_with(".vibe.md") || name.ends_with(".vibe.yaml") || name.ends_with(".vibe.yml") {
                    if let Some(path_str) = path.to_str() {
                        files.push(path_str.to_string());
                    }
                }
            }
        }
    }
    
    files
}

fn build_file_tree(root_path: &str, current_path: &str) -> Result<FileNode, String> {
    let current = Path::new(current_path);
    let name = current
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    // Skip hidden files/folders
    if name.starts_with('.') && current_path != root_path {
        return Err("Hidden".to_string());
    }

    if current.is_dir() {
        let entries = fs::read_dir(current_path).map_err(|e| e.to_string())?;
        let mut children = Vec::new();

        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if let Some(path_str) = path.to_str() {
                    if let Ok(node) = build_file_tree(root_path, path_str) {
                        children.push(node);
                    }
                }
            }
        }

        // Sort: folders first, then files, alphabetically
        children.sort_by(|a, b| {
            match (a, b) {
                (FileNode::Folder { name: n1, .. }, FileNode::Folder { name: n2, .. }) => {
                    n1.to_lowercase().cmp(&n2.to_lowercase())
                }
                (FileNode::File { name: n1, .. }, FileNode::File { name: n2, .. }) => {
                    n1.to_lowercase().cmp(&n2.to_lowercase())
                }
                (FileNode::Folder { .. }, FileNode::File { .. }) => std::cmp::Ordering::Less,
                (FileNode::File { .. }, FileNode::Folder { .. }) => std::cmp::Ordering::Greater,
            }
        });

        Ok(FileNode::Folder {
            name,
            path: current_path.to_string(),
            children,
            expanded: true,
        })
    } else {
        let is_vibe_file = name.ends_with(".vibe.yaml") || name.ends_with(".vibe.yml") || name.ends_with(".vibe.md");

        Ok(FileNode::File {
            name,
            path: current_path.to_string(),
            is_vibe_file,
        })
    }
}

fn scan_vibe_files(root_path: &str) -> Result<Vec<PromptMetadata>, String> {
    let mut prompts = Vec::new();
    scan_directory(root_path, root_path, &mut prompts)?;
    Ok(prompts)
}

fn scan_directory(
    root_path: &str,
    current_path: &str,
    prompts: &mut Vec<PromptMetadata>,
) -> Result<(), String> {
    let entries = fs::read_dir(current_path).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        // Skip hidden files and directories
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') {
                continue;
            }
        }

        if path.is_dir() {
            // Recursively scan subdirectories
            if let Some(path_str) = path.to_str() {
                scan_directory(root_path, path_str, prompts)?;
            }
        } else if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
            // Check if it's a .vibe.yaml, .vibe.yml, or .vibe.md file
            if file_name.ends_with(".vibe.yaml") || file_name.ends_with(".vibe.yml") || file_name.ends_with(".vibe.md") {
                let absolute_path = path.to_str().unwrap_or("").to_string();
                let relative_path = absolute_path
                    .strip_prefix(root_path)
                    .unwrap_or(&absolute_path)
                    .trim_start_matches('/')
                    .trim_start_matches('\\')
                    .to_string();

                prompts.push(PromptMetadata {
                    id: Uuid::new_v4().to_string(),
                    file_path: absolute_path.clone(),
                    name: file_name.to_string(),
                    relative_path,
                });
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_workspace_stats(workspace_path: String) -> Result<WorkspaceStats, String> {
    let path = Path::new(&workspace_path);
    
    if !path.exists() {
        return Err("Workspace path does not exist".to_string());
    }
    
    let workspace_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();
    
    let db_path = path.join(".vibebase").join("project.db");
    let has_database = db_path.exists();
    
    let mut stats = WorkspaceStats {
        workspace_path: workspace_path.clone(),
        workspace_name,
        has_database,
        prompt_count: 0,
        tag_count: 0,
        db_size_bytes: 0,
        history_count: 0,
        execution_count: 0,
    };
    
    if !has_database {
        return Ok(stats);
    }
    
    // Get database file size
    if let Ok(metadata) = fs::metadata(&db_path) {
        stats.db_size_bytes = metadata.len() as i64;
    }
    
    // Open database and get statistics
    if let Ok(db) = ProjectDatabase::new(path) {
        // Count prompts
        if let Ok(prompts) = db.list_prompt_files() {
            stats.prompt_count = prompts.len() as i32;
            
            // Count unique tags
            let mut tags = std::collections::HashSet::new();
            for prompt in prompts {
                if let Some(tag_str) = prompt.tags {
                    if let Ok(tag_array) = serde_json::from_str::<Vec<String>>(&tag_str) {
                        for tag in tag_array {
                            tags.insert(tag);
                        }
                    }
                }
            }
            stats.tag_count = tags.len() as i32;
        }
        
        // Count file history entries
        if let Ok(conn) = rusqlite::Connection::open(&db_path) {
            if let Ok(count) = conn.query_row::<i32, _, _>(
                "SELECT COUNT(*) FROM file_history",
                [],
                |row| row.get(0),
            ) {
                stats.history_count = count;
            }
            
            // Count execution history entries
            if let Ok(count) = conn.query_row::<i32, _, _>(
                "SELECT COUNT(*) FROM execution_history",
                [],
                |row| row.get(0),
            ) {
                stats.execution_count = count;
            }
        }
    }
    
    Ok(stats)
}

#[tauri::command]
pub fn initialize_workspace_db(workspace_path: String) -> Result<(), String> {
    let path = Path::new(&workspace_path);
    
    if !path.exists() {
        return Err("Workspace path does not exist".to_string());
    }
    
    // Create .vibebase directory
    let vibebase_dir = path.join(".vibebase");
    fs::create_dir_all(&vibebase_dir).map_err(|e| format!("Failed to create .vibebase directory: {}", e))?;
    
    // Initialize database (will create schema if not exists)
    ProjectDatabase::new(path).map_err(|e| format!("Failed to initialize database: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn clear_workspace_db(workspace_path: String) -> Result<(), String> {
    let path = Path::new(&workspace_path);
    let db_path = path.join(".vibebase").join("project.db");
    
    if !db_path.exists() {
        return Err("Database file does not exist".to_string());
    }
    
    // Open database and clear all data
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))?;
    
    // Delete all data from tables
    conn.execute("DELETE FROM file_history", [])
        .map_err(|e| format!("Failed to clear file_history: {}", e))?;
    
    conn.execute("DELETE FROM execution_history", [])
        .map_err(|e| format!("Failed to clear execution_history: {}", e))?;
    
    conn.execute("DELETE FROM evaluation_results", [])
        .map_err(|e| format!("Failed to clear evaluation_results: {}", e))?;
    
    conn.execute("DELETE FROM test_results", [])
        .map_err(|e| format!("Failed to clear test_results: {}", e))?;
    
    conn.execute("DELETE FROM comparison_results", [])
        .map_err(|e| format!("Failed to clear comparison_results: {}", e))?;
    
    conn.execute("DELETE FROM file_dependencies", [])
        .map_err(|e| format!("Failed to clear file_dependencies: {}", e))?;
    
    conn.execute("DELETE FROM test_datasets", [])
        .map_err(|e| format!("Failed to clear test_datasets: {}", e))?;
    
    conn.execute("DELETE FROM evaluation_rules", [])
        .map_err(|e| format!("Failed to clear evaluation_rules: {}", e))?;
    
    conn.execute("DELETE FROM prompt_files", [])
        .map_err(|e| format!("Failed to clear prompt_files: {}", e))?;
    
    // Vacuum to reclaim space
    conn.execute("VACUUM", [])
        .map_err(|e| format!("Failed to vacuum database: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn rename_file(old_path: String, new_name: String) -> Result<String, String> {
    let old_path_obj = Path::new(&old_path);
    
    if !old_path_obj.exists() {
        return Err("File or folder does not exist".to_string());
    }
    
    // Validate new name
    if new_name.is_empty() {
        return Err("Name cannot be empty".to_string());
    }
    
    if new_name.contains('/') || new_name.contains('\\') {
        return Err("Name cannot contain path separators".to_string());
    }
    
    if new_name.starts_with('.') {
        return Err("Name cannot start with a dot".to_string());
    }
    
    // Get parent directory
    let parent_dir = old_path_obj.parent().ok_or("Cannot get parent directory")?;
    
    // Build new path
    let new_path = parent_dir.join(&new_name);
    
    // Check if target already exists
    if new_path.exists() {
        return Err(format!("Name '{}' already exists", new_name));
    }
    
    // Perform rename
    fs::rename(&old_path_obj, &new_path)
        .map_err(|e| format!("Rename failed: {}", e))?;
    
    Ok(new_path.to_str().unwrap_or("").to_string())
}

#[tauri::command]
pub fn show_in_folder(path: String) -> Result<(), String> {
    let file_path = Path::new(&path);
    
    // Get the parent directory
    let folder_path = if file_path.is_dir() {
        file_path
    } else {
        file_path.parent().ok_or("Cannot get parent directory")?
    };
    
    #[cfg(target_os = "macos")]
    {
        // On macOS, use 'open -R' to reveal the file in Finder
        let result = if file_path.is_dir() {
            Command::new("open")
                .arg(folder_path)
                .spawn()
        } else {
            Command::new("open")
                .arg("-R")
                .arg(&path)
                .spawn()
        };
        
        result.map_err(|e| format!("Failed to open Finder: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        // On Windows, use 'explorer /select,' to highlight the file
        let result = if file_path.is_dir() {
            Command::new("explorer")
                .arg(folder_path)
                .spawn()
        } else {
            Command::new("explorer")
                .arg("/select,")
                .arg(&path)
                .spawn()
        };
        
        result.map_err(|e| format!("Failed to open Explorer: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        // On Linux, try various file managers
        let result = Command::new("xdg-open")
            .arg(folder_path)
            .spawn()
            .or_else(|_| Command::new("nautilus").arg(folder_path).spawn())
            .or_else(|_| Command::new("dolphin").arg(folder_path).spawn())
            .or_else(|_| Command::new("thunar").arg(folder_path).spawn());
        
        result.map_err(|e| format!("Failed to open file manager: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn save_arena_battle(
    workspace_path: Option<String>,
    prompt_file_id: Option<String>,
    prompt_content: String,
    input_variables: String,
    models: String,
    outputs: String,
) -> Result<String, String> {
    // If workspace_path is not provided, try to get from current context
    let ws_path = workspace_path.ok_or("Workspace path is required")?;
    
    println!("[Rust] Saving arena battle to workspace: {}", ws_path);
    println!("[Rust] Database path: {}/.vibebase/project.db", ws_path);
    
    let db = ProjectDatabase::new(Path::new(&ws_path))
        .map_err(|e| format!("Failed to open project database: {}", e))?;
    
    let id = db.save_arena_battle(
        prompt_file_id,
        &prompt_content,
        &input_variables,
        &models,
        &outputs,
    ).map_err(|e| format!("Failed to save arena battle: {}", e))?;
    
    println!("[Rust] Arena battle saved with ID: {}", id);
    Ok(id)
}

#[tauri::command]
pub fn update_arena_votes(
    workspace_path: String,
    battle_id: String,
    winner_model: Option<String>,
    votes: String,
) -> Result<(), String> {
    let db = ProjectDatabase::new(Path::new(&workspace_path))
        .map_err(|e| format!("Failed to open project database: {}", e))?;
    
    db.update_arena_votes(&battle_id, winner_model, &votes)
        .map_err(|e| format!("Failed to update votes: {}", e))
}

#[tauri::command]
pub fn get_arena_battles(
    workspace_path: String,
    limit: Option<usize>,
) -> Result<Vec<crate::services::database::ArenaBattle>, String> {
    println!("[Rust] Getting arena battles from workspace: {}", workspace_path);
    println!("[Rust] Database path: {}/.vibebase/project.db", workspace_path);
    
    let db = ProjectDatabase::new(Path::new(&workspace_path))
        .map_err(|e| format!("Failed to open project database: {}", e))?;
    
    let battles = db.get_arena_battles(None, limit.unwrap_or(100))
        .map_err(|e| format!("Failed to get arena battles: {}", e))?;
    
    println!("[Rust] Found {} arena battles", battles.len());
    Ok(battles)
}

#[tauri::command]
pub fn get_arena_statistics(
    workspace_path: String,
) -> Result<serde_json::Value, String> {
    use std::collections::HashMap;
    use serde_json::json;
    
    let db = ProjectDatabase::new(Path::new(&workspace_path))
        .map_err(|e| format!("Failed to open project database: {}", e))?;
    
    let battles = db.get_arena_battles(None, 1000)
        .map_err(|e| format!("Failed to get arena battles: {}", e))?;
    
    // Statistics data structure
    let mut model_votes: HashMap<String, i32> = HashMap::new();
    let mut model_wins: HashMap<String, i32> = HashMap::new();
    let mut provider_tokens: HashMap<String, (i64, i64)> = HashMap::new(); // (input, output)
    let mut provider_latency: HashMap<String, Vec<i64>> = HashMap::new();
    let mut provider_cost: HashMap<String, f64> = HashMap::new();
    let mut model_tokens: HashMap<String, (i64, i64)> = HashMap::new();
    let mut model_latency: HashMap<String, Vec<i64>> = HashMap::new();
    let mut model_cost: HashMap<String, f64> = HashMap::new();
    let mut unique_models: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut total_model_appearances: i32 = 0;
    
    for battle in battles.iter() {
        // Count winners
        if let Some(ref winner) = battle.winner_model {
            *model_wins.entry(winner.clone()).or_insert(0) += 1;
        }
        
        // Count votes
        if let Some(ref votes_str) = battle.votes {
            if let Ok(votes) = serde_json::from_str::<HashMap<String, i32>>(votes_str) {
                for (model, count) in votes {
                    *model_votes.entry(model).or_insert(0) += count;
                }
            }
        }
        
        // Count performance data
        if let Ok(outputs) = serde_json::from_str::<Vec<serde_json::Value>>(&battle.outputs) {
            // Count number of models in this comparison
            total_model_appearances += outputs.len() as i32;
            
            for output in outputs {
                // Read directly from fields, unify data structure
                let provider_name = output.get("provider_name")
                    .and_then(|v| v.as_str())
                    .or_else(|| output.get("metadata").and_then(|m| m.get("provider")).and_then(|v| v.as_str()))
                    .unwrap_or("Unknown");
                    
                let model_name = output.get("model_name")
                    .and_then(|v| v.as_str())
                    .or_else(|| output.get("metadata").and_then(|m| m.get("model")).and_then(|v| v.as_str()))
                    .unwrap_or("Unknown");
                
                // 记录唯一模型（使用 model_name）
                unique_models.insert(model_name.to_string());
                
                if let Some(metadata) = output.get("metadata") {
                    let tokens_in = metadata.get("tokens_input").and_then(|v| v.as_i64()).unwrap_or(0);
                    let tokens_out = metadata.get("tokens_output").and_then(|v| v.as_i64()).unwrap_or(0);
                    let latency = metadata.get("latency_ms").and_then(|v| v.as_i64()).unwrap_or(0);
                    let cost = metadata.get("cost_usd").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    
                    // Provider 统计（直接使用 provider_name）
                    let provider_token_entry = provider_tokens.entry(provider_name.to_string()).or_insert((0, 0));
                    provider_token_entry.0 += tokens_in;
                    provider_token_entry.1 += tokens_out;
                    
                    provider_latency.entry(provider_name.to_string()).or_insert_with(Vec::new).push(latency);
                    *provider_cost.entry(provider_name.to_string()).or_insert(0.0) += cost;
                    
                    // Model 统计（直接使用 model_name）
                    let model_token_entry = model_tokens.entry(model_name.to_string()).or_insert((0, 0));
                    model_token_entry.0 += tokens_in;
                    model_token_entry.1 += tokens_out;
                    
                    model_latency.entry(model_name.to_string()).or_insert_with(Vec::new).push(latency);
                    *model_cost.entry(model_name.to_string()).or_insert(0.0) += cost;
                }
            }
        }
    }
    
    // 计算平均延迟
    let mut provider_avg_latency: HashMap<String, i64> = HashMap::new();
    for (provider, latencies) in provider_latency.iter() {
        if !latencies.is_empty() {
            let avg = latencies.iter().sum::<i64>() / latencies.len() as i64;
            provider_avg_latency.insert(provider.clone(), avg);
        }
    }
    
    let mut model_avg_latency: HashMap<String, i64> = HashMap::new();
    for (model, latencies) in model_latency.iter() {
        if !latencies.is_empty() {
            let avg = latencies.iter().sum::<i64>() / latencies.len() as i64;
            model_avg_latency.insert(model.clone(), avg);
        }
    }
    
    Ok(json!({
        "total_battles": battles.len(),
        "unique_models_count": unique_models.len(),
        "total_model_appearances": total_model_appearances,
        "model_votes": model_votes,
        "model_wins": model_wins,
        "provider_tokens": provider_tokens,
        "provider_avg_latency": provider_avg_latency,
        "provider_cost": provider_cost,
        "model_tokens": model_tokens,
        "model_avg_latency": model_avg_latency,
        "model_cost": model_cost,
    }))
}
