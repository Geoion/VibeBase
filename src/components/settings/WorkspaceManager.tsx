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
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  GitBranch
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

interface GitSummary {
  has_git: boolean;
  current_branch: string | null;
  remote_url: string | null;
  changes_count: number;
  ahead: number;
  behind: number;
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
  const [gitSummaries, setGitSummaries] = useState<Map<string, GitSummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<{ path: string; name: string } | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const loadRecentProjects = async () => {
    try {
      const projects = await invoke<RecentProject[]>("get_recent_projects", { limit: 20 });
      setRecentProjects(projects);

      // Load stats for each project
      const statsMap = new Map<string, WorkspaceStats>();
      const gitMap = new Map<string, GitSummary>();

      for (const project of projects) {
        try {
          const stats = await invoke<WorkspaceStats>("get_workspace_stats", {
            workspacePath: project.path,
          });
          statsMap.set(project.path, stats);

          // Load Git summary
          try {
            const gitSummary = await invoke<GitSummary>("get_workspace_git_summary", {
              workspacePath: project.path,
            });
            console.log(`Git summary for ${project.path}:`, JSON.stringify(gitSummary, null, 2));
            gitMap.set(project.path, gitSummary);
          } catch (gitError) {
            console.log(`Git not available for ${project.path}:`, gitError);
          }
        } catch (error) {
          console.error(`Failed to load stats for ${project.path}:`, error);
        }
      }
      setWorkspaceStats(statsMap);
      setGitSummaries(gitMap);
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
    const locale = i18n.language === "zh-Hans" ? "zh-CN" : i18n.language === "zh-Hant" ? "zh-TW" : "en-US";
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDbPath = (workspacePath: string): string => {
    return `${workspacePath}/.vibebase/project.db`;
  };

  const handleCopyPath = async (workspacePath: string) => {
    try {
      await navigator.clipboard.writeText(workspacePath);
      setCopiedPath(workspacePath);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (error) {
      console.error("Failed to copy path:", error);
    }
  };

  const handleShowInFinder = async (workspacePath: string) => {
    try {
      await invoke("show_in_folder", { path: workspacePath });
    } catch (error) {
      console.error("Failed to show in finder:", error);
    }
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
    <div className="flex-1 overflow-auto p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">{t("workspaceManager.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("workspaceManager.description")}
        </p>
      </div>

      <div className="space-y-4">
        {recentProjects.map((project) => {
          const stats = workspaceStats.get(project.path);
          const gitSummary = gitSummaries.get(project.path);
          
          console.log(`Rendering project ${project.name}:`, {
            path: project.path,
            hasStats: !!stats,
            hasGitSummary: !!gitSummary,
            gitSummary: gitSummary ? JSON.stringify(gitSummary) : 'null'
          });

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
                  <div className="space-y-4">
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

                    {/* Git Info */}
                    {gitSummary ? (
                      gitSummary.has_git ? (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <GitBranch className="w-4 h-4 text-primary" />
                            <span className="font-medium text-primary">{gitSummary.current_branch || "main"}</span>
                            {gitSummary.changes_count > 0 && (
                              <span className="text-yellow-500 text-sm">● {gitSummary.changes_count}</span>
                            )}
                            {gitSummary.ahead > 0 && (
                              <span className="text-blue-500 text-sm">↑ {gitSummary.ahead}</span>
                            )}
                            {gitSummary.behind > 0 && (
                              <span className="text-orange-500 text-sm">↓ {gitSummary.behind}</span>
                            )}
                          </div>
                          {gitSummary.remote_url && (
                            <p className="text-xs text-muted-foreground truncate">
                              📍 {gitSummary.remote_url}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-muted/30 border border-border rounded-lg p-3 flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{t("git.notConfigured")}</span>
                        </div>
                      )
                    ) : null}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => handleCopyPath(project.path)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                            title={t("workspaceManager.copyPath")}
                          >
                        {copiedPath === project.path ? (
                              <>
                            <Check className="w-4 h-4 text-green-500" />
                                <span className="text-green-500">{t("workspaceManager.pathCopied")}</span>
                              </>
                            ) : (
                              <>
                            <Copy className="w-4 h-4" />
                                <span>{t("workspaceManager.copyPath")}</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleShowInFinder(project.path)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                            title={t("workspaceManager.showInFinder")}
                          >
                        <ExternalLink className="w-4 h-4" />
                            <span>{t("workspaceManager.showInFinder")}</span>
                          </button>
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
