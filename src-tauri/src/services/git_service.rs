use crate::models::git::*;
use crate::services::database::{ProjectDatabase, AppDatabase};
use crate::services::keychain::KeychainService;
use anyhow::{anyhow, Result};
use git2::{Repository, Signature, IndexAddOption, Cred, RemoteCallbacks, FetchOptions, PushOptions, BranchType};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH, Instant};
use std::env;
use std::sync::{Arc, Mutex};

pub struct GitService {
    workspace_path: String,
}

impl GitService {
    pub fn new(workspace_path: &str) -> Self {
        Self {
            workspace_path: workspace_path.to_string(),
        }
    }

    // Get operation timeout from app settings (global configuration)
    fn get_operation_timeout(&self) -> u32 {
        match AppDatabase::new() {
            Ok(db) => {
                match db.get_app_setting("git.operation_timeout_seconds") {
                    Ok(value) => {
                        value.parse::<u32>().unwrap_or(30)
                    }
                    Err(_) => 30, // Default 30 seconds
                }
            }
            Err(_) => 30, // Default 30 seconds
        }
    }

    // Initialize or open repository
    pub fn init_repository(&self) -> Result<Repository> {
        let repo_path = Path::new(&self.workspace_path);
        
        // Try to discover git repository (searches parent directories)
        match Repository::discover(repo_path) {
            Ok(repo) => Ok(repo),
            Err(_) => Err(anyhow!("Git repository not found. Please initialize git in this directory first.")),
        }
    }

    // Initialize a new git repository
    pub fn init_repo(&self) -> Result<()> {
        let repo_path = Path::new(&self.workspace_path);
        Repository::init(repo_path)?;
        Ok(())
    }

    // Load Git config from database
    pub fn load_config(&self) -> Result<GitConfig> {
        let db = ProjectDatabase::new(Path::new(&self.workspace_path))?;
        let conn = db.get_connection();
        
        let config: Result<GitConfig, _> = conn.query_row(
            "SELECT id, repository_path, current_branch, auth_method, ssh_key_path, 
                    ssh_passphrase_key, github_token_key, git_user_name, git_user_email,
                    remote_name, remote_url, is_configured, last_fetch, 
                    commit_message_style, commit_message_provider, commit_message_language,
                    created_at, updated_at
             FROM git_config WHERE id = 'default'",
            [],
            |row| {
                Ok(GitConfig {
                    id: row.get(0)?,
                    repository_path: row.get(1)?,
                    current_branch: row.get(2)?,
                    auth_method: row.get(3)?,
                    ssh_key_path: row.get(4)?,
                    ssh_passphrase_key: row.get(5)?,
                    github_token_key: row.get(6)?,
                    git_user_name: row.get(7)?,
                    git_user_email: row.get(8)?,
                    remote_name: row.get(9)?,
                    remote_url: row.get(10)?,
                    is_configured: row.get::<_, i64>(11)? != 0,
                    last_fetch: row.get(12)?,
                    commit_message_style: row.get(13)?,
                    commit_message_provider: row.get(14)?,
                    commit_message_language: row.get(15)?,
                    created_at: row.get(16)?,
                    updated_at: row.get(17)?,
                })
            },
        );

        match config {
            Ok(cfg) => Ok(cfg),
            Err(_) => Ok(GitConfig::default()),
        }
    }

    // Save Git config to database
    pub fn save_config(&self, config: &GitConfig) -> Result<()> {
        let db = ProjectDatabase::new(Path::new(&self.workspace_path))?;
        let conn = db.get_connection();
        
        let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as i64;
        
        conn.execute(
            "INSERT OR REPLACE INTO git_config (
                id, repository_path, current_branch, auth_method, ssh_key_path,
                ssh_passphrase_key, github_token_key, git_user_name, git_user_email,
                remote_name, remote_url, is_configured, last_fetch,
                commit_message_style, commit_message_provider, commit_message_language,
                created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            rusqlite::params![
                &config.id,
                &config.repository_path,
                &config.current_branch,
                &config.auth_method,
                &config.ssh_key_path,
                &config.ssh_passphrase_key,
                &config.github_token_key,
                &config.git_user_name,
                &config.git_user_email,
                &config.remote_name,
                &config.remote_url,
                if config.is_configured { 1 } else { 0 },
                &config.last_fetch,
                &config.commit_message_style,
                &config.commit_message_provider,
                &config.commit_message_language,
                &config.created_at,
                now,
            ],
        )?;
        
        Ok(())
    }

