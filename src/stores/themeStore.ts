import { create } from "zustand";

export type Theme = "light" | "dark" | "system";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "system",
  
  setTheme: (theme: Theme) => {
    localStorage.setItem("vibebase_theme", theme);
    set({ theme });
  },
  
  initTheme: () => {
    const savedTheme = localStorage.getItem("vibebase_theme") as Theme | null;
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      set({ theme: savedTheme });
    }
  },
}));






