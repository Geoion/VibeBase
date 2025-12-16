pub mod prompt;
pub mod execution;
pub mod config;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub path: String,
    pub name: String,
    pub prompts: Vec<PromptMetadata>,
    pub file_tree: FileNode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptMetadata {
    pub id: String,
    pub file_path: String,
    pub name: String,
    pub relative_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum FileNode {
    #[serde(rename = "folder")]
    Folder {
        name: String,
        path: String,
        children: Vec<FileNode>,
        expanded: bool,
    },
    #[serde(rename = "file")]
    File {
        name: String,
        path: String,
        is_vibe_file: bool,
    },
}

impl Workspace {
    pub fn new(path: String) -> Self {
        let name = std::path::Path::new(&path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Workspace")
            .to_string();

        Self {
            path: path.clone(),
            name,
            prompts: Vec::new(),
            file_tree: FileNode::Folder {
                name: "root".to_string(),
                path,
                children: Vec::new(),
                expanded: true,
            },
        }
    }
}