    // Get repository status
    pub fn get_status(&self) -> Result<GitStatus> {
        let repo = self.init_repository()?;
        let statuses = repo.statuses(None)?;
        
        let mut staged = Vec::new();
        let mut unstaged = Vec::new();
        let mut untracked = Vec::new();
        
        for entry in statuses.iter() {
            let path = entry.path().unwrap_or("").to_string();
            let status = entry.status();
            
            if status.is_index_new() || status.is_index_modified() || status.is_index_deleted() {
                let status_char = if status.is_index_new() {
                    "A"
                } else if status.is_index_modified() {
                    "M"
                } else {
                    "D"
                };
                staged.push(GitFileStatus { path: path.clone(), status: status_char.to_string() });
            }
            
            if status.is_wt_modified() || status.is_wt_deleted() {
                let status_char = if status.is_wt_modified() { "M" } else { "D" };
                unstaged.push(GitFileStatus { path: path.clone(), status: status_char.to_string() });
            }
            
            if status.is_wt_new() {
                untracked.push(path);
            }
        }
        
        // Handle unborn branch (newly initialized repo with no commits)
        let current_branch = match repo.head() {
            Ok(head) => head.shorthand().unwrap_or("main").to_string(),
            Err(_) => "main".to_string(), // Default branch for new repo
        };
        
        // Get ahead/behind info (will be 0 for new repo)
        let (ahead, behind) = self.get_ahead_behind(&repo).unwrap_or((0, 0));
        
        // Check for conflicts
        let index = repo.index()?;
        let has_conflicts = index.has_conflicts();
        
        Ok(GitStatus {
            current_branch,
            staged,
            unstaged,
            untracked,
            ahead,
            behind,
            has_conflicts,
        })
    }

    // Get ahead/behind counts
    fn get_ahead_behind(&self, repo: &Repository) -> Result<(usize, usize)> {
        let head = repo.head()?;
        let local_oid = head.target().ok_or_else(|| anyhow!("No local commit"))?;
        
        let branch = head.shorthand().ok_or_else(|| anyhow!("Invalid branch"))?;
        let upstream = repo.find_branch(branch, BranchType::Local)?.upstream();
        
        if let Ok(upstream_branch) = upstream {
            let upstream_oid = upstream_branch.get().target().ok_or_else(|| anyhow!("No upstream commit"))?;
            let (ahead, behind) = repo.graph_ahead_behind(local_oid, upstream_oid)?;
            Ok((ahead, behind))
        } else {
            Ok((0, 0))
        }
    }

    // List branches
    pub fn list_branches(&self) -> Result<Vec<GitBranch>> {
        let repo = self.init_repository()?;
        
        // Handle unborn branch (no commits yet)
        let current_branch_name = match repo.head() {
            Ok(head) => head.shorthand().unwrap_or("main").to_string(),
            Err(_) => "main".to_string(), // Default for new repo
        };
        
        let branches = repo.branches(None)?;
        let mut result = Vec::new();
        
        for branch_result in branches {
            if let Ok((branch, branch_type)) = branch_result {
                let name = branch.name()?.unwrap_or("").to_string();
                let is_current = &name == &current_branch_name;
                let is_remote = branch_type == BranchType::Remote;
                
                let upstream = if !is_remote {
                    branch.upstream().ok().and_then(|u| u.name().ok().flatten().map(String::from))
                } else {
                    None
                };
                
                let commit = branch.get().peel_to_commit().ok();
                let last_commit_message = commit.as_ref().map(|c| c.message().unwrap_or("").to_string());
                let last_commit_time = commit.as_ref().map(|c| c.time().seconds());
                
                result.push(GitBranch {
                    name,
                    is_current,
                    is_remote,
                    upstream,
                    last_commit_message,
                    last_commit_time,
                });
            }
        }
        
        // If no branches found (new repo), add the default branch
        if result.is_empty() {
            result.push(GitBranch {
                name: current_branch_name,
                is_current: true,
                is_remote: false,
                upstream: None,
                last_commit_message: None,
                last_commit_time: None,
            });
        }
        
        Ok(result)
    }

