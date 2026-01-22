import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import {
  Download,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Github,
  User,
  Info,
} from "lucide-react";

interface VersionInfo {
  current_version: string;
  latest_version: string;
  update_available: boolean;
  download_url: string;
  release_notes: string;
}

export default function AboutPanel() {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState("0.1.9");
  const [isInstalling, setIsInstalling] = useState(false);

  // Get application version
  const loadVersion = async () => {
    try {
      const ver = await invoke<string>("get_app_version");
      setVersion(ver);
    } catch (error) {
      console.error("Failed to load version:", error);
    }
  };

  // Load version on component mount
  useEffect(() => {
    loadVersion();
  }, []);

  const handleCheckUpdate = async () => {
    setChecking(true);
    setError(null);

    try {
      const info = await invoke<VersionInfo>("check_for_updates");
      setUpdateInfo(info);
    } catch (err: any) {
      setError(err.message || t("about.checkUpdateFailed"));
    } finally {
      setChecking(false);
    }
  };

  const handleInstallUpdate = async () => {
    setIsInstalling(true);
    setError(null);

    try {
      await invoke("install_update");
      // Update will install and app will restart automatically
    } catch (err: any) {
      setError(err.message || t("errors.saveFailed"));
      setIsInstalling(false);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      await open(url);
    } catch (error) {
      console.error("Failed to open link:", error);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-8 max-w-3xl mx-auto w-full space-y-8">
      {/* Version & Update */}
      <div>
        <h3 className="text-lg font-semibold mb-6">{t("about.version")}</h3>

        <div className="space-y-6">
          {/* Version Display */}
          <div className="flex items-start justify-between py-4 border-b border-border">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div>
                <h4 className="font-medium">{t("about.version")}</h4>
                <p className="text-2xl font-mono font-bold text-primary mt-2">v{version}</p>
              </div>
            </div>
            <button
              onClick={handleCheckUpdate}
              disabled={checking}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
              <span>{checking ? t("about.checking") : t("about.checkNow")}</span>
            </button>
          </div>

          {/* Update Status */}
          {updateInfo && (
            <div className={`flex items-start gap-3 p-4 rounded-lg ${updateInfo.update_available
              ? "bg-blue-500/10 border border-blue-500/20"
              : "bg-green-500/10 border border-green-500/20"
              }`}>
              {updateInfo.update_available ? (
                <>
                  <Download className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-500 mb-1">
                      {t("about.updateAvailable")}
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {t("about.newVersion")}: {updateInfo.latest_version}
                    </p>
                    {updateInfo.release_notes && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {updateInfo.release_notes}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleInstallUpdate}
                        disabled={isInstalling}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>{isInstalling ? t("about.installing") : t("about.installAndRestart")}</span>
                      </button>
                      <button
                        onClick={() => handleOpenLink(updateInfo.download_url)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-blue-500 border border-blue-500 rounded-lg hover:bg-blue-500/10 transition-colors"
                      >
                        <span>{t("about.manualDownload")}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-500">
                      {t("about.upToDate")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {updateInfo.release_notes}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Error Status */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive mb-1">
                  {t("about.checkUpdateFailed")}
                </p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Project Information */}
      <div>
        <h3 className="text-lg font-semibold mb-6">{t("about.projectInfo")}</h3>

        <div className="space-y-6">
          {/* Author */}
          <div className="flex items-start justify-between py-4 border-b border-border">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div>
                <h4 className="font-medium">{t("about.author")}</h4>
                <button
                  onClick={() => handleOpenLink("https://github.com/Geoion")}
                  className="text-sm text-primary hover:underline flex items-center gap-1.5 mt-1"
                >
                  <span>Geoion</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* GitHub Repository */}
          <div className="flex items-start justify-between py-4 border-b border-border">
            <div className="flex items-start gap-3">
              <Github className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div>
                <h4 className="font-medium">{t("about.repository")}</h4>
                <button
                  onClick={() => handleOpenLink("https://github.com/Geoion/VibeBase")}
                  className="text-sm text-primary hover:underline flex items-center gap-1.5 mt-1"
                >
                  <span>github.com/Geoion/VibeBase</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
