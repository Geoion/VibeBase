import { create } from "zustand";

// 历史预览信息
export interface HistoryPreview {
  historyId: string;
  content: string;
  timestamp: number;
}

interface EditorStore {
  currentFile: string | null;
  content: string;
  isDirty: boolean;
  // 历史预览状态
  historyPreview: HistoryPreview | null;
  setCurrentFile: (filePath: string | null) => void;
  setContent: (content: string) => void;
  setDirty: (dirty: boolean) => void;
  // 历史预览方法
  setHistoryPreview: (preview: HistoryPreview | null) => void;
  clearHistoryPreview: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  currentFile: null,
  content: "",
  isDirty: false,
  historyPreview: null,

  setCurrentFile: (filePath) => set({ currentFile: filePath, historyPreview: null }),
  setContent: (content) => set({ content, isDirty: true }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setHistoryPreview: (preview) => set({ historyPreview: preview }),
  clearHistoryPreview: () => set({ historyPreview: null }),
}));