    // Create a new branch
    pub fn create_branch(&self, branch_name: &str) -> Result<()> {
        let repo = self.init_repository()?;
        let head = repo.head()?;
        let commit = head.peel_to_commit()?;
        repo.branch(branch_name, &commit, false)?;
        Ok(())
    }

    // Checkout branch
    pub fn checkout_branch(&self, branch_name: &str) -> Result<()> {
        let repo = self.init_repository()?;
        let (object, reference) = repo.revparse_ext(branch_name)?;
        
        repo.checkout_tree(&object, None)?;
        
        match reference {
            Some(gref) => repo.set_head(gref.name().unwrap())?,
            None => repo.set_head_detached(object.id())?,
        }
        
        Ok(())
    }

    // Stage files
    pub fn stage_files(&self, files: &[String]) -> Result<()> {
        let repo = self.init_repository()?;
        let mut index = repo.index()?;
        
        if files.is_empty() {
            // Stage all
            index.add_all(["*"].iter(), IndexAddOption::DEFAULT, None)?;
        } else {
            for file in files {
                index.add_path(Path::new(file))?;
            }
        }
        
        index.write()?;
        Ok(())
    }

    // Commit changes
    pub fn commit(&self, message: &str) -> Result<String> {
        let repo = self.init_repository()?;
        let config = self.load_config()?;
        
        // Use configured user info or fallback to git config
        let (user_name, user_email) = if let (Some(name), Some(email)) = (&config.git_user_name, &config.git_user_email) {
            (name.clone(), email.clone())
        } else {
            // Try to read from git config
            let git_config = repo.config()?;
            let name = git_config.get_string("user.name").unwrap_or_else(|_| "VibeBase User".to_string());
            let email = git_config.get_string("user.email").unwrap_or_else(|_| "user@vibebase.local".to_string());
            (name, email)
        };
        
        let signature = Signature::now(&user_name, &user_email)?;
        
        let mut index = repo.index()?;
        let tree_id = index.write_tree()?;
        let tree = repo.find_tree(tree_id)?;
        
        // Check if this is the first commit (unborn branch)
        let oid = match repo.head() {
            Ok(head) => {
                // Not the first commit, has parent
                let parent_commit = head.peel_to_commit()?;
                repo.commit(
                    Some("HEAD"),
                    &signature,
                    &signature,
                    message,
                    &tree,
                    &[&parent_commit],
                )?
            }
            Err(_) => {
                // First commit (unborn branch), no parent
                repo.commit(
                    Some("HEAD"),
                    &signature,
                    &signature,
                    message,
                    &tree,
                    &[],
                )?
            }
        };
        
        Ok(oid.to_string())
    }

