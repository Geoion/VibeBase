import { create } from "zustand";

export type LogLevel = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "SAVE" | "DELETE" | "CREATE" | "UPDATE" | "EXECUTE" | "GIT";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
}

interface ConsoleStore {
  logs: LogEntry[];
  maxLogs: number;
  addLog: (level: LogLevel, message: string) => void;
  clearLogs: () => void;
}

export const useConsoleStore = create<ConsoleStore>((set) => ({
  logs: [],
  maxLogs: 1000, // Maximum 1000 logs

  addLog: (level: LogLevel, message: string) => {
    const logEntry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      level,
      message,
    };

    set((state) => {
      const newLogs = [...state.logs, logEntry];
      // Keep logs within limit
      if (newLogs.length > state.maxLogs) {
        return { logs: newLogs.slice(-state.maxLogs) };
      }
      return { logs: newLogs };
    });
  },

  clearLogs: () => set({ logs: [] }),
}));

