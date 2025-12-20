import { create } from "zustand";

/**
 * @deprecated This store is no longer used in v2.0 architecture.
 * LLM Providers are now managed directly through the global app database,
 * and selected per-execution in the ExecutionPanel.
 * 
 * Keeping this file for backward compatibility with existing code.
 * Will be removed in future versions.
 */

export interface Environment {
  name?: string;
  provider_ref?: string;
  provider?: string;
  model?: string;
  api_key_env_var?: string;
  base_url?: string;
  parameters?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

export interface WorkspaceConfig {
  project_name: string;
  locale?: string;
  theme?: string;
  source_control?: {
    auto_generate_commit_message?: boolean;
    commit_message_model?: string;
    commit_message_style?: string;
    commit_message_language?: string;
  };
  environments: Record<string, Environment>;
}

interface ConfigStore {
  config: WorkspaceConfig | null;
  currentEnvironment: string | null;
  setConfig: (config: WorkspaceConfig | null) => void;
  setCurrentEnvironment: (env: string | null) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: null,
  currentEnvironment: null,
  setConfig: (config) => set({ config }),
  setCurrentEnvironment: (env) => set({ currentEnvironment: env }),
}));
















