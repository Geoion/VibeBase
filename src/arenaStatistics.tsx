import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import "./styles/index.css";
import "./i18n/config";
import ArenaStatisticsWindow from "./components/arena/ArenaStatisticsWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";

type Theme = "light" | "dark" | "system";

function ArenaStatisticsApp() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const savedTheme = localStorage.getItem("vibebase_theme") as Theme | null;
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      setTheme(savedTheme);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "vibebase_theme" && e.newValue) {
        const newTheme = e.newValue as Theme;
        if (["light", "dark", "system"].includes(newTheme)) {
          setTheme(newTheme);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

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

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = async (e: MediaQueryListEvent) => {
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

  const handleClose = async () => {
    try {
      const window = getCurrentWindow();
      console.log("Closing arena statistics window from entry point...");
      await window.close();
      console.log("Arena statistics window closed successfully from entry point");
    } catch (error) {
      console.error("Failed to close arena statistics window from entry point:", error);
    }
  };

  return (
    <ArenaStatisticsWindow onClose={handleClose} isStandaloneWindow={true} />
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ArenaStatisticsApp />
  </React.StrictMode>
);
