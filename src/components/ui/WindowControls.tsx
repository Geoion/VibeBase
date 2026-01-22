import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTranslation } from "react-i18next";

interface WindowControlsProps {
  title: string;
  onClose: () => void;
}

export default function WindowControls({ title, onClose }: WindowControlsProps) {
  const { t } = useTranslation();
  const [platform, setPlatform] = useState<string>("");

  useEffect(() => {
    detectPlatform();
  }, []);

  const detectPlatform = async () => {
    try {
      const platformName = await invoke<string>("get_platform");
      setPlatform(platformName);
    } catch (error) {
      console.error("Failed to detect platform:", error);
      // Fallback based on user agent if invoke fails
      if (navigator.userAgent.includes("Win")) setPlatform("windows");
      else if (navigator.userAgent.includes("Mac")) setPlatform("macos");
      else setPlatform("linux");
    }
  };

  const handleClose = async () => {
    try {
      const window = getCurrentWindow();
      console.log("Attempting to close window...");
      await window.close();
      console.log("Window closed successfully");
      // Also call the onClose callback if provided
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to close window:", error);
      // Try alternative method if the first one fails
      try {
        if (onClose) {
          onClose();
        }
      } catch (e) {
        console.error("Failed to call onClose callback:", e);
      }
    }
  };

  const handleMinimize = async () => {
    try {
      const window = getCurrentWindow();
      await window.minimize();
    } catch (error) {
      console.error("Failed to minimize:", error);
    }
  };

  const handleMaximize = async () => {
    try {
      const window = getCurrentWindow();
      await window.toggleMaximize();
    } catch (error) {
      console.error("Failed to maximize:", error);
    }
  };

  return (
    <div
      className="h-12 border-b border-border flex items-center justify-between px-6 bg-gradient-to-r from-card to-card/50 rounded-t-xl"
      style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}
    >
      {/* macOS style controls - left side */}
      {platform === "macos" && (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors z-10"
              title={t("actions.close")}
            />
            <button
              onClick={handleMinimize}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors z-10"
              title={t("actions.minimize")}
            />
            <button
              onClick={handleMaximize}
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors z-10"
              title={t("actions.maximize")}
            />
          </div>
          <h2 className="text-lg font-semibold flex-1 text-center" data-tauri-drag-region>
            {title}
          </h2>
          <div className="w-[68px]" data-tauri-drag-region />
        </>
      )}

      {/* Windows style controls - right side */}
      {platform === "windows" && (
        <>
          <h2 className="text-lg font-semibold flex-1" data-tauri-drag-region>
            {title}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handleMinimize}
              className="w-11 h-8 flex items-center justify-center hover:bg-accent transition-colors z-10"
              title={t("actions.minimize")}
            >
              <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
                <rect width="10" height="1" />
              </svg>
            </button>
            <button
              onClick={handleMaximize}
              className="w-11 h-8 flex items-center justify-center hover:bg-accent transition-colors z-10"
              title={t("actions.maximize")}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="0.5" y="0.5" width="9" height="9" />
              </svg>
            </button>
            <button
              onClick={handleClose}
              className="w-11 h-8 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors z-10"
              title={t("actions.close")}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M0 0L10 10M10 0L0 10" />
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Linux style controls - right side */}
      {platform === "linux" && (
        <>
          <h2 className="text-lg font-semibold flex-1" data-tauri-drag-region>
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMinimize}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent transition-colors z-10"
              title={t("actions.minimize")}
            >
              <svg width="14" height="2" viewBox="0 0 14 2" fill="currentColor">
                <rect width="14" height="2" />
              </svg>
            </button>
            <button
              onClick={handleMaximize}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent transition-colors z-10"
              title={t("actions.maximize")}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="10" height="10" />
              </svg>
            </button>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-600 hover:text-white transition-colors z-10"
              title={t("actions.close")}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 1L11 11M11 1L1 11" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Hook to get platform and window border radius
export function useWindowStyle() {
  const [platform, setPlatform] = useState<string>("");

  useEffect(() => {
    detectPlatform();
  }, []);

  const detectPlatform = async () => {
    try {
      const platformName = await invoke<string>("get_platform");
      setPlatform(platformName);
    } catch (error) {
      console.error("Failed to detect platform:", error);
    }
  };

  const getWindowBorderRadius = () => {
    if (platform === "macos") return "rounded-xl";
    if (platform === "linux") return "rounded-lg";
    return ""; // Windows has no border radius
  };

  return { platform, getWindowBorderRadius };
}

