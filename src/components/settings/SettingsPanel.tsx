import { useState } from "react";
import { X, Moon, Sun, Languages, Download, Upload, RotateCcw, Monitor } from "lucide-react";
import { Settings, Package, Plug, FolderOpen, Keyboard, Info } from "lucide-react";
import LLMProviderManager from "./LLMProviderManager";
import { appWindow } from "@tauri-apps/api/window";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../../stores/themeStore";

interface SettingsPanelProps {
  onClose: () => void;
  isStandaloneWindow?: boolean;
}

type SettingsTab =
  | "general"
  | "providers"
  | "mcpservers"
  | "workspace"
  | "keybindings"
  | "about";

export default function SettingsPanel({ onClose, isStandaloneWindow = false }: SettingsPanelProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

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
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
  };

  const menuItems: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "general", label: "General", icon: Settings },
    { id: "providers", label: "Providers", icon: Package },
    { id: "mcpservers", label: "MCP Servers", icon: Plug },
    { id: "workspace", label: "Workspace", icon: FolderOpen },
    { id: "keybindings", label: "Keybindings", icon: Keyboard },
    { id: "about", label: "About", icon: Info },
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
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-auto">
            {activeTab === "providers" && <LLMProviderManager />}
            {activeTab === "general" && (
              <div className="p-8 max-w-3xl mx-auto space-y-8">
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
            {activeTab !== "providers" && activeTab !== "general" && (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">{menuItems.find(m => m.id === activeTab)?.label} settings coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}







