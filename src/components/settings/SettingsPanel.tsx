import { useState } from "react";
import { X } from "lucide-react";
import ApiKeyManager from "./ApiKeyManager";
import LLMProviderManager from "./LLMProviderManager";

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState("llmproviders");

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-[800px] h-[600px] bg-card border border-border rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Tabs */}
          <div className="w-48 border-r border-border p-2 space-y-1">
            <button
              onClick={() => setActiveTab("llmproviders")}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${activeTab === "llmproviders"
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50"
                }`}
            >
              🤖 LLM Providers
            </button>
            <button
              onClick={() => setActiveTab("apikeys")}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${activeTab === "apikeys"
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50"
                }`}
            >
              🔑 API Keys (Legacy)
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {activeTab === "llmproviders" && <LLMProviderManager />}
            {activeTab === "apikeys" && <ApiKeyManager />}
          </div>
        </div>
      </div>
    </div>
  );
}






