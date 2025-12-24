import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import ExecutionPanel from "../execution/ExecutionPanel";
import HistoryPanel from "../history/HistoryPanel";

type TabType = "execution" | "history";

export default function Inspector() {
  const { t } = useTranslation();
  const { content, currentFile } = useEditorStore();
  const [variables, setVariables] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("execution");

  useEffect(() => {
    if (content && currentFile) {
      extractVariables();
    } else {
      setVariables([]);
    }
  }, [content, currentFile]);

  const extractVariables = async () => {
    try {
      // Check if it's a Markdown file
      if (currentFile?.endsWith(".vibe.md")) {
        const vars = await invoke<string[]>("extract_variables_from_markdown", {
          content: content,
        });
        setVariables(vars);
      } else {
        const vars = await invoke<string[]>("extract_variables", {
          content: content,
        });
        setVariables(vars);
      }
    } catch (error) {
      console.error("Failed to extract variables:", error);
      setVariables([]);
    }
  };

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col">
      {/* Tabs - Always visible */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("execution")}
          disabled={!currentFile}
          className={`flex-1 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "execution"
            ? "border-primary text-primary bg-accent/50"
            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30"
            } ${!currentFile ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {t("inspector.metadata", "Metadata")}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          disabled={!currentFile}
          className={`flex-1 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "history"
            ? "border-primary text-primary bg-accent/50"
            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30"
            } ${!currentFile ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {t("inspector.history", "History")}
        </button>
      </div>

      {/* Inspector Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {currentFile ? (
          <>
            {activeTab === "execution" && (
              <ExecutionPanel variables={variables} promptContent={content} filePath={currentFile} />
            )}
            {activeTab === "history" && (
              <HistoryPanel filePath={currentFile} />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-sm text-muted-foreground text-center">
              Open a file to view variables and options
            </p>
          </div>
        )}
      </div>
    </div>
  );
}