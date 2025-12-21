import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { invoke } from "@tauri-apps/api/tauri";
import { FileCode, History, X, Check } from "lucide-react";
import MonacoEditor from "../editor/MonacoEditor";
import { useEffect, useRef, useState } from "react";

// History save interval (5 minutes)
const HISTORY_SAVE_INTERVAL = 5 * 60 * 1000;

// Record last history save time for each file
const lastHistorySaveTime: Record<string, number> = {};

export default function Canvas() {
  const { t } = useTranslation();
  const {
    currentFile,
    content,
    isDirty,
    setContent,
    setDirty,
    historyPreview,
    clearHistoryPreview,
  } = useEditorStore();
  const { workspace } = useWorkspaceStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [applying, setApplying] = useState(false);

  // Save file history (with time interval limit)
  const saveHistory = async (filePath: string, fileContent: string) => {
    if (!workspace?.path) return;

    const now = Date.now();
    const lastSaveTime = lastHistorySaveTime[filePath] || 0;

    // Check time interval: same file needs 5-minute interval
    if (now - lastSaveTime < HISTORY_SAVE_INTERVAL) {
      console.log("Skipping history save: interval not reached");
      return;
    }

    try {
      // Backend checks content_hash, returns false if content is the same
      const saved = await invoke<boolean>("save_file_history", {
        workspacePath: workspace.path,
        filePath: filePath,
        content: fileContent,
      });
      if (saved) {
        // Only update timestamp if actually saved
        lastHistorySaveTime[filePath] = now;
        console.log("File history saved");
      } else {
        console.log("History not saved: content unchanged");
      }
    } catch (error) {
      console.error("Failed to save file history:", error);
    }
  };

  // Auto-save
  useEffect(() => {
    if (!currentFile || !isDirty) return;

    // Clear previous timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Auto-save after 1 second delay
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await invoke("save_prompt", {
          filePath: currentFile,
          content: content,
        });
        setDirty(false);
        console.log("File auto-saved successfully");

        // Save file history
        await saveHistory(currentFile, content);
      } catch (error) {
        console.error("Failed to auto-save file:", error);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, currentFile, isDirty, workspace?.path]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
    }
  };

  // Format time
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  // Apply history version
  const handleApplyHistory = async () => {
    if (!workspace?.path || !historyPreview || !currentFile) return;

    try {
      setApplying(true);
      const newContent = await invoke<string>("apply_history", {
        workspacePath: workspace.path,
        historyId: historyPreview.historyId,
        filePath: currentFile,
      });

      // Update editor content
      setContent(newContent);
      setDirty(false);

      // Clear preview mode
      clearHistoryPreview();
    } catch (error) {
      console.error("Failed to apply history:", error);
      alert(t("history.apply_failed", "应用历史版本失败") + ": " + error);
    } finally {
      setApplying(false);
    }
  };

  // Whether in history preview mode
  const isHistoryPreviewMode = historyPreview !== null;

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Canvas Header */}
      <div className="h-10 border-b border-border flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          {isHistoryPreviewMode ? (
            // History preview mode header
            <>
              <History className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-foreground">
                {t("history.preview_title", "历史版本")}
              </span>
              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded">
                {historyPreview.historyId.substring(0, 8)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(historyPreview.timestamp)}
              </span>
            </>
          ) : currentFile ? (
            <>
              <FileCode className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {currentFile.split("/").pop()?.replace('.vibe.md', '')}
              </span>
              {isDirty && (
                <span className="text-xs text-muted-foreground">● Auto-saving...</span>
              )}
            </>
          ) : (
            <span className="text-sm font-medium text-foreground">
              {t("layout.canvas")}
            </span>
          )}
        </div>

        {/* History preview mode action buttons */}
        {isHistoryPreviewMode && (
          <div className="flex items-center gap-2">
            <button
              onClick={clearHistoryPreview}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
            >
              <X className="w-3 h-3" />
              {t("history.cancel_preview", "取消")}
            </button>
            <button
              onClick={handleApplyHistory}
              disabled={applying}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-primary rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="w-3 h-3" />
              {applying
                ? t("history.applying", "应用中...")
                : t("history.apply_version", "应用此版本")}
            </button>
          </div>
        )}
      </div>

      {/* Editor Area */}
      <div className="flex-1">
        {isHistoryPreviewMode ? (
          // History preview mode - read-only editor
          <MonacoEditor
            key={`history-${historyPreview.historyId}`}
            value={historyPreview.content}
            onChange={() => { }}
            language="markdown"
            readOnly={true}
          />
        ) : currentFile ? (
          <MonacoEditor
            key={`editor-${currentFile}`}
            value={content}
            onChange={handleEditorChange}
            language="markdown"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <FileCode className="w-16 h-16 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                Select a file to start editing
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

