export interface PromptMetadata {
  id: string;
  file_path: string;
  name: string;
  relative_path: string;
}

export interface Workspace {
  path: string;
  name: string;
  prompts: PromptMetadata[];
}

export type Theme = "light" | "dark" | "system";

export type Locale = "zh-Hans" | "en-US" | "zh-Hant" | "ja-JP";






