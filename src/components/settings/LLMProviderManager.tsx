import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useTranslation } from "react-i18next";

interface LLMProvider {
  id: string;
  name: string;
  provider: string;
  model: string;
  base_url?: string;
  api_key_source: string;
  api_key_ref?: string;
  api_key_status: string;
  parameters?: string;
  is_default: boolean;
}

interface LLMProviderInput {
  name: string;
  provider: string;
  model: string;
  base_url?: string;
  api_key_source: string;
  api_key_value?: string;
  parameters?: string;
  is_default: boolean;
}

export default function LLMProviderManager() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await invoke<LLMProvider[]>("list_llm_providers");
      setProviders(data);
    } catch (error) {
      console.error("Failed to load providers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (providerName: string) => {
    if (!confirm(`Delete provider "${providerName}"?`)) {
      return;
    }

    try {
      await invoke("delete_llm_provider", { providerName });
      await loadProviders();
    } catch (error) {
      console.error("Failed to delete provider:", error);
      alert("Failed to delete provider: " + error);
    }
  };

  const handleTest = async (providerName: string) => {
    try {
      const result = await invoke<string>("test_llm_provider_connection", {
        providerName,
      });
      alert(result);
    } catch (error) {
      alert("Connection test failed: " + error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          {t("settings.llm_providers", "LLM Providers")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage global LLM provider configurations
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Loading providers...</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              No LLM providers configured yet
            </p>
            <button
              onClick={() => setShowAddDialog(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary/90"
            >
              + Add First Provider
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="p-4 border border-border rounded-lg bg-card"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-foreground">
                      {provider.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {provider.provider} • {provider.model}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {provider.api_key_status === "configured" ? (
                      <span className="text-xs text-green-600">✓ Configured</span>
                    ) : (
                      <span className="text-xs text-red-600">❌ Missing</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  {provider.base_url && (
                    <div>
                      <span className="font-medium">Base URL:</span> {provider.base_url}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">API Key:</span>{" "}
                    {provider.api_key_source === "keychain"
                      ? `●●●●●●●● (Keychain)`
                      : `$${provider.api_key_ref} (Env Var)`}
                  </div>
                  {provider.parameters && (
                    <div>
                      <span className="font-medium">Parameters:</span>{" "}
                      {provider.parameters}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setEditingProvider(provider.name)}
                    className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary rounded hover:bg-secondary/80"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleTest(provider.name)}
                    className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary rounded hover:bg-secondary/80"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => handleDelete(provider.name)}
                    className="px-3 py-1.5 text-xs font-medium text-destructive bg-destructive/10 rounded hover:bg-destructive/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowAddDialog(true)}
              className="w-full px-4 py-3 text-sm font-medium text-muted-foreground border-2 border-dashed border-border rounded-lg hover:border-primary hover:text-primary"
            >
              + Add New Provider
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {(showAddDialog || editingProvider) && (
        <AddProviderDialog
          providerName={editingProvider}
          onClose={() => {
            setShowAddDialog(false);
            setEditingProvider(null);
          }}
          onSuccess={() => {
            setShowAddDialog(false);
            setEditingProvider(null);
            loadProviders();
          }}
        />
      )}
    </div>
  );
}

interface AddProviderDialogProps {
  providerName?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

function AddProviderDialog({
  providerName,
  onClose,
  onSuccess,
}: AddProviderDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKeySource, setApiKeySource] = useState("keychain");
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (providerName) {
      loadProvider(providerName);
    }
  }, [providerName]);

  const loadProvider = async (name: string) => {
    try {
      const data = await invoke<LLMProvider>("get_llm_provider", {
        providerName: name,
      });
      setName(data.name);
      setProvider(data.provider);
      setModel(data.model);
      setBaseUrl(data.base_url || "");
      setApiKeySource(data.api_key_source);
      // Don't load API key value for security
    } catch (error) {
      console.error("Failed to load provider:", error);
    }
  };

  const handleSave = async () => {
    if (!name || !provider || !model) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);

      const input: LLMProviderInput = {
        name,
        provider,
        model,
        base_url: baseUrl || undefined,
        api_key_source: apiKeySource,
        api_key_value: apiKeyValue || undefined,
        parameters: JSON.stringify({ temperature: parseFloat(temperature) }),
        is_default: false,
      };

      if (providerName) {
        await invoke("update_llm_provider", {
          providerName,
          input,
        });
      } else {
        await invoke("save_llm_provider", { input });
      }

      onSuccess();
    } catch (error) {
      console.error("Failed to save provider:", error);
      alert("Failed to save provider: " + error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg w-[500px] max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            {providerName ? "Edit Provider" : "Add New Provider"}
          </h3>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Configuration Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g., openai_prod"
              disabled={!!providerName}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Provider *
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="deepseek">DeepSeek</option>
              <option value="openrouter">OpenRouter</option>
              <option value="ollama">Ollama</option>
              <option value="azure_openai">Azure OpenAI</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Model *
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g., gpt-4o"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Base URL (optional)
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g., https://api.openai.com/v1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              API Key Storage *
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="keychain"
                  checked={apiKeySource === "keychain"}
                  onChange={(e) => setApiKeySource(e.target.value)}
                  className="text-primary"
                />
                <span className="text-sm text-foreground">
                  System Keychain (Recommended)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="env_var"
                  checked={apiKeySource === "env_var"}
                  onChange={(e) => setApiKeySource(e.target.value)}
                  className="text-primary"
                />
                <span className="text-sm text-foreground">
                  Environment Variable
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {apiKeySource === "keychain" ? "API Key *" : "Environment Variable Name *"}
            </label>
            <input
              type={apiKeySource === "keychain" ? "password" : "text"}
              value={apiKeyValue}
              onChange={(e) => setApiKeyValue(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={
                apiKeySource === "keychain"
                  ? "sk-proj-..."
                  : "OPENAI_API_KEY"
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Default Temperature
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground bg-secondary rounded hover:bg-secondary/80"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

