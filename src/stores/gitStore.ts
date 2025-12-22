import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';

interface GitConfig {
  id: string;
  repository_path: string | null;
  current_branch: string | null;
  auth_method: string | null;
  ssh_key_path: string | null;
  ssh_passphrase_key: string | null;
  github_token_key: string | null;
  git_user_name: string | null;
  git_user_email: string | null;
  remote_name: string | null;
  remote_url: string | null;
  is_configured: boolean;
  last_fetch: number | null;
  created_at: number;
  updated_at: number;
}

interface GitFileStatus {
  path: string;
  status: string;
}

interface GitStatus {
  current_branch: string;
  staged: GitFileStatus[];
  unstaged: GitFileStatus[];
  untracked: string[];
  ahead: number;
  behind: number;
  has_conflicts: boolean;
}

interface GitBranch {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  upstream: string | null;
  last_commit_message: string | null;
  last_commit_time: number | null;
}

interface GitCommit {
  id: string;
  short_id: string;
  message: string;
  author_name: string;
  author_email: string;
  timestamp: number;
  parent_ids: string[];
}

interface PullResult {
  success: boolean;
  message: string;
  conflicts: string[];
  files_changed: number;
}

interface PushResult {
  success: boolean;
  message: string;
  commits_pushed: number;
}

interface GitStore {
  config: GitConfig | null;
  status: GitStatus | null;
  branches: GitBranch[];
  currentBranch: string | null;
  commitHistory: GitCommit[];
  workspacePath: string | null;
  
  // Actions
  setWorkspacePath: (path: string) => void;
  loadConfig: () => Promise<void>;
  saveConfig: (config: GitConfig, sshPassphrase?: string, gitToken?: string) => Promise<void>;
  refreshStatus: () => Promise<void>;
  loadBranches: () => Promise<void>;
  checkoutBranch: (name: string) => Promise<void>;
  createBranch: (name: string) => Promise<void>;
  stageFiles: (files: string[]) => Promise<void>;
  commit: (message: string) => Promise<string>;
  pull: () => Promise<PullResult>;
  push: () => Promise<PushResult>;
  loadCommitHistory: (limit?: number) => Promise<void>;
  generateCommitMessage: () => Promise<string>;
  getDiff: () => Promise<string>;
  reset: () => void;
}

export const useGitStore = create<GitStore>((set, get) => ({
  config: null,
  status: null,
  branches: [],
  currentBranch: null,
  commitHistory: [],
  workspacePath: null,

  setWorkspacePath: (path: string) => {
    set({ workspacePath: path });
  },

  loadConfig: async () => {
    const { workspacePath } = get();
    if (!workspacePath) return;

    try {
      const config = await invoke<GitConfig>('get_git_config', {
        workspacePath,
      });
      set({ config });
    } catch (error) {
      console.error('Failed to load Git config:', error);
      set({ config: null });
    }
  },

  saveConfig: async (config: GitConfig, sshPassphrase?: string, gitToken?: string) => {
    const { workspacePath } = get();
    if (!workspacePath) return;

    try {
      await invoke('save_git_config', {
        workspacePath,
        config,
        sshPassphrase: sshPassphrase || null,
        gitToken: gitToken || null,
      });
      set({ config });
    } catch (error) {
      console.error('Failed to save Git config:', error);
      throw error;
    }
  },

  refreshStatus: async () => {
    const { workspacePath } = get();
    if (!workspacePath) return;

    try {
      const status = await invoke<GitStatus>('get_git_status', {
        workspacePath,
      });
      set({ status, currentBranch: status.current_branch });
    } catch (error) {
      console.error('Failed to get Git status:', error);
      set({ status: null });
    }
  },

  loadBranches: async () => {
    const { workspacePath } = get();
    if (!workspacePath) return;

    try {
      const branches = await invoke<GitBranch[]>('list_branches', {
        workspacePath,
      });
      set({ branches });
    } catch (error) {
      console.error('Failed to load branches:', error);
      set({ branches: [] });
    }
  },

  checkoutBranch: async (name: string) => {
    const { workspacePath } = get();
    if (!workspacePath) return;

    try {
      await invoke('checkout_branch', {
        workspacePath,
        branchName: name,
      });
      await get().refreshStatus();
      await get().loadBranches();
    } catch (error) {
      console.error('Failed to checkout branch:', error);
      throw error;
    }
  },

  createBranch: async (name: string) => {
    const { workspacePath } = get();
    if (!workspacePath) return;

    try {
      await invoke('create_branch', {
        workspacePath,
        branchName: name,
      });
      await get().loadBranches();
    } catch (error) {
      console.error('Failed to create branch:', error);
      throw error;
    }
  },

  stageFiles: async (files: string[]) => {
    const { workspacePath } = get();
    if (!workspacePath) return;

    try {
      await invoke('stage_files', {
        workspacePath,
        files,
      });
      await get().refreshStatus();
    } catch (error) {
      console.error('Failed to stage files:', error);
      throw error;
    }
  },

  commit: async (message: string) => {
    const { workspacePath } = get();
    if (!workspacePath) throw new Error('No workspace path');

    try {
      const commitId = await invoke<string>('commit_changes', {
        workspacePath,
        message,
      });
      await get().refreshStatus();
      await get().loadCommitHistory();
      return commitId;
    } catch (error) {
      console.error('Failed to commit:', error);
      throw error;
    }
  },

  pull: async () => {
    const { workspacePath } = get();
    if (!workspacePath) throw new Error('No workspace path');

    try {
      const result = await invoke<PullResult>('pull_changes', {
        workspacePath,
      });
      await get().refreshStatus();
      return result;
    } catch (error) {
      console.error('Failed to pull:', error);
      throw error;
    }
  },

  push: async () => {
    const { workspacePath } = get();
    if (!workspacePath) throw new Error('No workspace path');

    try {
      const result = await invoke<PushResult>('push_changes', {
        workspacePath,
      });
      await get().refreshStatus();
      return result;
    } catch (error) {
      console.error('Failed to push:', error);
      throw error;
    }
  },

  loadCommitHistory: async (limit = 20) => {
    const { workspacePath } = get();
    if (!workspacePath) return;

    try {
      const commitHistory = await invoke<GitCommit[]>('get_commit_history', {
        workspacePath,
        limit,
      });
      set({ commitHistory });
    } catch (error) {
      console.error('Failed to load commit history:', error);
      set({ commitHistory: [] });
    }
  },

  generateCommitMessage: async () => {
    const { workspacePath } = get();
    if (!workspacePath) throw new Error('No workspace path');

    try {
      const message = await invoke<string>('generate_commit_message', {
        workspacePath,
        providerName: null,
      });
      return message;
    } catch (error) {
      console.error('Failed to generate commit message:', error);
      throw error;
    }
  },

  getDiff: async () => {
    const { workspacePath } = get();
    if (!workspacePath) throw new Error('No workspace path');

    try {
      const diff = await invoke<string>('get_git_diff', {
        workspacePath,
      });
      return diff;
    } catch (error) {
      console.error('Failed to get diff:', error);
      throw error;
    }
  },

  reset: () => {
    set({
      config: null,
      status: null,
      branches: [],
      currentBranch: null,
      commitHistory: [],
      workspacePath: null,
    });
  },
}));

