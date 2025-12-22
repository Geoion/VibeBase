use crate::models::git::*;
use crate::services::database::ProjectDatabase;
use crate::services::keychain::KeychainService;
use anyhow::{anyhow, Result};
use git2::{Repository, Signature, IndexAddOption, Cred, RemoteCallbacks, FetchOptions, PushOptions, BranchType};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct GitService {
    workspace_path: String,
}

impl GitService {
    pub fn new(workspace_path: &str) -> Self {
        Self {
            workspace_path: workspace_path.to_string(),
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
                    remote_name, remote_url, is_configured, last_fetch, created_at, updated_at
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
                    created_at: row.get(13)?,
                    updated_at: row.get(14)?,
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
                remote_name, remote_url, is_configured, last_fetch, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
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
        let repo = self.init_repository()?;
        let config = self.load_config()?;
        
        let remote_name = config.remote_name.as_deref().unwrap_or("origin");
        
        // Check if remote exists
        let mut remote = match repo.find_remote(remote_name) {
            Ok(r) => r,
            Err(_) => {
                return Ok(PullResult {
                    success: false,
                    message: "Remote 'origin' not configured. Please add a remote first: git remote add origin <url>".to_string(),
                    conflicts: Vec::new(),
                    files_changed: 0,
                });
            }
        };
        // Get current branch
        let head = match repo.head() {
            Ok(h) => h,
            Err(_) => {
                return Ok(PullResult {
                    success: false,
                    message: "Cannot pull: no commits yet. Make an initial commit first.".to_string(),
                    conflicts: Vec::new(),
                    files_changed: 0,
                });
            }
        };
        
        let branch_name = head.shorthand().unwrap_or("main");
        
        let callbacks = self.get_remote_callbacks(&config)?;
        let mut fetch_options = FetchOptions::new();
        fetch_options.remote_callbacks(callbacks);
        
        // Fetch from remote
        remote.fetch(&[branch_name], Some(&mut fetch_options), None)?;
        
        // Get the upstream branch
        let fetch_head = match repo.find_reference("FETCH_HEAD") {
            Ok(r) => r,
            Err(_) => {
                return Ok(PullResult {
                    success: true,
                    message: "Already up to date (no upstream branch)".to_string(),
                    conflicts: Vec::new(),
                    files_changed: 0,
                });
            }
        };
        
        let fetch_commit = repo.reference_to_annotated_commit(&fetch_head)?;
        let analysis = repo.merge_analysis(&[&fetch_commit])?;
        
        if analysis.0.is_up_to_date() {
            return Ok(PullResult {
                success: true,
                message: "Already up to date".to_string(),
                conflicts: Vec::new(),
                files_changed: 0,
            });
        }
        
        if analysis.0.is_fast_forward() {
            // Fast-forward merge
            let refname = format!("refs/heads/{}", branch_name);
            let mut reference = repo.find_reference(&refname)?;
            reference.set_target(fetch_commit.id(), "Fast-forward")?;
            repo.set_head(&refname)?;
            repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;
            
            return Ok(PullResult {
                success: true,
                message: "Fast-forward successful".to_string(),
                conflicts: Vec::new(),
                files_changed: 1, // Simplified
            });
        }
        
        // Normal merge (simplified - conflicts not fully handled)
        Ok(PullResult {
            success: false,
            message: "Merge required - manual merge not yet implemented".to_string(),
            conflicts: Vec::new(),
            files_changed: 0,
        })
    }

    // Push changes
    pub fn push(&self) -> Result<PushResult> {
        let repo = self.init_repository()?;
        let config = self.load_config()?;
        
        let remote_name = config.remote_name.as_deref().unwrap_or("origin");
        
        // Check if remote exists
        let mut remote = match repo.find_remote(remote_name) {
            Ok(r) => r,
            Err(_) => {
                return Ok(PushResult {
                    success: false,
                    message: "Remote 'origin' not configured. Please add a remote first: git remote add origin <url>".to_string(),
                    commits_pushed: 0,
                });
            }
        };
        let callbacks = self.get_remote_callbacks(&config)?;
        let mut push_options = PushOptions::new();
        push_options.remote_callbacks(callbacks);
        
        let head = repo.head()?;
        let branch_name = head.shorthand().unwrap_or("main");
        let refspec = format!("refs/heads/{}:refs/heads/{}", branch_name, branch_name);
        
        remote.push(&[&refspec], Some(&mut push_options))?;
        
        Ok(PushResult {
            success: true,
            message: "Push successful".to_string(),
            commits_pushed: 1, // Simplified
        })
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

    // Get remote callbacks for authentication
    fn get_remote_callbacks(&self, config: &GitConfig) -> Result<RemoteCallbacks> {
        let mut callbacks = RemoteCallbacks::new();
        let config_clone = config.clone();
        
        // Accept all SSH certificates (simplified for now)
        callbacks.certificate_check(|_cert, _host| {
            Ok(git2::CertificateCheckStatus::CertificateOk)
        });
        
        callbacks.credentials(move |_url, username_from_url, _allowed_types| {
            if let Some(auth_method) = &config_clone.auth_method {
                match auth_method.as_str() {
                    "ssh" => {
                        if let Some(ssh_key_path) = &config_clone.ssh_key_path {
                            let passphrase = if let Some(key) = &config_clone.ssh_passphrase_key {
                                KeychainService::get_git_ssh_passphrase(key).ok()
                            } else {
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
                            
                            return Cred::ssh_key(
                                username_from_url.unwrap_or("git"),
                                None,
                                &expanded_path,
                                passphrase.as_deref(),
                            );
                        }
                    }
                    "token" => {
                        if let Some(token_key) = &config_clone.github_token_key {
                            if let Ok(token) = KeychainService::get_git_token(token_key) {
                                return Cred::userpass_plaintext(&token, "");
                            }
                        }
                    }
                    _ => {}
                }
            }
            
            Cred::default()
        });
        
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

