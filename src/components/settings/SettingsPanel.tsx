import { useState, useEffect } from "react";
import { X, Moon, Sun, Languages, Download, Upload, RotateCcw, Monitor, Zap } from "lucide-react";
import { Settings, Package, Plug, FolderOpen, Keyboard, Info } from "lucide-react";
import LLMProviderManager from "./LLMProviderManager";
import WorkspaceManager from "./WorkspaceManager";
import AboutPanel from "./AboutPanel";
import { appWindow } from "@tauri-apps/api/window";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../../stores/themeStore";
import { invoke } from "@tauri-apps/api/tauri";

interface ArenaSettings {
  concurrent_execution: boolean;
  max_concurrent: number;
  cost_warning_threshold: number;
  remember_last_selection: boolean;
  auto_save_results: boolean;
  card_density: string;
}

interface SettingsPanelProps {
  onClose: () => void;
  isStandaloneWindow?: boolean;
}

type SettingsTab =
  | "general"
  | "providers"
  | "arena"
  | "mcpservers"
  | "workspace"
  | "keybindings"
  | "about";

export default function SettingsPanel({ onClose, isStandaloneWindow = false }: SettingsPanelProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [arenaSettings, setArenaSettings] = useState<ArenaSettings>({
    concurrent_execution: true,
    max_concurrent: 3,
    cost_warning_threshold: 0.5,
    remember_last_selection: true,
    auto_save_results: true,
    card_density: "normal",
  });
  const [arenaSettingsSaved, setArenaSettingsSaved] = useState(true);
  const [arenaSaveStatus, setArenaSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [arenaInitialLoad, setArenaInitialLoad] = useState(true);
  const [providersSaveStatus, setProvidersSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [generalSaveStatus, setGeneralSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  // Load arena settings
  useEffect(() => {
    loadArenaSettings();
  }, []);

  // Auto-save arena settings
  useEffect(() => {
    if (arenaInitialLoad) {
      setArenaInitialLoad(false);
      return;
    }

    if (arenaSettingsSaved || activeTab !== "arena") return;

    const autoSaveTimer = setTimeout(async () => {
      setArenaSaveStatus("saving");
      try {
        await invoke("save_arena_settings", { settings: arenaSettings });
        setArenaSettingsSaved(true);
        setArenaSaveStatus("saved");
        setTimeout(() => setArenaSaveStatus("saved"), 2000);
      } catch (error) {
        console.error("Failed to auto-save arena settings:", error);
        setArenaSaveStatus("unsaved");
      }
    }, 1000); // Auto-save 1 second after last change

    return () => clearTimeout(autoSaveTimer);
  }, [arenaSettingsSaved, arenaSettings, activeTab]);

  const loadArenaSettings = async () => {
    try {
      const settings = await invoke<ArenaSettings>("get_arena_settings");
      setArenaSettings(settings);
    } catch (error) {
      console.error("Failed to load arena settings:", error);
    }
  };


  const handleMinimize = async () => {
    try {
      await appWindow.minimize();
    } catch (error) {
      console.error("Failed to minimize window:", error);
    }
  };

  const handleMaximize = async () => {
    try {
      await appWindow.toggleMaximize();
    } catch (error) {
      console.error("Failed to maximize window:", error);
    }
  };

  const handleClose = () => {
    if (isStandaloneWindow) {
      appWindow.close();
    } else {
      onClose();
    }
  };

  const handleImportSettings = () => {
    alert("Import settings not yet implemented");
  };

  const handleExportSettings = () => {
    alert("Export settings not yet implemented");
  };

  const handleResetSettings = () => {
    if (confirm(t("providers.resetConfirm"))) {
      alert("Reset settings not yet implemented");
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
    // Sync to other windows
    window.dispatchEvent(new StorageEvent("storage", { key: "language", newValue: lang }));

    // Show auto-save status
    setGeneralSaveStatus("saved");
    setTimeout(() => setGeneralSaveStatus("saved"), 2000);
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);

    // Show auto-save status
    setGeneralSaveStatus("saved");
    setTimeout(() => setGeneralSaveStatus("saved"), 2000);
  };

  const menuItems: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "general", label: t("settingsTabs.general"), icon: Settings },
    { id: "providers", label: t("settingsTabs.providers"), icon: Package },
    { id: "arena", label: t("settingsTabs.arena"), icon: Zap },
    { id: "mcpservers", label: t("settingsTabs.mcpservers"), icon: Plug },
    { id: "workspace", label: t("settingsTabs.workspace"), icon: FolderOpen },
    { id: "keybindings", label: t("settingsTabs.keybindings"), icon: Keyboard },
    { id: "about", label: t("settingsTabs.about"), icon: Info },
  ];

  return (
    <div className={isStandaloneWindow ? "w-full h-full flex items-center justify-center bg-card" : "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"}>
      <div className={isStandaloneWindow ? "w-full h-full bg-card flex flex-col" : "w-[1200px] h-[800px] bg-card border border-border rounded-lg shadow-xl flex flex-col"}>
        {/* Header */}
        <div
          className={`h-12 border-b border-border flex items-center justify-between px-6 bg-gradient-to-r from-card to-card/50 ${isStandaloneWindow ? "" : "relative"}`}
          data-tauri-drag-region={isStandaloneWindow}
        >
          {isStandaloneWindow && (
            <div className="flex items-center gap-2" data-tauri-drag-region="none">
              <button
                onClick={handleClose}
                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex-shrink-0"
                title={t("actions.close")}
              />
              <button
                onClick={handleMinimize}
                className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors flex-shrink-0"
                title="最小化"
              />
              <button
                onClick={handleMaximize}
                className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex-shrink-0"
                title="最大化"
              />
            </div>
          )}
          <h2
            className={`text-lg font-semibold text-foreground ${isStandaloneWindow ? "flex-1 text-center" : ""}`}
            data-tauri-drag-region={isStandaloneWindow}
          >
            {t("settings.title")}
          </h2>
          {!isStandaloneWindow && (
            <button
              onClick={handleClose}
              className="absolute right-4 p-1.5 hover:bg-accent rounded transition-colors"
              title={t("actions.close")}
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {isStandaloneWindow && <div className="w-[68px]" data-tauri-drag-region="none" />}
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar Navigation */}
          <div className="w-64 border-r border-border flex flex-col">
            <div className="flex-1 overflow-auto p-3 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeTab === item.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent"
                      }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Auto-save Status Bar */}
            <div className="border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {activeTab === "providers" && providersSaveStatus === "saving" && t("metadata.auto_saving")}
                {activeTab === "providers" && providersSaveStatus === "saved" && t("metadata.auto_saved")}
                {activeTab === "arena" && arenaSaveStatus === "saving" && t("metadata.auto_saving")}
                {activeTab === "arena" && arenaSaveStatus === "saved" && t("metadata.auto_saved")}
                {activeTab === "general" && generalSaveStatus === "saving" && t("metadata.auto_saving")}
                {activeTab === "general" && generalSaveStatus === "saved" && t("metadata.auto_saved")}
                {(activeTab === "workspace" || activeTab === "about") && " "}
              </p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === "providers" && <LLMProviderManager onSaveStatusChange={setProvidersSaveStatus} />}
            {activeTab === "arena" && (
              <div className="flex-1 overflow-auto p-8 max-w-3xl mx-auto w-full">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{t("settings.general.arena")}</h3>
                  <p className="text-sm text-muted-foreground mb-8">{t("settings.general.arenaDesc")}</p>

                  <div className="space-y-6">
                    {/* Concurrent Execution */}
                    <div className="flex items-start justify-between py-4 border-b border-border">
                      <div className="flex items-start gap-3 flex-1">
                        <Zap className="w-5 h-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{t("settings.general.concurrentExecution")}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{t("settings.general.concurrentExecutionDesc")}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={arenaSettings.concurrent_execution}
                          onChange={(e) => {
                            setArenaSettings({ ...arenaSettings, concurrent_execution: e.target.checked });
                            setArenaSettingsSaved(false);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* Max Concurrent */}
                    <div className="flex items-start justify-between py-4 border-b border-border">
                      <div className="flex items-start gap-3 flex-1">
                        <Monitor className="w-5 h-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{t("settings.general.maxConcurrent")}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{t("settings.general.maxConcurrentDesc")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={arenaSettings.max_concurrent}
                          onChange={(e) => {
                            setArenaSettings({ ...arenaSettings, max_concurrent: parseInt(e.target.value) });
                            setArenaSettingsSaved(false);
                          }}
                          className="w-32"
                        />
                        <span className="text-sm font-medium w-8 text-center">{arenaSettings.max_concurrent}</span>
                      </div>
                    </div>

                    {/* Cost Warning Threshold */}
                    <div className="flex items-start justify-between py-4 border-b border-border">
                      <div className="flex items-start gap-3 flex-1">
                        <Download className="w-5 h-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{t("settings.general.costWarning")}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{t("settings.general.costWarningDesc")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">$</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={arenaSettings.cost_warning_threshold}
                          onChange={(e) => {
                            setArenaSettings({ ...arenaSettings, cost_warning_threshold: parseFloat(e.target.value) || 0 });
                            setArenaSettingsSaved(false);
                          }}
                          className="w-20 px-3 py-2 bg-secondary rounded-lg border border-border text-sm"
                        />
                      </div>
                    </div>

                    {/* Remember Last Selection */}
                    <div className="flex items-start justify-between py-4 border-b border-border">
                      <div className="flex items-start gap-3 flex-1">
                        <RotateCcw className="w-5 h-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{t("settings.general.rememberSelection")}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{t("settings.general.rememberSelectionDesc")}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={arenaSettings.remember_last_selection}
                          onChange={(e) => {
                            setArenaSettings({ ...arenaSettings, remember_last_selection: e.target.checked });
                            setArenaSettingsSaved(false);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* Auto Save Results */}
                    <div className="flex items-start justify-between py-4 border-b border-border">
                      <div className="flex items-start gap-3 flex-1">
                        <Upload className="w-5 h-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{t("settings.general.autoSaveResults")}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{t("settings.general.autoSaveResultsDesc")}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={arenaSettings.auto_save_results}
                          onChange={(e) => {
                            setArenaSettings({ ...arenaSettings, auto_save_results: e.target.checked });
                            setArenaSettingsSaved(false);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* Card Density */}
                    <div className="flex items-start justify-between py-4 border-b border-border">
                      <div className="flex items-start gap-3 flex-1">
                        <Settings className="w-5 h-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{t("settings.general.cardDensity")}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{t("settings.general.cardDensityDesc")}</p>
                        </div>
                      </div>
                      <select
                        value={arenaSettings.card_density}
                        onChange={(e) => {
                          setArenaSettings({ ...arenaSettings, card_density: e.target.value });
                          setArenaSettingsSaved(false);
                        }}
                        className="px-3 py-2 bg-secondary rounded-lg border border-border text-sm min-w-[160px]"
                      >
                        <option value="compact">{t("settings.general.densityCompact")}</option>
                        <option value="normal">{t("settings.general.densityNormal")}</option>
                        <option value="detailed">{t("settings.general.densityDetailed")}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "workspace" && <WorkspaceManager />}
            {activeTab === "about" && <AboutPanel />}
            {activeTab === "general" && (
              <div className="flex-1 overflow-auto p-8 max-w-3xl mx-auto w-full space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-6">{t("settings.general.title")}</h3>

                  {/* Language Setting */}
                  <div className="space-y-6">
                    <div className="flex items-start justify-between py-4 border-b border-border">
                      <div className="flex items-start gap-3">
                        <Languages className="w-5 h-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{t("settings.general.language")}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{t("settings.general.languageDesc")}</p>
                        </div>
                      </div>
                      <select
                        value={i18n.language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="px-3 py-2 bg-secondary rounded-lg border border-border text-sm min-w-[160px]"
                      >
                        <option value="zh-CN">{t("language.zh-CN")}</option>
                        <option value="zh-TW">{t("language.zh-TW")}</option>
                        <option value="en-US">{t("language.en-US")}</option>
                      </select>
                    </div>

                    {/* Theme Setting */}
                    <div className="flex items-start justify-between py-4 border-b border-border">
                      <div className="flex items-start gap-3">
                        {theme === "dark" ? (
                          <Moon className="w-5 h-5 mt-0.5 text-muted-foreground" />
                        ) : theme === "light" ? (
                          <Sun className="w-5 h-5 mt-0.5 text-muted-foreground" />
                        ) : (
                          <Monitor className="w-5 h-5 mt-0.5 text-muted-foreground" />
                        )}
                        <div>
                          <h4 className="font-medium">{t("settings.general.appearance")}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{t("settings.general.appearanceDesc")}</p>
                        </div>
                      </div>
                      <select
                        value={theme}
                        onChange={(e) => handleThemeChange(e.target.value as "light" | "dark" | "system")}
                        className="px-3 py-2 bg-secondary rounded-lg border border-border text-sm min-w-[160px]"
                      >
                        <option value="light">{t("theme.light")}</option>
                        <option value="dark">{t("theme.dark")}</option>
                        <option value="system">{t("theme.system")}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Actions Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-6">{t("settings.general.management")}</h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleImportSettings}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{t("settings.general.importSettings")}</div>
                        <div className="text-sm text-muted-foreground">{t("settings.general.importDesc")}</div>
                      </div>
                    </button>
                    <button
                      onClick={handleExportSettings}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{t("settings.general.exportSettings")}</div>
                        <div className="text-sm text-muted-foreground">{t("settings.general.exportDesc")}</div>
                      </div>
                    </button>
                    <button
                      onClick={handleResetSettings}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left bg-transparent hover:bg-destructive/10 rounded-lg transition-colors border border-destructive/20"
                    >
                      <RotateCcw className="w-5 h-5 text-destructive" />
                      <div>
                        <div className="font-medium text-destructive">{t("settings.general.resetSettings")}</div>
                        <div className="text-sm text-muted-foreground">{t("settings.general.resetDesc")}</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
            {activeTab !== "providers" && activeTab !== "arena" && activeTab !== "general" && activeTab !== "workspace" && activeTab !== "about" && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">{menuItems.find(m => m.id === activeTab)?.label} settings coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}







