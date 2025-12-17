import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import {
  FolderOpen,
  Database,
  Tag,
  FileText,
  History,
  Zap,
  AlertCircle,
  Trash2,
  Plus,
  RefreshCw
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface WorkspaceStats {
  workspace_path: string;
  workspace_name: string;
  has_database: boolean;
  prompt_count: number;
  tag_count: number;
  db_size_bytes: number;
  history_count: number;
  execution_count: number;
}

interface RecentProject {
  id: string;
  path: string;
  name: string;
  last_opened: number;
  pinned: boolean;
}

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  workspaceName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmDialog({
  isOpen,
  workspaceName,
  onConfirm,
  onCancel
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-[480px] bg-card border border-border rounded-lg shadow-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-destructive/10 rounded-full">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">{t("workspaceManager.deleteConfirm.title")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("workspaceManager.deleteConfirm.message", { name: workspaceName })}
            </p>
            <p className="text-sm text-destructive mb-4">
              {t("workspaceManager.deleteConfirm.warning")}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                {t("actions.cancel")}
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                {t("workspaceManager.deleteConfirm.confirm")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceManager() {
  const { t, i18n } = useTranslation();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [workspaceStats, setWorkspaceStats] = useState<Map<string, WorkspaceStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<{ path: string; name: string } | null>(null);

  const loadRecentProjects = async () => {
    try {
      const projects = await invoke<RecentProject[]>("get_recent_projects", { limit: 20 });
      setRecentProjects(projects);

      // Load stats for each project
      const statsMap = new Map<string, WorkspaceStats>();
      for (const project of projects) {
        try {
          const stats = await invoke<WorkspaceStats>("get_workspace_stats", {
            workspacePath: project.path,
          });
          statsMap.set(project.path, stats);
        } catch (error) {
          console.error(`Failed to load stats for ${project.path}:`, error);
        }
      }
      setWorkspaceStats(statsMap);
    } catch (error) {
      console.error("Failed to load recent projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecentProjects();
  }, []);

  const handleInitialize = async (workspacePath: string) => {
    try {
      await invoke("initialize_workspace_db", { workspacePath });
      // Reload stats for this workspace
      const stats = await invoke<WorkspaceStats>("get_workspace_stats", {
        workspacePath,
      });
      setWorkspaceStats((prev) => new Map(prev).set(workspacePath, stats));
    } catch (error: any) {
      alert(`${t("workspaceManager.initializeFailed")}: ${error}`);
    }
  };

  const handleClearClick = (workspacePath: string, workspaceName: string) => {
    setSelectedWorkspace({ path: workspacePath, name: workspaceName });
    setDeleteConfirmOpen(true);
  };

  const handleClearConfirm = async () => {
    if (!selectedWorkspace) return;

    try {
      await invoke("clear_workspace_db", {
        workspacePath: selectedWorkspace.path
      });

      // Reload stats for this workspace
      const stats = await invoke<WorkspaceStats>("get_workspace_stats", {
        workspacePath: selectedWorkspace.path,
      });
      setWorkspaceStats((prev) => new Map(prev).set(selectedWorkspace.path, stats));

      setDeleteConfirmOpen(false);
      setSelectedWorkspace(null);
    } catch (error: any) {
      alert(`${t("workspaceManager.clearFailed")}: ${error}`);
    }
  };

  const handleClearCancel = () => {
    setDeleteConfirmOpen(false);
    setSelectedWorkspace(null);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const locale = i18n.language === "zh-CN" ? "zh-CN" : i18n.language === "zh-TW" ? "zh-TW" : "en-US";
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>{t("workspaceManager.loading")}</span>
        </div>
      </div>
    );
  }

  if (recentProjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg font-medium mb-2">{t("workspaceManager.noWorkspaces")}</p>
          <p className="text-sm text-muted-foreground">
            {t("workspaceManager.noWorkspacesDesc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">{t("workspaceManager.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("workspaceManager.description")}
        </p>
      </div>

      <div className="space-y-4">
        {recentProjects.map((project) => {
          const stats = workspaceStats.get(project.path);

          return (
            <div
              key={project.id}
              className="border border-border rounded-lg p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FolderOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-lg mb-1">{project.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {project.path}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("workspaceManager.lastOpened")}: {formatDate(project.last_opened)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {stats?.has_database ? (
                    <button
                      onClick={() => handleClearClick(project.path, project.name)}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors"
                      title={t("workspaceManager.clearRecords")}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t("workspaceManager.clearRecords")}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInitialize(project.path)}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      title={t("workspaceManager.initializeDb")}
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t("workspaceManager.initializeDb")}</span>
                    </button>
                  )}
                </div>
              </div>

              {stats ? (
                stats.has_database ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">{t("workspaceManager.stats.prompts")}</div>
                        <div className="text-lg font-semibold">{stats.prompt_count}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                      <Tag className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">{t("workspaceManager.stats.tags")}</div>
                        <div className="text-lg font-semibold">{stats.tag_count}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                      <Database className="w-5 h-5 text-purple-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">{t("workspaceManager.stats.dbSize")}</div>
                        <div className="text-lg font-semibold">
                          {formatBytes(stats.db_size_bytes)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                      <History className="w-5 h-5 text-orange-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">{t("workspaceManager.stats.history")}</div>
                        <div className="text-lg font-semibold">{stats.history_count}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">{t("workspaceManager.stats.executions")}</div>
                        <div className="text-lg font-semibold">{stats.execution_count}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-dashed border-border">
                    <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      {t("workspaceManager.notInitialized")}
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">{t("workspaceManager.loadingStats")}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <DeleteConfirmDialog
        isOpen={deleteConfirmOpen}
        workspaceName={selectedWorkspace?.name || ""}
        onConfirm={handleClearConfirm}
        onCancel={handleClearCancel}
      />
    </div>
  );
}