    // Pull changes
    pub fn pull(&self) -> Result<PullResult> {
        let start_time = Instant::now();
        println!("[GIT PULL] Starting pull operation at {:?}", SystemTime::now());
        
        let repo = self.init_repository()?;
        println!("[GIT PULL] Repository initialized successfully");
        
        let config = self.load_config()?;
        let timeout_secs = self.get_operation_timeout();
        println!("[GIT PULL] Loaded config, timeout set to {} seconds", timeout_secs);
        
        let remote_name = config.remote_name.as_deref().unwrap_or("origin");
        println!("[GIT PULL] Using remote name: {}", remote_name);
        
        // Check if remote exists
        let remote = match repo.find_remote(remote_name) {
            Ok(r) => {
                println!("[GIT PULL] Remote '{}' found", remote_name);
                r
            },
            Err(e) => {
                println!("[GIT PULL] ERROR: Remote '{}' not found: {}", remote_name, e);
                return Ok(PullResult {
                    success: false,
                    message: "Remote 'origin' not configured. Please add a remote first: git remote add origin <url>".to_string(),
                    conflicts: Vec::new(),
                    files_changed: 0,
                });
            }
        };
        
        // 对于 GitHub SSH URL，临时修改为使用 ssh.github.com:443 以绕过 ProxyCommand
        let original_url = remote.url().map(|s| s.to_string());
        println!("[GIT PULL] Original remote URL: {:?}", original_url);
        
        let needs_url_fix = if let Some(url) = &original_url {
            url.starts_with("git@github.com:")
        } else {
            false
        };
        
        if needs_url_fix {
            if let Some(url) = &original_url {
                // 将 git@github.com:user/repo.git 转换为 ssh://git@ssh.github.com:443/user/repo.git
                let new_url = url.replace("git@github.com:", "ssh://git@ssh.github.com:443/");
                println!("[GIT PULL] Applying GitHub URL fix: {} -> {}", url, new_url);
                repo.remote_set_url(remote_name, &new_url)?;
            }
        } else {
            println!("[GIT PULL] No URL fix needed");
        }
        
        // Get current branch
        let head = match repo.head() {
            Ok(h) => {
                println!("[GIT PULL] Repository HEAD found");
                h
            },
            Err(e) => {
                println!("[GIT PULL] ERROR: Cannot get repository HEAD: {}", e);
                // 恢复原始 URL
                if needs_url_fix {
                    if let Some(url) = &original_url {
                        let _ = repo.remote_set_url(remote_name, url);
                    }
                }
                return Ok(PullResult {
                    success: false,
                    message: "Cannot pull: no commits yet. Make an initial commit first.".to_string(),
                    conflicts: Vec::new(),
                    files_changed: 0,
                });
            }
        };
        
        let branch_name = head.shorthand().unwrap_or("main");
        println!("[GIT PULL] Current branch: {}", branch_name);
        
        // 重新获取 remote（因为 URL 已更改）
        let mut remote = repo.find_remote(remote_name)?;
        
        println!("[GIT PULL] Setting up authentication callbacks...");
        let callbacks = self.get_remote_callbacks(&config)?;
        let mut fetch_options = FetchOptions::new();
        fetch_options.remote_callbacks(callbacks);
        
        // Fetch from remote
        println!("[GIT PULL] Starting fetch from remote...");
        let fetch_start = Instant::now();
        let fetch_result = remote.fetch(&[branch_name], Some(&mut fetch_options), None);
        let fetch_duration = fetch_start.elapsed();
        println!("[GIT PULL] Fetch completed in {:.2}s", fetch_duration.as_secs_f64());
        
        // 恢复原始 URL
        if needs_url_fix {
            if let Some(url) = &original_url {
                println!("[GIT PULL] Restoring original URL: {}", url);
                let _ = repo.remote_set_url(remote_name, url);
            }
        }
        
        // 检查 fetch 结果
        match &fetch_result {
            Ok(_) => println!("[GIT PULL] Fetch successful"),
            Err(e) => {
                println!("[GIT PULL] ERROR: Fetch failed: {}", e);
                return Err(anyhow!("Fetch failed: {}", e));
            }
        }
        fetch_result?;
        
        // Get the upstream branch
        println!("[GIT PULL] Looking for FETCH_HEAD...");
        let fetch_head = match repo.find_reference("FETCH_HEAD") {
            Ok(r) => {
                println!("[GIT PULL] FETCH_HEAD found");
                r
            },
            Err(e) => {
                println!("[GIT PULL] No FETCH_HEAD found: {}", e);
                let total_duration = start_time.elapsed();
                println!("[GIT PULL] Total operation time: {:.2}s", total_duration.as_secs_f64());
                return Ok(PullResult {
                    success: true,
                    message: "Already up to date (no upstream branch)".to_string(),
                    conflicts: Vec::new(),
                    files_changed: 0,
                });
            }
        };
        
        println!("[GIT PULL] Analyzing merge...");
        let fetch_commit = repo.reference_to_annotated_commit(&fetch_head)?;
        let analysis = repo.merge_analysis(&[&fetch_commit])?;
        println!("[GIT PULL] Merge analysis complete: {:?}", analysis.0);
        
        if analysis.0.is_up_to_date() {
            println!("[GIT PULL] Already up to date");
            let total_duration = start_time.elapsed();
            println!("[GIT PULL] Total operation time: {:.2}s", total_duration.as_secs_f64());
            return Ok(PullResult {
                success: true,
                message: "Already up to date".to_string(),
                conflicts: Vec::new(),
                files_changed: 0,
            });
        }
        
        if analysis.0.is_fast_forward() {
            println!("[GIT PULL] Performing fast-forward merge...");
            // Fast-forward merge
            let refname = format!("refs/heads/{}", branch_name);
            let mut reference = repo.find_reference(&refname)?;
            reference.set_target(fetch_commit.id(), "Fast-forward")?;
            repo.set_head(&refname)?;
            repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;
            
            println!("[GIT PULL] Fast-forward successful");
            let total_duration = start_time.elapsed();
            println!("[GIT PULL] Total operation time: {:.2}s", total_duration.as_secs_f64());
            return Ok(PullResult {
                success: true,
                message: "Fast-forward successful".to_string(),
                conflicts: Vec::new(),
                files_changed: 1, // Simplified
            });
        }
        
        // Normal merge (simplified - conflicts not fully handled)
        println!("[GIT PULL] Normal merge required (not implemented)");
        let total_duration = start_time.elapsed();
        println!("[GIT PULL] Total operation time: {:.2}s", total_duration.as_secs_f64());
        Ok(PullResult {
            success: false,
            message: "Merge required - manual merge not yet implemented".to_string(),
            conflicts: Vec::new(),
            files_changed: 0,
        })
    }

