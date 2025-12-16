import { create } from "zustand";

interface EditorStore {
  currentFile: string | null;
  content: string;
  isDirty: boolean;
  setCurrentFile: (filePath: string | null) => void;
  setContent: (content: string) => void;
  setDirty: (dirty: boolean) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  currentFile: null,
  content: "",
  isDirty: false,
  
  setCurrentFile: (filePath) => set({ currentFile: filePath }),
  setContent: (content) => set({ content, isDirty: true }),
  setDirty: (dirty) => set({ isDirty: dirty }),
}));






