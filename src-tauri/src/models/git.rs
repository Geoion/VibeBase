use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitConfig {
    pub id: String,
    pub repository_path: Option<String>,
    pub current_branch: Option<String>,
    pub auth_method: Option<String>, // 'ssh' | 'token' | 'none'
    pub ssh_key_path: Option<String>,
    pub ssh_passphrase_key: Option<String>, // Keychain key reference
    pub github_token_key: Option<String>,    // Keychain key reference
    pub git_user_name: Option<String>,
    pub git_user_email: Option<String>,
    pub remote_name: Option<String>,
    pub remote_url: Option<String>,
    pub is_configured: bool,
    pub last_fetch: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub current_branch: String,
    pub staged: Vec<GitFileStatus>,
    pub unstaged: Vec<GitFileStatus>,
    pub untracked: Vec<String>,
    pub ahead: usize,
    pub behind: usize,
    pub has_conflicts: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String, // 'M' (modified), 'A' (added), 'D' (deleted), 'R' (renamed)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitBranch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub upstream: Option<String>,
    pub last_commit_message: Option<String>,
    pub last_commit_time: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCommit {
    pub id: String,
    pub short_id: String,
    pub message: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
    pub parent_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitRemoteStatus {
    pub remote_name: String,
    pub remote_url: String,
    pub fetch_url: String,
    pub push_url: String,
    pub ahead: usize,
    pub behind: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullResult {
    pub success: bool,
    pub message: String,
    pub conflicts: Vec<String>,
    pub files_changed: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushResult {
    pub success: bool,
    pub message: String,
    pub commits_pushed: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitDiff {
    pub file_path: String,
    pub old_content: String,
    pub new_content: String,
    pub diff_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitSummary {
    pub has_git: bool,
    pub current_branch: Option<String>,
    pub remote_url: Option<String>,
    pub changes_count: usize,
    pub ahead: usize,
    pub behind: usize,
}

impl Default for GitConfig {
    fn default() -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        Self {
            id: "default".to_string(),
            repository_path: None,
            current_branch: None,
            auth_method: Some("none".to_string()),
            ssh_key_path: None,
            ssh_passphrase_key: None,
            github_token_key: None,
            git_user_name: None,
            git_user_email: None,
            remote_name: Some("origin".to_string()),
            remote_url: None,
            is_configured: false,
            last_fetch: None,
            operation_timeout_seconds: Some(30), // Default 30 seconds timeout
            created_at: now,
            updated_at: now,
        }
    }
}