    // Push changes
    pub fn push(&self) -> Result<PushResult> {
        let start_time = Instant::now();
        println!("[GIT PUSH] Starting push operation at {:?}", SystemTime::now());
        println!("[GIT PUSH] Workspace path: {}", self.workspace_path);
        
        // 记录当前的 SSH 环境变量
        if let Ok(ssh_auth_sock) = env::var("SSH_AUTH_SOCK") {
            println!("[GIT PUSH] SSH_AUTH_SOCK is set to: {}", ssh_auth_sock);
        } else {
            println!("[GIT PUSH] SSH_AUTH_SOCK is not set");
        }
        
        let repo = self.init_repository()?;
        println!("[GIT PUSH] Repository initialized successfully");
        
        let config = self.load_config()?;
        let timeout_secs = self.get_operation_timeout();
        println!("[GIT PUSH] Loaded config, timeout set to {} seconds", timeout_secs);
        println!("[GIT PUSH] Auth method: {:?}", config.auth_method);
        
        let remote_name = config.remote_name.as_deref().unwrap_or("origin");
        println!("[GIT PUSH] Using remote name: {}", remote_name);
        
        // Check if remote exists and get its URL
        let remote = match repo.find_remote(remote_name) {
            Ok(r) => {
                println!("[GIT PUSH] Remote '{}' found", remote_name);
                r
            },
            Err(e) => {
                println!("[GIT PUSH] ERROR: Remote '{}' not found: {}", remote_name, e);
                return Ok(PushResult {
                    success: false,
                    message: "Remote 'origin' not configured. Please add a remote first: git remote add origin <url>".to_string(),
                    commits_pushed: 0,
                });
            }
        };
        
        // 对于 GitHub SSH URL，临时修改为使用 ssh.github.com:443 以绕过 ProxyCommand
        let original_url = remote.url().map(|s| s.to_string());
        println!("[GIT PUSH] Original remote URL: {:?}", original_url);
        
        let needs_url_fix = if let Some(url) = &original_url {
            url.starts_with("git@github.com:")
        } else {
            false
        };
        
        if needs_url_fix {
            if let Some(url) = &original_url {
                // 将 git@github.com:user/repo.git 转换为 ssh://git@ssh.github.com:443/user/repo.git
                let new_url = url.replace("git@github.com:", "ssh://git@ssh.github.com:443/");
                println!("[GIT PUSH] Applying GitHub URL fix: {} -> {}", url, new_url);
                match repo.remote_set_url(remote_name, &new_url) {
                    Ok(_) => println!("[GIT PUSH] URL updated successfully"),
                    Err(e) => println!("[GIT PUSH] ERROR: Failed to update URL: {}", e),
                }
            }
        } else {
            println!("[GIT PUSH] No URL fix needed");
        }
        
        // 重新获取 remote（因为 URL 已更改）
        let mut remote = match repo.find_remote(remote_name) {
            Ok(r) => {
                println!("[GIT PUSH] Remote re-acquired after URL update");
                r
            },
            Err(e) => {
                println!("[GIT PUSH] ERROR: Failed to re-acquire remote: {}", e);
                // 恢复原始 URL
                if needs_url_fix {
                    if let Some(url) = &original_url {
                        let _ = repo.remote_set_url(remote_name, url);
                    }
                }
                return Err(anyhow!("Failed to re-acquire remote: {}", e));
            }
        };
        
        println!("[GIT PUSH] Setting up authentication callbacks...");
        let callbacks = self.get_remote_callbacks(&config)?;
        let mut push_options = PushOptions::new();
        push_options.remote_callbacks(callbacks);
        println!("[GIT PUSH] Callbacks configured");
        
        let head = repo.head()?;
        let branch_name = head.shorthand().unwrap_or("main");
        let refspec = format!("refs/heads/{}:refs/heads/{}", branch_name, branch_name);
        println!("[GIT PUSH] Branch: {}, Refspec: {}", branch_name, refspec);
        
        println!("[GIT PUSH] Initiating push to remote...");
        let push_start = Instant::now();
        let result = remote.push(&[&refspec], Some(&mut push_options));
        let push_duration = push_start.elapsed();
        println!("[GIT PUSH] Push operation completed in {:.2}s", push_duration.as_secs_f64());
        
        // 恢复原始 URL
        if needs_url_fix {
            if let Some(url) = &original_url {
                println!("[GIT PUSH] Restoring original URL: {}", url);
                let _ = repo.remote_set_url(remote_name, url);
            }
        }
        
        let total_duration = start_time.elapsed();
        println!("[GIT PUSH] Total operation time: {:.2}s", total_duration.as_secs_f64());
        
        match result {
            Ok(_) => {
                println!("[GIT PUSH] SUCCESS: Push completed successfully");
                Ok(PushResult {
                    success: true,
                    message: "Push successful".to_string(),
                    commits_pushed: 1, // Simplified
                })
            }
            Err(e) => {
                println!("[GIT PUSH] ERROR: Push failed with error: {}", e);
                println!("[GIT PUSH] Error details: {:?}", e);
                Err(anyhow!("Push failed: {}", e))
            }
        }
    }

