import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { invoke } from "@tauri-apps/api/tauri";
import "./styles/index.css";
import "./i18n/config";
import VariablesManager from "./components/variables/VariablesManager";
import { appWindow } from "@tauri-apps/api/window";

type Theme = "light" | "dark" | "system";

function VariablesWindow() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("vibebase_theme") as Theme | null;
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      setTheme(savedTheme);
    }

    // Listen for theme changes from localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "vibebase_theme" && e.newValue) {
        const newTheme = e.newValue as Theme;
        if (["light", "dark", "system"].includes(newTheme)) {
          setTheme(newTheme);
        }
      }
    };

    // Listen for storage events (changes from other windows)
    window.addEventListener("storage", handleStorageChange);

    // Also poll for changes (fallback for same-window changes)
    const interval = setInterval(() => {
      const currentTheme = localStorage.getItem("vibebase_theme") as Theme | null;
      if (currentTheme && currentTheme !== theme) {
        setTheme(currentTheme);
      }
    }, 100);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [theme]);

  useEffect(() => {
    const updateTheme = async () => {
      const root = document.documentElement;
      root.classList.remove("light", "dark");

      let effectiveTheme: string;
      if (theme === "system") {
        try {
          effectiveTheme = await invoke<string>("get_system_theme");
        } catch (error) {
          console.error("Failed to get system theme:", error);
          const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          effectiveTheme = isDark ? "dark" : "light";
        }
        root.classList.add(effectiveTheme);
      } else {
        effectiveTheme = theme;
        root.classList.add(theme);
      }

      invoke("set_window_theme", { theme: effectiveTheme }).catch((error) => {
        console.error("Failed to set window theme:", error);
      });
    };

    updateTheme();
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      const systemTheme = e.matches ? "dark" : "light";
      root.classList.add(systemTheme);

      invoke("set_window_theme", { theme: systemTheme }).catch((error) => {
        console.error("Failed to set window theme:", error);
      });
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const handleClose = () => {
    appWindow.close();
  };

  // 检测操作系统以应用正确的圆角
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
  const borderRadius = isMac ? '10px' : '8px';

  return (
    <div
      className="w-full h-screen bg-transparent"
      style={{ borderRadius, overflow: 'hidden' }}
    >
      <VariablesManager onClose={handleClose} isStandaloneWindow={true} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <VariablesWindow />
  </React.StrictMode>
);
