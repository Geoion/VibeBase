import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Multi-page build configuration
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        variables: path.resolve(__dirname, "variables.html"),
        settings: path.resolve(__dirname, "settings.html"),
        arena: path.resolve(__dirname, "arena.html"),
        arenaHistory: path.resolve(__dirname, "arena-history.html"),
        arenaStatistics: path.resolve(__dirname, "arena-statistics.html"),
      },
    },
  },
}));