    // Get commit history
    pub fn get_commit_history(&self, limit: usize) -> Result<Vec<GitCommit>> {
        let repo = self.init_repository()?;
        
        // Handle empty repository (no commits yet)
        if repo.head().is_err() {
            return Ok(Vec::new());
        }
        
        let mut revwalk = repo.revwalk()?;
        
        // Try to push HEAD, return empty if it fails (unborn branch)
        if revwalk.push_head().is_err() {
            return Ok(Vec::new());
        }
        
        revwalk.set_sorting(git2::Sort::TIME)?;
        
        let mut commits = Vec::new();
        
        for (i, oid) in revwalk.enumerate() {
            if i >= limit {
                break;
            }
            
            let oid = oid?;
            let commit = repo.find_commit(oid)?;
            
            let parent_ids: Vec<String> = commit.parents().map(|p| p.id().to_string()).collect();
            
            commits.push(GitCommit {
                id: commit.id().to_string(),
                short_id: format!("{:.7}", commit.id()),
                message: commit.message().unwrap_or("").trim().to_string(),
                author_name: commit.author().name().unwrap_or("").to_string(),
                author_email: commit.author().email().unwrap_or("").to_string(),
                timestamp: commit.time().seconds(),
                parent_ids,
            });
        }
        
        Ok(commits)
    }

