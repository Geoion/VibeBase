import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles, Send, Settings } from "lucide-react";
import { useGitStore } from "../../stores/gitStore";
import { invoke } from "@tauri-apps/api/core";

interface CommitDialogProps {
  onClose: () => void;
}

interface GitConfig {
  commit_message_style?: string;
  commit_message_language?: string;
  commit_message_provider?: string;
  [key: string]: any;
}

export default function CommitDialog({ onClose }: CommitDialogProps) {
  const { t } = useTranslation();
  const { commit, generateCommitMessage, status, workspacePath, loadConfig } = useGitStore();
  
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<GitConfig>({
    commit_message_style: "detailed",
    commit_message_language: "auto",
  });

  useEffect(() => {
    loadGitConfig();
  }, [workspacePath]);

  const loadGitConfig = async () => {
    if (!workspacePath) return;
    try {
      const gitConfig = await invoke<GitConfig>("get_git_config", { workspacePath });
      setConfig({
        commit_message_style: gitConfig.commit_message_style || "detailed",
        commit_message_language: gitConfig.commit_message_language || "auto",
        commit_message_provider: gitConfig.commit_message_provider,
      });
    } catch (err) {
      console.error("Failed to load git config:", err);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const generated = await generateCommitMessage();
      setMessage(generated);
    } catch (err: any) {
      setError(err.message || t("git.generationFailed"));
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!workspacePath) return;
    try {
      // Load full config first
      const fullConfig = await invoke<GitConfig>("get_git_config", { workspacePath });
      // Update only commit message settings
      await invoke("save_git_config", {
        workspacePath,
        config: {
          ...fullConfig,
          commit_message_style: config.commit_message_style,
          commit_message_language: config.commit_message_language,
          commit_message_provider: config.commit_message_provider,
        },
        sshPassphrase: null,
        gitToken: null,
      });
      setShowSettings(false);
      await loadConfig();
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    }
  };

  const handleCommit = async () => {
    if (!message.trim()) {
      setError(t("git.enterCommitMessage"));
      return;
    }

    setCommitting(true);
    setError("");
    try {
      await commit(message);
      onClose();
    } catch (err: any) {
      setError(err.message || t("git.commitFailed"));
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-card border border-border rounded-lg w-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">{t("git.commitChanges")}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Files to commit */}
          <div>
            <h3 className="text-sm font-medium mb-2">
              {t("git.selectFiles")} ({status?.staged.length || 0})
            </h3>
            <div className="max-h-32 overflow-auto bg-secondary rounded-lg p-3 space-y-1">
              {status?.staged.map((file) => (
                <div key={file.path} className="flex items-center gap-2 text-sm">
                  <span className="text-green-500 font-mono w-5">{file.status}</span>
                  <span className="truncate">{file.path}</span>
                </div>
              ))}
              {(!status || status.staged.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {t("git.noFilesToCommit")}
                </p>
              )}
            </div>
          </div>

          {/* Commit Message */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{t("git.commitMessage")}</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1.5 hover:bg-accent rounded transition-colors"
                  title={t("git.messageSettings")}
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || !status || status.staged.length === 0}
                  className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  {generating ? t("git.generating") : t("git.generateMessage")}
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="mb-3 p-3 bg-secondary rounded-lg border border-border space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">{t("git.messageStyle")}</label>
                  <select
                    value={config.commit_message_style}
                    onChange={(e) => setConfig({ ...config, commit_message_style: e.target.value })}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
                  >
                    <option value="concise">{t("git.styleConcise")}</option>
                    <option value="detailed">{t("git.styleDetailed")}</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {config.commit_message_style === "concise" 
                      ? t("git.styleConciseDesc")
                      : t("git.styleDetailedDesc")
                    }
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">{t("git.messageLanguage")}</label>
                  <select
                    value={config.commit_message_language}
                    onChange={(e) => setConfig({ ...config, commit_message_language: e.target.value })}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
                  >
                    <option value="auto">{t("git.languageAuto")}</option>
                    <option value="zh-CN">{t("git.languageZhCN")}</option>
                    <option value="en">{t("git.languageEn")}</option>
                  </select>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90 transition-colors"
                  >
                    {t("actions.save")}
                  </button>
                </div>
              </div>
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("git.enterCommitMessage")}
              className="w-full h-32 px-3 py-2 bg-secondary border border-border rounded-lg resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tip: Follow Conventional Commits format: feat/fix/docs/style/refactor/test/chore
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-accent rounded-lg transition-colors"
          >
            {t("actions.cancel")}
          </button>
          <button
            onClick={handleCommit}
            disabled={committing || !message.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {committing ? t("git.generating") : t("git.commit")}
          </button>
        </div>
      </div>
    </div>
  );
}

