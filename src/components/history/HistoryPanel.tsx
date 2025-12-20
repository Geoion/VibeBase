import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useTranslation } from "react-i18next";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useEditorStore } from "../../stores/editorStore";
import { Clock, Eye } from "lucide-react";

interface FileHistoryEntry {
  id: string;
  file_path: string;
  content_hash: string;
  created_at: number;
  preview: string;
}

interface HistoryPanelProps {
  filePath: string;
}

export default function HistoryPanel({ filePath }: HistoryPanelProps) {
  const { t } = useTranslation();
  const { workspace } = useWorkspaceStore();
  const { historyPreview, setHistoryPreview } = useEditorStore();
  const workspacePath = workspace?.path;

  const [historyList, setHistoryList] = useState<FileHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [filePath, workspacePath]);

  const loadHistory = async () => {
    if (!workspacePath || !filePath) return;

    try {
      setLoading(true);
      const entries = await invoke<FileHistoryEntry[]>("get_file_history", {
        workspacePath,
        filePath,
        limit: 50,
      });
      setHistoryList(entries);
    } catch (error) {
      console.error("Failed to load history:", error);
      setHistoryList([]);
    } finally {
      setLoading(false);
    }
  };

  // 点击历史记录，在编辑区预览
  const handleSelectHistory = async (entry: FileHistoryEntry) => {
    if (!workspacePath) return;

    try {
      const content = await invoke<string>("get_history_content", {
        workspacePath,
        historyId: entry.id,
      });

      // 设置历史预览状态，Canvas 会显示预览
      setHistoryPreview({
        historyId: entry.id,
        content: content,
        timestamp: entry.created_at,
      });
    } catch (error) {
      console.error("Failed to load history content:", error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than 1 minute
    if (diff < 60000) {
      return t("history.just_now", "刚刚");
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return t("history.minutes_ago", "{{count}} 分钟前", { count: minutes });
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return t("history.hours_ago", "{{count}} 小时前", { count: hours });
    }

    // Format as date
    return date.toLocaleString();
  };

  // 判断某个历史是否正在预览
  const isPreviewingHistory = (entry: FileHistoryEntry) => {
    return historyPreview?.historyId === entry.id;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              {t("history.loading", "加载历史中...")}
            </p>
          </div>
        ) : historyList.length === 0 ? (
          <div className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {t("history.no_history", "暂无历史记录")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("history.no_history_desc", "编辑文件后会自动保存历史")}
            </p>
          </div>
        ) : (
          <div>
            {historyList.map((entry) => {
              const isPreviewing = isPreviewingHistory(entry);
              return (
                <button
                  key={entry.id}
                  onClick={() => handleSelectHistory(entry)}
                  className={`w-full px-3 py-2 text-left transition-colors block ${isPreviewing
                    ? "bg-amber-500/10 border-l-2 border-amber-500"
                    : "hover:bg-accent/50"
                    }`}
                >
                  <div className="flex items-center justify-between text-xs leading-none mb-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      {isPreviewing ? (
                        <Eye className="w-3 h-3 text-amber-500" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {formatDate(entry.created_at)}
                    </span>
                    <span className="text-muted-foreground/50 font-mono">
                      {entry.content_hash.substring(0, 8)}
                    </span>
                  </div>
                  <div className="text-xs text-foreground line-clamp-3 leading-tight">
                    {entry.preview || t("history.empty_content", "(空内容)")}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
