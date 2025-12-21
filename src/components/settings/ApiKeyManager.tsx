import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useConfigStore } from "../../stores/configStore";
import { Key, Check, Loader2 } from "lucide-react";

export default function ApiKeyManager() {
  const { config, currentEnvironment } = useConfigStore();
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    checkApiKey();
  }, [currentEnvironment]);

  const checkApiKey = async () => {
    if (!currentEnvironment) return;

    try {
      const exists = await invoke<boolean>("has_api_key_in_keychain", {
        environment: currentEnvironment,
      });
      setHasKey(exists);
    } catch (error) {
      console.error("Failed to check API key:", error);
    }
  };

  const handleSave = async () => {
    if (!currentEnvironment || !apiKey) return;

    setIsSaving(true);
    setMessage(null);

    try {
      await invoke("save_api_key_to_keychain", {
        environment: currentEnvironment,
        apiKey: apiKey,
      });

      setHasKey(true);
      setApiKey("");
      setMessage({ type: "success", text: "API Key saved securely to system keychain" });
    } catch (error) {
      setMessage({ type: "error", text: String(error) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentEnvironment) return;

    if (!confirm("Are you sure you want to delete this API key?")) return;

    try {
      await invoke("delete_api_key_from_keychain", {
        environment: currentEnvironment,
      });

      setHasKey(false);
      setMessage({ type: "success", text: "API Key deleted" });
    } catch (error) {
      setMessage({ type: "error", text: String(error) });
    }
  };

  if (!config || !currentEnvironment) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        Open a workspace and select an environment
      </div>
    );
  }

  const env = config.environments[currentEnvironment];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Key className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          API Key Configuration
        </h3>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          <p>Environment: <span className="font-medium text-foreground">{currentEnvironment}</span></p>
          <p>Provider: <span className="font-medium text-foreground">{env.provider}</span></p>
        </div>

        {hasKey ? (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                API Key is configured
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Stored securely in system keychain
            </p>
            <button
              onClick={handleDelete}
              className="mt-2 text-xs text-destructive hover:underline"
            >
              Delete API Key
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Enter API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Enter your ${env.provider} API key`}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleSave}
              disabled={!apiKey || isSaving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save to Keychain
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-md text-sm ${message.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400"
              : "bg-destructive/10 border border-destructive/20 text-destructive"
            }`}
        >
          {message.text}
        </div>
      )}

      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          💡 API Keys are stored securely in your system keychain (macOS Keychain / Windows Credential Manager)
        </p>
      </div>
    </div>
  );
}
