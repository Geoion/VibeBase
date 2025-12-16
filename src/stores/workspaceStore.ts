import { create } from "zustand";

export interface PromptMetadata {
  id: string;
  file_path: string;
  name: string;
  relative_path: string;
}

export type FileNode =
  | {
      type: "folder";
      name: string;
      path: string;
      children: FileNode[];
      expanded: boolean;
    }
  | {
      type: "file";
      name: string;
      path: string;
      is_vibe_file: boolean;
    };

export interface Workspace {
  path: string;
  name: string;
  prompts: PromptMetadata[];
  file_tree: FileNode;
}

interface WorkspaceStore {
  workspace: Workspace | null;
  setWorkspace: (workspace: Workspace | null) => void;
  toggleFolder: (folderPath: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspace: null,
  
  setWorkspace: (workspace) => set({ workspace }),
  
  toggleFolder: (folderPath) =>
    set((state) => {
      if (!state.workspace) return state;

      const toggleNode = (node: FileNode): FileNode => {
        if (node.type === "folder") {
          if (node.path === folderPath) {
            return { ...node, expanded: !node.expanded };
          }
          return {
            ...node,
            children: node.children.map(toggleNode),
          };
        }
        return node;
      };

      return {
        workspace: {
          ...state.workspace,
          file_tree: toggleNode(state.workspace.file_tree),
        },
      };
    }),
}));
