import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n/config";
import "./styles/index.css";
import { invoke } from "@tauri-apps/api/core";

// 🔥 Set window theme immediately before React mounts
async function initializeApp() {
  try {
    const savedTheme = localStorage.getItem('vibebase_theme') || 'system';
    let effectiveTheme: string;
    
    if (savedTheme === 'system') {
      // Detect system theme
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = isDark ? 'dark' : 'light';
    } else {
      effectiveTheme = savedTheme;
    }
    
    // Set window theme immediately (native title bar)
    console.log('🪟 [main.tsx] Setting initial window theme:', effectiveTheme);
    await invoke('set_window_theme', { theme: effectiveTheme });
    console.log('✅ [main.tsx] Window theme set successfully');
  } catch (error) {
    console.error('❌ [main.tsx] Failed to set initial window theme:', error);
    // Continue rendering app even if failed
  }
  
  // Mount React after setting window theme
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

// Start the app
initializeApp();
















