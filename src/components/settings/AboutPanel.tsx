import { useState } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/shell";
import {
  Info,
  Github,
  Twitter,
  Globe,
  Download,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  BookOpen,
  Mail,
  Heart,
} from "lucide-react";

interface VersionInfo {
  current_version: string;
  latest_version: string;
  update_available: boolean;
  download_url: string;
  release_notes: string;
}

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    added?: string[];
    changed?: string[];
    fixed?: string[];
    removed?: string[];
  };
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.1.0",
    date: "2025-12-12",
    changes: {
      added: [
        "Initial project setup with Tauri + React + TypeScript",
        "Three-column layout (Navigator, Canvas, Inspector)",
        "i18n support (zh-CN, zh-TW, en-US)",
        "Dark Mode theme system (Light/Dark/System)",
        "Workspace file system (open folder, scan .vibe.yaml files)",
        "Basic file tree navigation",
        "Monaco Editor integration",
        "LLM Provider management",
        "Global variables system",
        "Execution panel with variable support",
        "File history tracking",
        "Metadata management for prompts",
      ],
    },
  },
];

export default function AboutPanel() {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckUpdate = async () => {
    setChecking(true);
    setError(null);
    
    try {
      // 模拟检查更新 - 实际项目中应该调用真实的更新服务
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const info: VersionInfo = {
        current_version: "0.1.0",
        latest_version: "0.1.0",
        update_available: false,
        download_url: "https://github.com/your-repo/vibebase/releases",
        release_notes: "You are running the latest version.",
      };
      
      setUpdateInfo(info);
    } catch (err: any) {
      setError(err.message || t("about.checkUpdateFailed"));
    } finally {
      setChecking(false);
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
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-lg">
            <Info className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">VibeBase</h1>
          <p className="text-lg text-muted-foreground mb-1">
            {t("about.slogan")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("about.version")}: <span className="font-mono font-semibold">v0.1.0</span>
          </p>
        </div>
      </div>

      {/* Check for Updates */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">{t("about.checkUpdate")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("about.checkUpdateDesc")}
            </p>
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

        {updateInfo && (
          <div className={`flex items-start gap-3 p-4 rounded-lg ${
            updateInfo.update_available 
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
                  <button
                    onClick={() => handleOpenLink(updateInfo.download_url)}
                    className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                  >
                    <span>{t("about.downloadUpdate")}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
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

      {/* Author & Links */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4">{t("about.about")}</h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">{t("about.madeWith")}</p>
              <p className="text-muted-foreground">{t("about.madeByTeam")}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">{t("about.contact")}</p>
              <button
                onClick={() => handleOpenLink("mailto:contact@vibebase.dev")}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                contact@vibebase.dev
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <p className="text-sm font-medium mb-3">{t("about.links")}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleOpenLink("https://github.com/vibebase/vibebase")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Github className="w-4 h-4" />
                <span className="text-sm">GitHub</span>
                <ExternalLink className="w-3 h-3 ml-auto" />
              </button>
              
              <button
                onClick={() => handleOpenLink("https://vibebase.dev")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm">{t("about.website")}</span>
                <ExternalLink className="w-3 h-3 ml-auto" />
              </button>
              
              <button
                onClick={() => handleOpenLink("https://twitter.com/vibebase")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Twitter className="w-4 h-4" />
                <span className="text-sm">Twitter</span>
                <ExternalLink className="w-3 h-3 ml-auto" />
              </button>
              
              <button
                onClick={() => handleOpenLink("https://docs.vibebase.dev")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">{t("about.docs")}</span>
                <ExternalLink className="w-3 h-3 ml-auto" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Changelog */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4">{t("about.changelog")}</h3>
        
        <div className="space-y-6">
          {CHANGELOG.map((entry, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">
                    v{entry.version}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {entry.date}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pl-4 border-l-2 border-border">
                {entry.changes.added && entry.changes.added.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-500 mb-2">
                      ✨ {t("about.changelogAdded")}
                    </p>
                    <ul className="space-y-1">
                      {entry.changes.added.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground pl-4">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {entry.changes.changed && entry.changes.changed.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-500 mb-2">
                      🔄 {t("about.changelogChanged")}
                    </p>
                    <ul className="space-y-1">
                      {entry.changes.changed.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground pl-4">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {entry.changes.fixed && entry.changes.fixed.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-500 mb-2">
                      🐛 {t("about.changelogFixed")}
                    </p>
                    <ul className="space-y-1">
                      {entry.changes.fixed.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground pl-4">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {entry.changes.removed && entry.changes.removed.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-500 mb-2">
                      🗑️ {t("about.changelogRemoved")}
                    </p>
                    <ul className="space-y-1">
                      {entry.changes.removed.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground pl-4">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* License & Credits */}
      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>
          {t("about.license")} • {t("about.openSource")}
        </p>
        <p>
          {t("about.copyright")} © 2025 VibeBase Team. {t("about.allRightsReserved")}
        </p>
      </div>
    </div>
  );
}
