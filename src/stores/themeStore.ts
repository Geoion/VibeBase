import { create } from "zustand";

export type Theme = "light" | "dark" | "system";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

// 🔥 立即读取 localStorage 作为初始值，避免默认值导致的闪烁
const getInitialTheme = (): Theme => {
  try {
    const savedTheme = localStorage.getItem("vibebase_theme") as Theme | null;
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      console.log("📦 [themeStore] Initial theme from localStorage:", savedTheme);
      return savedTheme;
    }
  } catch (error) {
    console.error("Failed to read initial theme from localStorage:", error);
  }
  console.log("📦 [themeStore] Using default theme: system");
  return "system";
};

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: getInitialTheme(),
  
  setTheme: (theme: Theme) => {
    localStorage.setItem("vibebase_theme", theme);
    set({ theme });
  },
  
  initTheme: () => {
    // 现在 initTheme 主要用于确保主题已经初始化
    // 实际的初始化已经在 store 创建时完成
    const savedTheme = localStorage.getItem("vibebase_theme") as Theme | null;
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      set({ theme: savedTheme });
    }
  },
}));






