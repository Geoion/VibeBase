import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n/config";
import "./styles/index.css";
import { invoke } from "@tauri-apps/api/tauri";

// 🔥 在 React 挂载前立即设置窗口主题
async function initializeApp() {
  try {
    const savedTheme = localStorage.getItem('vibebase_theme') || 'system';
    let effectiveTheme: string;
    
    if (savedTheme === 'system') {
      // 检测系统主题
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = isDark ? 'dark' : 'light';
    } else {
      effectiveTheme = savedTheme;
    }
    
    // 立即设置窗口主题（原生 title bar）
    console.log('🪟 [main.tsx] Setting initial window theme:', effectiveTheme);
    await invoke('set_window_theme', { theme: effectiveTheme });
    console.log('✅ [main.tsx] Window theme set successfully');
  } catch (error) {
    console.error('❌ [main.tsx] Failed to set initial window theme:', error);
    // 即使失败也继续渲染应用
  }
  
  // 设置完窗口主题后再挂载 React
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

// 启动应用
initializeApp();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);






