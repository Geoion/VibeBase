import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles, Send } from "lucide-react";
import { useGitStore } from "../../stores/gitStore";

interface CommitDialogProps {
  onClose: () => void;
}

export default function CommitDialog({ onClose }: CommitDialogProps) {
  const { t } = useTranslation();
  const { commit, generateCommitMessage, status } = useGitStore();
  
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");

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
              <button
                onClick={handleGenerate}
                disabled={generating || !status || status.staged.length === 0}
                className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                <Sparkles className="w-4 h-4" />
                {generating ? t("git.generating") : t("git.generateMessage")}
              </button>
            </div>
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

