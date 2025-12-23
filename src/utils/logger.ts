/**
 * Logger utility functions
 * Used to record important operations throughout the application
 */

import { useConsoleStore } from "@/stores/consoleStore";

/**
 * Get logger function (for use outside components)
 */
export const getLogger = () => {
  return useConsoleStore.getState().addLog;
};

/**
 * Convenience logging functions
 */
export const log = {
  info: (message: string) => getLogger()("INFO", message),
  success: (message: string) => getLogger()("SUCCESS", message),
  warning: (message: string) => getLogger()("WARNING", message),
  error: (message: string) => getLogger()("ERROR", message),
  save: (message: string) => getLogger()("SAVE", message),
  delete: (message: string) => getLogger()("DELETE", message),
  create: (message: string) => getLogger()("CREATE", message),
  update: (message: string) => getLogger()("UPDATE", message),
  execute: (message: string) => getLogger()("EXECUTE", message),
  git: (message: string) => getLogger()("GIT", message),
};