    // Get workspace Git summary (for WorkspaceManager)
    pub fn get_summary(&self) -> Result<GitSummary> {
        let repo_result = self.init_repository();
        
        if repo_result.is_err() {
            return Ok(GitSummary {
                has_git: false,
                current_branch: None,
                remote_url: None,
                changes_count: 0,
                ahead: 0,
                behind: 0,
            });
        }
        
        let repo = repo_result?;
        
        // Handle unborn branch (newly initialized repo)
        let current_branch = match repo.head() {
            Ok(head) => head.shorthand().map(String::from),
            Err(_) => Some("main".to_string()), // Default branch for new repo
        };
        
        // Get remote URL
        let config = self.load_config().ok();
        let remote_url = config.and_then(|c| c.remote_url);
        
        // Get changes count
        let statuses = repo.statuses(None)?;
        let changes_count = statuses.iter().count();
        
        // Get ahead/behind (will be 0 for new repo)
        let (ahead, behind) = self.get_ahead_behind(&repo).unwrap_or((0, 0));
        
        Ok(GitSummary {
            has_git: true,
            current_branch,
            remote_url,
            changes_count,
            ahead,
            behind,
        })
    }

    // Get remote callbacks for authentication with timeout support
    fn get_remote_callbacks(&self, config: &GitConfig) -> Result<RemoteCallbacks<'_>> {
        println!("[GIT CALLBACKS] Setting up remote callbacks");
        let mut callbacks = RemoteCallbacks::new();
        let config_clone = config.clone();
        
        // 设置 SSH_AUTH_SOCK 环境变量以使用 1Password SSH Agent
        if let Ok(sock_path) = env::var("SSH_AUTH_SOCK") {
            println!("[GIT CALLBACKS] SSH_AUTH_SOCK already set: {}", sock_path);
            // SSH_AUTH_SOCK 已经设置，保持不变
            env::set_var("SSH_AUTH_SOCK", sock_path);
        } else {
            println!("[GIT CALLBACKS] SSH_AUTH_SOCK not set, checking for 1Password SSH Agent...");
            // 尝试设置 1Password SSH Agent 路径
            if let Some(home) = dirs_next::home_dir() {
                let onepassword_sock = home.join("Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock");
                if onepassword_sock.exists() {
                    println!("[GIT CALLBACKS] Found 1Password SSH Agent at: {}", onepassword_sock.display());
                    env::set_var("SSH_AUTH_SOCK", onepassword_sock.to_string_lossy().to_string());
                } else {
                    println!("[GIT CALLBACKS] 1Password SSH Agent not found at: {}", onepassword_sock.display());
                }
            }
        }
        
        // 从全局应用设置读取超时时间
        let timeout_secs = self.get_operation_timeout();
        println!("[GIT CALLBACKS] Timeout configured: {} seconds", timeout_secs);
        let start_time = Arc::new(Mutex::new(Instant::now()));
        let start_time_clone = start_time.clone();
        
        // Accept all SSH certificates (simplified for now)
        callbacks.certificate_check(|_cert, host| {
            println!("[GIT CALLBACKS] Certificate check for host: {:?}", host);
            Ok(git2::CertificateCheckStatus::CertificateOk)
        });
        
        // 添加进度回调以检查超时
        callbacks.transfer_progress(move |stats| {
            let received = stats.received_objects();
            let total = stats.total_objects();
            let bytes = stats.received_bytes();
            
            if let Ok(start) = start_time_clone.lock() {
                let elapsed = start.elapsed().as_secs();
                
                // 每 5 秒输出一次进度
                if elapsed % 5 == 0 && elapsed > 0 {
                    println!("[GIT CALLBACKS] Progress: {}/{} objects, {} bytes, {:.1}s elapsed", 
                        received, total, bytes, elapsed as f64);
                }
                
                if elapsed > timeout_secs as u64 {
                    println!("[GIT CALLBACKS] TIMEOUT: Operation exceeded {} seconds, aborting", timeout_secs);
                    return false; // 返回 false 会中止操作
                }
            }
            true
        });
        
