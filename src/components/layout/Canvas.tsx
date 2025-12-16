import { useTranslation } from "react-i18next";
import { useEditorStore } from "../../stores/editorStore";
import { invoke } from "@tauri-apps/api/tauri";
import { FileCode } from "lucide-react";
import MonacoEditor from "../editor/MonacoEditor";
import { useEffect, useRef } from "react";

export default function Canvas() {
  const { t } = useTranslation();
  const { currentFile, content, isDirty, setContent, setDirty } = useEditorStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 自动保存
  useEffect(() => {
    if (!currentFile || !isDirty) return;

    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 延迟 1 秒后自动保存
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await invoke("save_prompt", {
          filePath: currentFile,
          content: content,
        });
        setDirty(false);
        console.log("File auto-saved successfully");
      } catch (error) {
        console.error("Failed to auto-save file:", error);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, currentFile, isDirty]);

  const handleSave = async () => {
    if (!currentFile || !isDirty) return;

    // 清除自动保存定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    try {
      await invoke("save_prompt", {
        filePath: currentFile,
        content: content,
      });
      setDirty(false);
      console.log("File saved successfully");
    } catch (error) {
      console.error("Failed to save file:", error);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Canvas Header */}
      <div className="h-10 border-b border-border flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          {currentFile ? (
            <>
              <FileCode className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {currentFile.split("/").pop()?.replace('.vibe.md', '')}
              </span>
              {isDirty && (
                <span className="text-xs text-muted-foreground">● 自动保存中...</span>
              )}
            </>
          ) : (
            <span className="text-sm font-medium text-foreground">
              {t("layout.canvas")}
            </span>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1">
        {currentFile ? (
          <MonacoEditor value={content} onChange={handleEditorChange} />
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

