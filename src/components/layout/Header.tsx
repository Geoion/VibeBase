import { useTranslation } from "react-i18next";
import { useThemeStore } from "../../stores/themeStore";
import { useWorkspaceStore, Workspace } from "../../stores/workspaceStore";
import { Moon, Sun, Monitor, FolderOpen, Languages, Settings as SettingsIcon, Layers, ChevronDown, History, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";

interface RecentProject {
  id: string;
  path: string;
  name: string;
  last_opened: number;
  pinned: boolean;
}

export default function Header() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { workspace, setWorkspace } = useWorkspaceStore();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    loadRecentProjects();
  }, [workspace]);

  const loadRecentProjects = async () => {
    try {
      const projects = await invoke<RecentProject[]>("get_recent_projects", {
        limit: 10,
      });
      // Filter out current workspace and deduplicate by path
      const uniquePaths = new Set<string>();
      const filtered = projects.filter((p) => {
        if (workspace && p.path === workspace.path) return false;
        if (uniquePaths.has(p.path)) return false;
        uniquePaths.add(p.path);
        return true;
      });
      setRecentProjects(filtered);
    } catch (error) {
      console.error("Failed to load recent projects:", error);
    }
  };

  const handleSwitchWorkspace = async (path: string) => {
    try {
      const newWorkspace = await invoke<Workspace>("open_workspace", {
        path: path,
      });
      setWorkspace(newWorkspace);
      setShowWorkspaceMenu(false);
    } catch (error) {
      console.error("Failed to switch workspace:", error);
    }
  };

  const handleOpenNewWorkspace = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t("workspace.openFolder"),
      });

      if (selected && typeof selected === "string") {
        const newWorkspace = await invoke<Workspace>("open_workspace", {
          path: selected,
        });
        setWorkspace(newWorkspace);
        setShowWorkspaceMenu(false);
      }
    } catch (error) {
      console.error("Failed to open workspace:", error);
    }
  };

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const ThemeIcon = themeIcons[theme];

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("vibebase_locale", lang);
    setShowLanguageMenu(false);
  };

  const getCurrentLanguageDisplay = () => {
    const langMap: Record<string, string> = {
      "zh-CN": "简",
      "zh-TW": "繁",
      "en-US": "En"
    };
    return langMap[i18n.language] || "简";
  };

  const openVariablesWindow = async () => {
    try {
      await invoke("open_variables_window");
    } catch (error) {
      console.error("Failed to open variables window:", error);
    }
  };

  const openSettingsWindow = async () => {
    try {
      await invoke("open_settings_window");
    } catch (error) {
      console.error("Failed to open settings window:", error);
    }
  };

  const openArenaHistoryWindow = async () => {
    try {
      // Save current workspace path to localStorage
      if (workspace) {
        localStorage.setItem("arena_history_workspace", workspace.path);
      }
      await invoke("open_arena_history_window");
    } catch (error) {
      console.error("Failed to open arena history window:", error);
    }
  };

  const openArenaStatisticsWindow = async () => {
    try {
      // Save current workspace path to localStorage
      if (workspace) {
        localStorage.setItem("arena_history_workspace", workspace.path);
      }
      await invoke("open_arena_statistics_window");
    } catch (error) {
      console.error("Failed to open arena statistics window:", error);
    }
  };

  return (
    <header className="h-12 border-b border-border flex items-center px-4 bg-card">
      <div className="flex items-center gap-4 flex-1">
        {/* Workspace Selector */}
        {workspace ? (
          <div className="relative">
            <button
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="flex items-center gap-2 px-2 py-1 hover:bg-accent rounded-md transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {workspace.name}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>

            {showWorkspaceMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowWorkspaceMenu(false)}
                />
                <div className="absolute left-0 mt-2 w-64 bg-popover border border-border rounded-md shadow-lg z-20 max-h-96 overflow-auto">
                  <div className="py-1">
                    {recentProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleSwitchWorkspace(project.path)}
                        className="w-full px-4 py-2 text-left hover:bg-accent"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {project.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.path}
                        </p>
                      </button>
                    ))}
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={handleOpenNewWorkspace}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-foreground"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>{t("workspace.openNew")}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {t("workspace.noWorkspace")}
            </span>
          </div>
        )}
        {workspace && (
          <>
            <span className="text-xs text-muted-foreground">
              {t("workspace.promptsFound", { count: workspace.prompts.length })}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Variables Manager */}
        <button
          onClick={openVariablesWindow}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title="Manage Global Variables"
        >
          <Layers className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Arena History */}
        <button
          onClick={openArenaHistoryWindow}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title={t("arena.history")}
        >
          <History className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Arena Statistics */}
        <button
          onClick={openArenaStatisticsWindow}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title={t("statistics.title")}
        >
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Settings */}
        <button
          onClick={openSettingsWindow}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title="Settings"
        >
          <SettingsIcon className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="p-2 hover:bg-accent rounded-md transition-colors flex items-center gap-1"
            title={t(`language.${i18n.language}`)}
          >
            <Languages className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{getCurrentLanguageDisplay()}</span>
          </button>

          {showLanguageMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowLanguageMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-40 bg-popover border border-border rounded-md shadow-lg z-20">
                <div className="py-1">
                  {(["zh-CN", "zh-TW", "en-US"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => changeLanguage(lang)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-foreground"
                    >
                      <Languages className="w-4 h-4" />
                      <span>{t(`language.${lang}`)}</span>
                      {i18n.language === lang && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Theme Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title={t(`theme.${theme}`)}
          >
            <ThemeIcon className="w-4 h-4 text-muted-foreground" />
          </button>

          {showThemeMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowThemeMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-40 bg-popover border border-border rounded-md shadow-lg z-20">
                <div className="py-1">
                  {(["light", "dark", "system"] as const).map((themeOption) => (
                    <button
                      key={themeOption}
                      onClick={() => {
                        setTheme(themeOption);
                        setShowThemeMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-foreground"
                    >
                      {themeOption === "light" && <Sun className="w-4 h-4" />}
                      {themeOption === "dark" && <Moon className="w-4 h-4" />}
                      {themeOption === "system" && <Monitor className="w-4 h-4" />}
                      <span>{t(`theme.${themeOption}`)}</span>
                      {theme === themeOption && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

