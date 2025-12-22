import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Key, Lock, User, Mail, Link as LinkIcon, AlertCircle } from "lucide-react";
import { useGitStore } from "../../stores/gitStore";
import { invoke } from "@tauri-apps/api/tauri";

interface GitConfigDialogProps {
  onClose: () => void;
}

interface SystemGitConfig {
  user_name: string | null;
  user_email: string | null;
}

export default function GitConfigDialog({ onClose }: GitConfigDialogProps) {
  const { t } = useTranslation();
  const { workspacePath, loadConfig, saveConfig } = useGitStore();
  
  const [authMethod, setAuthMethod] = useState<"none" | "ssh" | "token">("none");
  const [sshKeyPath, setSshKeyPath] = useState("~/.ssh/id_rsa");
  const [sshPassphrase, setSshPassphrase] = useState("");
  const [gitToken, setGitToken] = useState("");
  const [useCustomUserInfo, setUseCustomUserInfo] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [systemGitConfig, setSystemGitConfig] = useState<SystemGitConfig>({ user_name: null, user_email: null });
  const [remoteUrl, setRemoteUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadExistingConfig();
    loadSystemGitConfig();
  }, []);

  const loadSystemGitConfig = async () => {
    try {
      const config = await invoke<SystemGitConfig>("get_system_git_config");
      setSystemGitConfig(config);
    } catch (err) {
      console.error("Failed to load system git config:", err);
    }
  };

  const loadExistingConfig = async () => {
    try {
      await loadConfig();
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);

    try {
      // Validate
      if (authMethod === "ssh" && !sshKeyPath) {
        setError(t("git.sshKeyPath") + " is required");
        setSaving(false);
        return;
      }

      if (authMethod === "token" && !gitToken) {
        setError(t("git.token") + " is required");
        setSaving(false);
        return;
      }

      if (useCustomUserInfo && (!userName || !userEmail)) {
        setError(t("git.userName") + " and " + t("git.userEmail") + " are required");
        setSaving(false);
        return;
      }

      const config = {
        id: "default",
        repository_path: workspacePath,
        current_branch: null,
        auth_method: authMethod,
        ssh_key_path: authMethod === "ssh" ? sshKeyPath : null,
        ssh_passphrase_key: authMethod === "ssh" ? `${workspacePath?.replace(/[/\\:]/g, "_")}` : null,
        github_token_key: authMethod === "token" ? `${workspacePath?.replace(/[/\\:]/g, "_")}` : null,
        git_user_name: useCustomUserInfo ? userName : null,
        git_user_email: useCustomUserInfo ? userEmail : null,
        remote_name: "origin",
        remote_url: remoteUrl || null,
        is_configured: true,
        last_fetch: null,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      await saveConfig(
        config,
        authMethod === "ssh" ? sshPassphrase : undefined,
        authMethod === "token" ? gitToken : undefined
      );

      onClose();
    } catch (err: any) {
      setError(err.message || t("git.configFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-[600px] max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">{t("git.config")}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Security Note */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex gap-3">
              <Lock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-500 mb-1">{t("git.securityNote")}</h4>
                <p className="text-sm text-muted-foreground">{t("git.securityMessage")}</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                {t("git.userName")} & {t("git.userEmail")}
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomUserInfo}
                  onChange={(e) => setUseCustomUserInfo(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">{t("git.useCustomUserInfo")}</span>
              </label>
            </div>
            {!useCustomUserInfo ? (
              <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                <p className="text-sm font-medium mb-2">
                  ✓ {t("git.usingSystemGitConfig")}
                </p>
                {systemGitConfig.user_name || systemGitConfig.user_email ? (
                  <div className="space-y-1">
                    {systemGitConfig.user_name && (
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground">Name:</span> {systemGitConfig.user_name}
                      </p>
                    )}
                    {systemGitConfig.user_email && (
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground">Email:</span> {systemGitConfig.user_email}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-yellow-500">
                    ⚠️ System git config not found. Please run:
                    <br />
                    git config --global user.name "Your Name"
                    <br />
                    git config --global user.email "your@email.com"
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Override system git config for this workspace
                </p>
                <div>
                  <label className="block text-sm mb-1">{t("git.userName")}</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">{t("git.userEmail")}</label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Authentication Method */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Key className="w-4 h-4" />
              {t("git.authMethod")}
            </h3>
            <p className="text-sm text-muted-foreground">
              Used for authenticating with remote repository (push/pull)
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-accent">
                <input
                  type="radio"
                  name="authMethod"
                  checked={authMethod === "none"}
                  onChange={() => setAuthMethod("none")}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium">{t("git.authNone")}</div>
                  <div className="text-sm text-muted-foreground">For public repositories</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-accent">
                <input
                  type="radio"
                  name="authMethod"
                  checked={authMethod === "ssh"}
                  onChange={() => setAuthMethod("ssh")}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium">{t("git.authSSH")}</div>
                  <div className="text-sm text-muted-foreground">~/.ssh/id_rsa or custom path</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-accent">
                <input
                  type="radio"
                  name="authMethod"
                  checked={authMethod === "token"}
                  onChange={() => setAuthMethod("token")}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium">{t("git.authToken")}</div>
                  <div className="text-sm text-muted-foreground">Personal Access Token</div>
                </div>
              </label>
            </div>
          </div>

          {/* SSH Config */}
          {authMethod === "ssh" && (
            <div className="space-y-3 pl-4 border-l-2 border-blue-500">
              <div>
                <label className="block text-sm mb-1">{t("git.sshKeyPath")}</label>
                <input
                  type="text"
                  value={sshKeyPath}
                  onChange={(e) => setSshKeyPath(e.target.value)}
                  placeholder="~/.ssh/id_rsa"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">{t("git.sshPassphrase")} (Optional)</label>
                <input
                  type="password"
                  value={sshPassphrase}
                  onChange={(e) => setSshPassphrase(e.target.value)}
                  placeholder="Leave empty if no passphrase"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Token Config */}
          {authMethod === "token" && (
            <div className="space-y-3 pl-4 border-l-2 border-green-500">
              <div>
                <label className="block text-sm mb-1">{t("git.token")}</label>
                <input
                  type="password"
                  value={gitToken}
                  onChange={(e) => setGitToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Generate at: github.com/settings/tokens
                </p>
              </div>
            </div>
          )}

          {/* Remote URL */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              {t("git.remoteUrl")} (Optional)
            </h3>
            <input
              type="text"
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
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
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? t("git.generating") : t("git.saveConfig")}
          </button>
        </div>
      </div>
    </div>
  );
}

