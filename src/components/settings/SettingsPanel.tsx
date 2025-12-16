import { useState } from "react";
import { X } from "lucide-react";
import { Settings, Package, MessageSquare, FileText, Database, Plug, FolderOpen, Mic, Palette, Globe, Keyboard, Info } from "lucide-react";
import LLMProviderManager from "./LLMProviderManager";
import { appWindow } from "@tauri-apps/api/window";
import { useTranslation } from "react-i18next";

interface SettingsPanelProps {
  onClose: () => void;
  isStandaloneWindow?: boolean;
}

type SettingsTab =
  | "general"
  | "providers"
  | "chat"
  | "prompts"
  | "memory"
  | "mcpservers"
  | "workspace"
  | "speech"
  | "userinterface"
  | "network"
  | "keybindings"
  | "about";

export default function SettingsPanel({ onClose, isStandaloneWindow = false }: SettingsPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>("providers");

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

  const menuItems: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "general", label: "General", icon: Settings },
    { id: "providers", label: "Providers", icon: Package },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "prompts", label: "Prompts", icon: FileText },
    { id: "memory", label: "Memory", icon: Database },
    { id: "mcpservers", label: "MCP Servers", icon: Plug },
    { id: "workspace", label: "Workspace", icon: FolderOpen },
    { id: "speech", label: "Speech", icon: Mic },
    { id: "userinterface", label: "User Interface", icon: Palette },
    { id: "network", label: "Network", icon: Globe },
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

            {/* Bottom Action Buttons */}
            <div className="border-t border-border p-3 space-y-2">
              <button
                onClick={handleImportSettings}
                className="w-full px-4 py-2.5 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              >
                {t("providers.importSettings")}
              </button>
              <button
                onClick={handleExportSettings}
                className="w-full px-4 py-2.5 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              >
                {t("providers.exportSettings")}
              </button>
              <button
                onClick={handleResetSettings}
                className="w-full px-4 py-2.5 text-sm font-medium text-destructive bg-transparent rounded-lg hover:bg-destructive/10 transition-colors"
              >
                {t("providers.resetSettings")}
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "providers" && <LLMProviderManager />}
            {activeTab === "general" && (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">General settings coming soon...</p>
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






