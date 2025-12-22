import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, GitBranch, RefreshCw, Upload, Download, GitCommit, History, Settings, CheckSquare, Square, FolderGit } from "lucide-react";
import { useGitStore } from "../../stores/gitStore";
import CommitDialog from "./CommitDialog";
import { invoke } from "@tauri-apps/api/tauri";

interface GitPanelProps {
  onClose: () => void;
}

export default function GitPanel({ onClose }: GitPanelProps) {
  const { t } = useTranslation();
  const {
    workspacePath,
    status,
    branches,
    currentBranch,
    commitHistory,
    refreshStatus,
    loadBranches,
    loadCommitHistory,
    stageFiles,
    pull,
    push,
    checkoutBranch,
  } = useGitStore();

  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [showInitConfirm, setShowInitConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        refreshStatus(),
        loadBranches(),
        loadCommitHistory(10),
      ]);
    } catch (error) {
      console.error("Failed to load Git data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    setLoading(true);
    setMessage("");
    try {
      const result = await pull();
      setMessage(result.message);
      await loadData();
    } catch (error: any) {
      setMessage(`❌ ${t("git.pullFailed")}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    setLoading(true);
    setMessage("");
    try {
      const result = await push();
      setMessage(result.message);
      await loadData();
    } catch (error: any) {
      setMessage(`❌ ${t("git.pushFailed")}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchBranch = async (branchName: string) => {
    setLoading(true);
    try {
      await checkoutBranch(branchName);
      await loadData();
      setShowBranches(false);
    } catch (error: any) {
      setMessage(`❌ ${t("git.branchSwitchFailed")}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleFileSelection = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const handleStageSelected = async () => {
    if (selectedFiles.size === 0) return;
    
    setLoading(true);
    try {
      await stageFiles(Array.from(selectedFiles));
      setSelectedFiles(new Set());
      await refreshStatus();
    } catch (error: any) {
      setMessage(`❌ Failed to stage files: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return date.toLocaleTimeString();
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const handleInitGit = async () => {
    if (!workspacePath) return;
    
    setLoading(true);
    try {
      console.log("Initializing git repository at:", workspacePath);
      await invoke("init_git_repository", { workspacePath });
      console.log("Git init successful, reloading data...");
      
      setShowInitConfirm(false);
      
      // Wait a bit for filesystem to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload data
      try {
        await refreshStatus();
        await loadBranches();
        await loadCommitHistory(10);
        console.log("Data reloaded successfully");
      } catch (reloadError) {
        console.error("Failed to reload data:", reloadError);
      }
      
      setMessage("✅ " + t("git.initSuccess"));
    } catch (error: any) {
      console.error("Git init failed:", error);
      setMessage(`❌ ${t("git.initFailed")}: ${error}`);
      setShowInitConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-8 text-center max-w-md">
            <FolderGit className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">{t("git.gitNotInitialized")}</h3>
            <p className="text-sm text-muted-foreground mb-6">{t("git.gitNotInitializedDesc")}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={onClose}
                className="px-4 py-2 hover:bg-accent rounded-lg transition-colors"
              >
                {t("actions.cancel")}
              </button>
              <button
                onClick={() => setShowInitConfirm(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t("git.initRepository")}
              </button>
            </div>
          </div>
        </div>

        {/* Init Confirm Dialog */}
        {showInitConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md">
              <h3 className="text-lg font-semibold mb-3">{t("git.confirmInit")}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("git.confirmInitDesc")}
              </p>
              <div className="bg-secondary/50 rounded p-3 mb-4">
                <code className="text-xs">git init {workspacePath}</code>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowInitConfirm(false)}
                  disabled={loading}
                  className="px-4 py-2 hover:bg-accent rounded-lg transition-colors"
                >
                  {t("actions.cancel")}
                </button>
                <button
                  onClick={handleInitGit}
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? t("git.initializing") : t("actions.confirm")}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-lg w-[800px] h-[700px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <GitBranch className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">{t("git.title")}</h2>
              <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded">
                {currentBranch || status.current_branch}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 hover:bg-accent rounded transition-colors disabled:opacity-50"
                title={t("git.refreshStatus")}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between p-3 bg-secondary border-b border-border">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                {status.unstaged.length + status.untracked.length} {t("git.unstaged")}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {status.staged.length} {t("git.staged")}
              </span>
              {status.ahead > 0 && (
                <span className="flex items-center gap-1 text-blue-500">
                  ↑ {t("git.ahead", { count: status.ahead })}
                </span>
              )}
              {status.behind > 0 && (
                <span className="flex items-center gap-1 text-orange-500">
                  ↓ {t("git.behind", { count: status.behind })}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <button
              onClick={() => setShowCommitDialog(true)}
              disabled={status.staged.length === 0 || loading}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <GitCommit className="w-4 h-4" />
              {t("git.commit")}
            </button>
            <button
              onClick={handlePull}
              disabled={loading}
              className="px-3 py-1.5 bg-secondary hover:bg-accent rounded transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t("git.pull")}
            </button>
            <button
              onClick={handlePush}
              disabled={loading}
              className="px-3 py-1.5 bg-secondary hover:bg-accent rounded transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {t("git.push")}
            </button>
            <button
              onClick={() => setShowBranches(!showBranches)}
              className="px-3 py-1.5 bg-secondary hover:bg-accent rounded transition-colors flex items-center gap-2"
            >
              <GitBranch className="w-4 h-4" />
              {t("git.branches")}
            </button>
            {selectedFiles.size > 0 && (
              <button
                onClick={handleStageSelected}
                disabled={loading}
                className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {t("git.stageAll")} ({selectedFiles.size})
              </button>
            )}
          </div>

          {/* Message */}
          {message && (
            <div className="px-4 py-2 bg-blue-500/10 border-b border-border text-sm">
              {message}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Changes List */}
            <div className="flex-1 overflow-auto p-4">
              <h3 className="font-medium mb-3">{t("git.changesCount", { count: status.unstaged.length + status.staged.length + status.untracked.length })}</h3>
              
              {/* Unstaged */}
              {(status.unstaged.length > 0 || status.untracked.length > 0) && (
                <div className="mb-4">
                  <h4 className="text-sm text-muted-foreground mb-2">{t("git.unstaged")}</h4>
                  <div className="space-y-1">
                    {status.unstaged.map((file) => (
                      <div
                        key={file.path}
                        className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                        onClick={() => toggleFileSelection(file.path)}
                      >
                        {selectedFiles.has(file.path) ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        <span className="text-yellow-500 font-mono text-sm w-5">{file.status}</span>
                        <span className="text-sm truncate flex-1">{file.path}</span>
                      </div>
                    ))}
                    {status.untracked.map((path) => (
                      <div
                        key={path}
                        className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                        onClick={() => toggleFileSelection(path)}
                      >
                        {selectedFiles.has(path) ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        <span className="text-blue-500 font-mono text-sm w-5">U</span>
                        <span className="text-sm truncate flex-1">{path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Staged */}
              {status.staged.length > 0 && (
                <div>
                  <h4 className="text-sm text-muted-foreground mb-2">{t("git.staged")}</h4>
                  <div className="space-y-1">
                    {status.staged.map((file) => (
                      <div
                        key={file.path}
                        className="flex items-center gap-2 p-2 bg-green-500/10 rounded"
                      >
                        <span className="text-green-500 font-mono text-sm w-5">{file.status}</span>
                        <span className="text-sm truncate flex-1">{file.path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {status.unstaged.length === 0 && status.staged.length === 0 && status.untracked.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  {t("git.noChanges")}
                </div>
              )}
            </div>

            {/* Branches Panel */}
            {showBranches && (
              <div className="w-64 border-l border-border overflow-auto p-4">
                <h3 className="font-medium mb-3">{t("git.branches")}</h3>
                <div className="space-y-1">
                  {branches
                    .filter((b) => !b.is_remote)
                    .map((branch) => (
                      <div
                        key={branch.name}
                        onClick={() => !branch.is_current && handleSwitchBranch(branch.name)}
                        className={`p-2 rounded cursor-pointer ${
                          branch.is_current
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-accent"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4" />
                          <span className="text-sm truncate">{branch.name}</span>
                        </div>
                        {branch.last_commit_message && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {branch.last_commit_message}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Commit History */}
            {!showBranches && (
              <div className="w-80 border-l border-border overflow-auto p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  {t("git.commitHistory")}
                </h3>
                <div className="space-y-3">
                  {commitHistory.map((commit) => (
                    <div key={commit.id} className="p-3 bg-secondary rounded-lg">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {commit.short_id}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(commit.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1">{commit.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {commit.author_name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Commit Dialog */}
      {showCommitDialog && (
        <CommitDialog onClose={() => {
          setShowCommitDialog(false);
          loadData();
        }} />
      )}
    </>
  );
}