        callbacks.credentials(move |url, username_from_url, allowed_types| {
            println!("[GIT CALLBACKS] Credentials requested for URL: {}", url);
            println!("[GIT CALLBACKS] Username from URL: {:?}", username_from_url);
            println!("[GIT CALLBACKS] Allowed credential types: {:?}", allowed_types);
            
            let username = username_from_url.unwrap_or("git");
            println!("[GIT CALLBACKS] Using username: {}", username);
            
            // 首先尝试使用 SSH Agent（支持 1Password SSH Agent 等）
            println!("[GIT CALLBACKS] Attempting SSH Agent authentication...");
            if let Ok(cred) = Cred::ssh_key_from_agent(username) {
                println!("[GIT CALLBACKS] SUCCESS: SSH Agent authentication successful");
                return Ok(cred);
            } else {
                println!("[GIT CALLBACKS] SSH Agent authentication failed, trying configured auth method");
            }
            
            // 如果 SSH Agent 失败，尝试配置的认证方法
            if let Some(auth_method) = &config_clone.auth_method {
                println!("[GIT CALLBACKS] Configured auth method: {}", auth_method);
                match auth_method.as_str() {
                    "ssh" => {
                        if let Some(ssh_key_path) = &config_clone.ssh_key_path {
                            println!("[GIT CALLBACKS] Using SSH key from: {}", ssh_key_path);
                            
                            let passphrase = if let Some(key) = &config_clone.ssh_passphrase_key {
                                match KeychainService::get_git_ssh_passphrase(key) {
                                    Ok(pass) => {
                                        println!("[GIT CALLBACKS] SSH passphrase retrieved from keychain");
                                        Some(pass)
                                    },
                                    Err(e) => {
                                        println!("[GIT CALLBACKS] Failed to retrieve SSH passphrase: {}", e);
                                        None
                                    }
                                }
                            } else {
                                println!("[GIT CALLBACKS] No SSH passphrase configured");
                                None
                            };
                            
                            // Expand ~ to home directory
                            let expanded_path = if ssh_key_path.starts_with("~/") {
                                if let Some(home) = dirs_next::home_dir() {
                                    home.join(&ssh_key_path[2..])
                                } else {
                                    Path::new(ssh_key_path).to_path_buf()
                                }
                            } else {
                                Path::new(ssh_key_path).to_path_buf()
                            };
                            
                            println!("[GIT CALLBACKS] Expanded SSH key path: {}", expanded_path.display());
                            
                            let result = Cred::ssh_key(
                                username,
                                None,
                                &expanded_path,
                                passphrase.as_deref(),
                            );
                            
                            match &result {
                                Ok(_) => println!("[GIT CALLBACKS] SSH key credential created successfully"),
                                Err(e) => println!("[GIT CALLBACKS] Failed to create SSH key credential: {}", e),
                            }
                            
                            return result;
                        } else {
                            println!("[GIT CALLBACKS] ERROR: SSH auth method selected but no key path configured");
                        }
                    }
                    "token" => {
                        if let Some(token_key) = &config_clone.github_token_key {
                            println!("[GIT CALLBACKS] Attempting token authentication...");
                            match KeychainService::get_git_token(token_key) {
                                Ok(token) => {
                                    println!("[GIT CALLBACKS] Token retrieved from keychain, length: {}", token.len());
                                    return Cred::userpass_plaintext(&token, "");
                                },
                                Err(e) => {
                                    println!("[GIT CALLBACKS] Failed to retrieve token from keychain: {}", e);
                                }
                            }
                        } else {
                            println!("[GIT CALLBACKS] ERROR: Token auth method selected but no token key configured");
                        }
                    }
                    _ => {
                        println!("[GIT CALLBACKS] Unknown auth method: {}", auth_method);
                    }
                }
            } else {
                println!("[GIT CALLBACKS] No auth method configured");
            }
            
            // 最后尝试默认凭据
            println!("[GIT CALLBACKS] Falling back to default credentials");
            let result = Cred::default();
            match &result {
                Ok(_) => println!("[GIT CALLBACKS] Default credentials created"),
                Err(e) => println!("[GIT CALLBACKS] Failed to create default credentials: {}", e),
            }
            result
        });
        
        println!("[GIT CALLBACKS] All callbacks configured successfully");
        Ok(callbacks)
    }

    // Get diff for a file
    pub fn get_diff(&self) -> Result<String> {
        let repo = self.init_repository()?;
        let head = repo.head()?;
        let tree = head.peel_to_tree()?;
        
        let diff = repo.diff_tree_to_workdir_with_index(Some(&tree), None)?;
        
        let mut diff_text = String::new();
        diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
            diff_text.push_str(std::str::from_utf8(line.content()).unwrap_or(""));
            true
        })?;
        
        Ok(diff_text)
    }
}

