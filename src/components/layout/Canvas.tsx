import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useConsoleStore } from "../../stores/consoleStore";
import { invoke } from "@tauri-apps/api/core";
import { FileCode, History, X, Check } from "lucide-react";
import MonacoEditor from "../editor/MonacoEditor";
import { useEffect, useRef, useState } from "react";
import { encodingForModel } from "js-tiktoken";

// History save interval (5 minutes)
const HISTORY_SAVE_INTERVAL = 5 * 60 * 1000;

// Track last history save time for each file
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
  const { addLog } = useConsoleStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [applying, setApplying] = useState(false);
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const debounceTokenRef = useRef<NodeJS.Timeout | null>(null);

  // Reset token count when file changes
  useEffect(() => {
    setTokenCount(null);
    setIsCalculating(true);
  }, [currentFile]);

  // Token calculation effect
  useEffect(() => {
    // Only calculate for active file mode (not history) and if content exists
    if (!currentFile || historyPreview) {
      setTokenCount(null);
      setIsCalculating(false);
      return;
    }

    setIsCalculating(true);

    if (debounceTokenRef.current) clearTimeout(debounceTokenRef.current);

    debounceTokenRef.current = setTimeout(() => {
      try {
        // Use cl100k_base (gpt-4) for estimation
        const enc = encodingForModel("gpt-4");
        const tokens = enc.encode(content);
        setTokenCount(tokens.length);
      } catch (e) {
        console.error("Token calculation failed", e);
        setTokenCount(null);
      } finally {
        setIsCalculating(false);
      }
    }, 800); // 800ms debounce to avoid freezing

    return () => {
      if (debounceTokenRef.current) clearTimeout(debounceTokenRef.current);
    };
  }, [content, currentFile, historyPreview]);

  // Save file history (with time interval limit)
  const saveHistory = async (filePath: string, fileContent: string) => {
    if (!workspace?.path) return;

    const now = Date.now();
    const lastSaveTime = lastHistorySaveTime[filePath] || 0;

    // Check time interval: same file needs 5-minute interval
    if (now - lastSaveTime < HISTORY_SAVE_INTERVAL) {
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
        addLog("INFO", `History saved: ${filePath}`);
      }
    } catch (error) {
      addLog("WARNING", `History save failed: ${filePath} - ${error}`);
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
        addLog("SAVE", `File saved: ${currentFile}`);

        // Save file history
        await saveHistory(currentFile, content);
      } catch (error) {
        addLog("ERROR", `Save failed: ${currentFile} - ${error}`);
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

      const historyIdShort = historyPreview.historyId.substring(0, 8);
      addLog("UPDATE", `History applied: ${currentFile} (version: ${historyIdShort})`);

      // Clear preview mode
      clearHistoryPreview();
    } catch (error) {
      addLog("ERROR", `History apply failed: ${currentFile} - ${error}`);
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

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Token Count */}
          {currentFile && !isHistoryPreviewMode && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-secondary/50 rounded-md select-none" title="Estimated token count (gpt-4)">
              <span className="text-xs text-muted-foreground">Tokens:</span>
              <span className="text-xs text-muted-foreground font-mono">
                {isCalculating || tokenCount === null ? "..." : tokenCount.toLocaleString()}
              </span>
            </div>
          )}

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

