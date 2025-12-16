import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
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
    // Apply theme to document
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
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
