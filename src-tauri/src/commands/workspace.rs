use crate::models::{FileNode, PromptMetadata, Workspace};
use crate::commands::recent_projects::add_recent_project;
use crate::services::database::ProjectDatabase;
use std::fs;
use std::path::Path;
use uuid::Uuid;
use serde::{Deserialize, Serialize};

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
        return Err(format!("文件夹已存在: {}", path.file_name().and_then(|n| n.to_str()).unwrap_or("unknown")));
    }
    
    fs::create_dir_all(&folder_path).map_err(|e| format!("创建文件夹失败: {}", e))?;
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
        return Err(format!("路径不存在: {}", file_path));
    }
    
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| format!("删除文件夹失败: {}", e))?;
    } else {
        fs::remove_file(path).map_err(|e| format!("删除文件失败: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn delete_file_with_metadata(file_path: String, workspace_path: Option<String>) -> Result<(), String> {
    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Err(format!("路径不存在: {}", file_path));
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
        fs::remove_dir_all(path).map_err(|e| format!("删除文件夹失败: {}", e))?;
    } else {
        fs::remove_file(path).map_err(|e| format!("删除文件失败: {}", e))?;
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
    fs::create_dir_all(&vibebase_dir).map_err(|e| format!("创建 .vibebase 目录失败: {}", e))?;
    
    // Initialize database (will create schema if not exists)
    ProjectDatabase::new(path).map_err(|e| format!("初始化数据库失败: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub fn clear_workspace_db(workspace_path: String) -> Result<(), String> {
    let path = Path::new(&workspace_path);
    let db_path = path.join(".vibebase").join("project.db");
    
    if !db_path.exists() {
        return Err("数据库文件不存在".to_string());
    }
    
    // Open database and clear all data
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| format!("打开数据库失败: {}", e))?;
    
    // Delete all data from tables
    conn.execute("DELETE FROM file_history", [])
        .map_err(|e| format!("清空 file_history 失败: {}", e))?;
    
    conn.execute("DELETE FROM execution_history", [])
        .map_err(|e| format!("清空 execution_history 失败: {}", e))?;
    
    conn.execute("DELETE FROM evaluation_results", [])
        .map_err(|e| format!("清空 evaluation_results 失败: {}", e))?;
    
    conn.execute("DELETE FROM test_results", [])
        .map_err(|e| format!("清空 test_results 失败: {}", e))?;
    
    conn.execute("DELETE FROM comparison_results", [])
        .map_err(|e| format!("清空 comparison_results 失败: {}", e))?;
    
    conn.execute("DELETE FROM file_dependencies", [])
        .map_err(|e| format!("清空 file_dependencies 失败: {}", e))?;
    
    conn.execute("DELETE FROM test_datasets", [])
        .map_err(|e| format!("清空 test_datasets 失败: {}", e))?;
    
    conn.execute("DELETE FROM evaluation_rules", [])
        .map_err(|e| format!("清空 evaluation_rules 失败: {}", e))?;
    
    conn.execute("DELETE FROM prompt_files", [])
        .map_err(|e| format!("清空 prompt_files 失败: {}", e))?;
    
    // Vacuum to reclaim space
    conn.execute("VACUUM", [])
        .map_err(|e| format!("整理数据库空间失败: {}", e))?;
    
    Ok(())
}
