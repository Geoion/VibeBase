import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useTranslation } from "react-i18next";
import { Search, Eye, EyeOff, Zap, Trash2, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface LLMProvider {
  id: string;
  name: string;
  provider: string;
  model: string;
  base_url?: string;
  api_key?: string;
  api_key_source: string;
  api_key_ref?: string;
  api_key_status: string;
  parameters?: string;
  enabled: boolean;
  enabled_models?: string;
  is_default: boolean;
}

interface ProviderModel {
  id: string;
  name: string;
  displayName: string;
  modelPath: string;
  enabled: boolean;
  manual?: boolean;
}

// Built-in provider configurations
const BUILTIN_PROVIDERS = [
  { id: "openrouter", name: "OpenRouter", description: "Access hundreds of AI models through OpenRouter unified API" },
  { id: "openai", name: "OpenAI", description: "Official OpenAI API for GPT models" },
  { id: "anthropic", name: "Anthropic", description: "Claude models from Anthropic" },
  { id: "google", name: "Google Gemini", description: "Google's Gemini AI models" },
  { id: "aihubmix", name: "AiHubMix", description: "AI Hub Mix unified API" },
  { id: "deepseek", name: "DeepSeek", description: "DeepSeek AI models" },
  { id: "azure", name: "Azure OpenAI", description: "Microsoft Azure OpenAI Service" },
  { id: "github", name: "GitHub Copilot", description: "GitHub Copilot models" },
];

interface LLMProviderManagerProps {
  onSaveStatusChange?: (status: "saved" | "saving" | "unsaved") => void;
}

export default function LLMProviderManager({ onSaveStatusChange }: LLMProviderManagerProps) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Selected provider details
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [providerEnabled, setProviderEnabled] = useState(false);
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [savedEnabledModels, setSavedEnabledModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  // Model selection dialog state
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [availableModels, setAvailableModels] = useState<ProviderModel[]>([]);
  const [dialogSearchQuery, setDialogSearchQuery] = useState("");
  const [selectedModelsInDialog, setSelectedModelsInDialog] = useState<Set<string>>(new Set());

  // Test connection state
  const [testingConnection, setTestingConnection] = useState(false);
  const [showTestResult, setShowTestResult] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    if (saved || !selectedProvider) return;

    const autoSaveTimer = setTimeout(async () => {
      setSaveStatus("saving");
      onSaveStatusChange?.("saving");
      await handleSaveInternal();
      setSaveStatus("saved");
      onSaveStatusChange?.("saved");
      setTimeout(() => {
        setSaveStatus("saved");
        onSaveStatusChange?.("saved");
      }, 2000);
    }, 1000); // Auto-save 1 second after last change

    return () => clearTimeout(autoSaveTimer);
  }, [saved, apiKey, providerEnabled, models]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await invoke<LLMProvider[]>("list_llm_providers");
      setProviders(data);

      // Auto-select first provider or the one we're currently viewing
      if (data.length > 0) {
        let providerToSelect = selectedProvider;

        // If no provider is selected yet, select the first configured one or "openrouter"
        if (!providerToSelect) {
          // Try to find a configured provider
          const configuredProvider = data.find(p => p.api_key_status === "configured");
          if (configuredProvider) {
            providerToSelect = configuredProvider.provider;
          } else {
            // Default to openrouter
            providerToSelect = "openrouter";
          }
          setSelectedProvider(providerToSelect);
        }

        // Load details for the selected provider
        loadProviderDetailsWithData(providerToSelect, data);
      }
    } catch (error) {
      console.error("Failed to load providers:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProviderDetailsWithData = async (providerName: string, providersList: LLMProvider[]) => {
    try {
      console.log("[loadProviderDetailsWithData] Loading provider:", providerName);

      // Try to find existing config from the provided list
      const existingConfig = providersList.find(p => p.provider === providerName || p.name === providerName);

      if (existingConfig) {
        // Load the full provider details to get the actual API key
        try {
          const fullProvider = await invoke<LLMProvider>("get_llm_provider", {
            providerName: existingConfig.name,
          });

          console.log("[loadProviderDetailsWithData] fullProvider:", fullProvider);

          setApiKey(fullProvider.api_key || "");
          setProviderEnabled(fullProvider.enabled);

          // Parse and load enabled models
          if (fullProvider.enabled_models) {
            try {
              const enabledModelIds = JSON.parse(fullProvider.enabled_models) as string[];
              console.log("[loadProviderDetailsWithData] Parsed enabledModelIds:", enabledModelIds);

              setSavedEnabledModels(enabledModelIds);

              // Create model objects from saved IDs
              if (enabledModelIds.length > 0) {
                const savedModels = enabledModelIds.map(modelId => ({
                  id: modelId,
                  name: modelId,
                  displayName: modelId,
                  modelPath: modelId,
                  enabled: true,
                  manual: false,
                }));

                console.log("[loadProviderDetailsWithData] Setting models:", savedModels);
                setModels(savedModels);
              } else {
                console.log("[loadProviderDetailsWithData] No enabled models, clearing list");
                setModels([]);
              }
            } catch (e) {
              console.error("Failed to parse enabled_models:", e);
              setSavedEnabledModels([]);
              setModels([]);
            }
          } else {
            console.log("[loadProviderDetailsWithData] No enabled_models field");
            setSavedEnabledModels([]);
            setModels([]);
          }
        } catch (error) {
          console.error("Error loading provider details:", error);
          setApiKey("");
          setProviderEnabled(false);
          setSavedEnabledModels([]);
          setModels([]);
        }
      } else {
        console.log("[loadProviderDetailsWithData] No existing config for provider:", providerName);
        // No config yet for this provider - default to disabled
        setApiKey("");
        setProviderEnabled(false);
        setSavedEnabledModels([]);
        setModels([]);
      }
    } catch (error) {
      console.error("Failed to load provider details:", error);
    }
  };

  const loadProviderDetails = async (providerName: string) => {
    loadProviderDetailsWithData(providerName, providers);
  };

  const loadDefaultModels = (providerName: string) => {
    // No default models - require user to fetch
    setModels([]);
  };

  const handleProviderSelect = (providerName: string) => {
    setSelectedProvider(providerName);
    loadProviderDetailsWithData(providerName, providers);
  };


  const handleOpenModelDialog = async () => {
    if (!selectedProvider || !apiKey) {
      alert("Please enter an API Key first");
      return;
    }

    setFetchingModels(true);
    try {
      const selectedBuiltin = BUILTIN_PROVIDERS.find(p => p.id === selectedProvider);
      if (!selectedBuiltin) return;

      const modelsList = await invoke<Array<{ id: string, name: string, description?: string }>>("fetch_provider_models", {
        provider: selectedBuiltin.id,
        apiKey: apiKey,
        baseUrl: undefined,
      });

      // Set available models
      const available = modelsList.map(m => ({
        id: m.id,
        name: m.id,
        displayName: m.name,
        modelPath: m.id,
        enabled: false,
        manual: false,
      }));
      setAvailableModels(available);

      // Pre-select currently enabled models
      const currentlyEnabled = new Set(models.filter(m => m.enabled).map(m => m.id));
      setSelectedModelsInDialog(currentlyEnabled);

      setShowModelDialog(true);
    } catch (error) {
      console.error("Failed to fetch models:", error);
      alert("Failed to fetch models: " + error);
    } finally {
      setFetchingModels(false);
    }
  };

  const handleConfirmModelSelection = () => {
    // Update models list with selected models
    const selectedModelIds = Array.from(selectedModelsInDialog);
    const updatedModels = availableModels
      .filter(m => selectedModelIds.includes(m.id))
      .map(m => ({
        ...m,
        enabled: true,
      }));

    setModels(updatedModels);
    setSaved(false);
    setShowModelDialog(false);
    setDialogSearchQuery("");
  };

  const handleToggleModelInDialog = (modelId: string) => {
    setSelectedModelsInDialog(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelId)) {
        newSet.delete(modelId);
      } else {
        newSet.add(modelId);
      }
      return newSet;
    });
  };



  const handleDeleteModel = (modelId: string) => {
    if (confirm(t("providers.deleteModelConfirm", "Delete this model?"))) {
      setModels((prev) => prev.filter((m) => m.id !== modelId));
      setSaved(false);
    }
  };

  const handleSaveInternal = async () => {
    if (!selectedProvider) return;

    try {
      const selectedBuiltin = BUILTIN_PROVIDERS.find(p => p.id === selectedProvider);
      if (!selectedBuiltin) return;

      // Check if provider already exists
      const existingProvider = providers.find(p => p.provider === selectedProvider);

      // Get list of enabled model IDs
      const enabledModelIds = models.filter(m => m.enabled).map(m => m.id);

      console.log("[handleSaveInternal] Saving models:", enabledModelIds);

      const input = {
        name: existingProvider?.name || `${selectedBuiltin.id}_default`,
        provider: selectedBuiltin.id,
        model: models.find(m => m.enabled)?.name || "",
        base_url: undefined,
        api_key: apiKey || undefined,
        api_key_source: "direct",
        api_key_value: undefined,
        parameters: JSON.stringify({ temperature: 0.7 }),
        enabled: providerEnabled,
        enabled_models: enabledModelIds.length > 0 ? JSON.stringify(enabledModelIds) : undefined,
        is_default: false,
      };

      console.log("[handleSaveInternal] Saving input:", input);

      if (existingProvider) {
        // Update existing provider
        await invoke("update_llm_provider", {
          providerName: existingProvider.name,
          input,
        });
        console.log("[handleSaveInternal] Updated existing provider");
      } else {
        // Create new provider
        await invoke("save_llm_provider", { input });
        console.log("[handleSaveInternal] Created new provider");
      }

      // Reload providers list
      console.log("[handleSaveInternal] Reloading providers...");
      await loadProviders();

      console.log("[handleSaveInternal] Models after reload:", models);

      setSaved(true);
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  const handleAddCustomProvider = () => {
    alert("Add custom provider not yet implemented");
  };

  const handleTestConnection = async () => {
    if (!selectedProvider || !apiKey) {
      setTestResult({
        success: false,
        message: t("providers.testNoApiKey", "请先输入 API Key")
      });
      setShowTestResult(true);
      return;
    }

    setTestingConnection(true);
    try {
      const selectedBuiltin = BUILTIN_PROVIDERS.find(p => p.id === selectedProvider);
      if (!selectedBuiltin) return;

      const result = await invoke<string>("test_provider_connection", {
        provider: selectedBuiltin.id,
        apiKey: apiKey,
        baseUrl: undefined,
      });

      setTestResult({
        success: true,
        message: result
      });
      setShowTestResult(true);
    } catch (error: any) {
      console.error("Connection test failed:", error);
      setTestResult({
        success: false,
        message: error.toString()
      });
      setShowTestResult(true);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleDeleteProvider = async () => {
    if (!selectedProvider) return;

    const existingProvider = providers.find(p => p.provider === selectedProvider);
    if (!existingProvider) {
      alert("No configuration to delete");
      return;
    }

    if (!confirm(t("providers.deleteConfirm", "Delete this provider configuration?"))) {
      return;
    }

    try {
      await invoke("delete_llm_provider", {
        providerName: existingProvider.name,
      });

      await loadProviders();
      setApiKey("");
      setProviderEnabled(false);
      setSavedEnabledModels([]);
      setModels([]);
      alert("Provider configuration deleted");
    } catch (error) {
      console.error("Failed to delete provider:", error);
      alert("Failed to delete provider: " + error);
    }
  };

  const handleToggleProviderEnabled = () => {
    setProviderEnabled(prev => !prev);
    setSaved(false);
  };

  const filteredProviders = BUILTIN_PROVIDERS.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredModels = models
    .filter((m) =>
      m.displayName.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
      m.modelPath.toLowerCase().includes(modelSearchQuery.toLowerCase())
    )
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const filteredDialogModels = availableModels
    .filter((m) =>
      m.displayName.toLowerCase().includes(dialogSearchQuery.toLowerCase()) ||
      m.modelPath.toLowerCase().includes(dialogSearchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Selected models first
      const aSelected = selectedModelsInDialog.has(a.id);
      const bSelected = selectedModelsInDialog.has(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

  const selectedBuiltinProvider = BUILTIN_PROVIDERS.find(
    (p) => p.id === selectedProvider
  );

  const selectedProviderConfig = providers.find(
    (p) => p.provider === selectedProvider
  );

  const isProviderConfigured = selectedProviderConfig?.api_key_status === "configured";

  return (
    <div className="flex flex-col h-full">
      {/* Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Middle Column - Provider List */}
        <div className="w-80 border-r border-border flex flex-col">
          {/* Search Bar */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("providers.searchProviders")}
                className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleAddCustomProvider}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
            >
              {t("providers.addCustomProvider")}
            </button>
          </div>

          {/* Provider List */}
          <div className="flex-1 overflow-auto p-3 space-y-1">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">{t("providers.loading")}</p>
              </div>
            ) : filteredProviders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {t("providers.noProvidersFound")}
                </p>
              </div>
            ) : (
              filteredProviders.map((provider) => {
                const isConfigured = providers.some(
                  p => p.provider === provider.id && p.api_key_status === "configured"
                );

                return (
                  <button
                    key={provider.id}
                    onClick={() => handleProviderSelect(provider.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${selectedProvider === provider.id
                      ? "bg-primary/10 border border-primary"
                      : "hover:bg-accent border border-transparent"
                      }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {provider.name}
                      </div>
                    </div>
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${isConfigured ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column - Provider Details */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedBuiltinProvider ? (
            <>
              {/* Provider Header */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground">
                        {selectedBuiltinProvider.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {selectedBuiltinProvider.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isProviderConfigured && providerEnabled ? (
                      <span className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                        {t("providers.active")}
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                        {t("providers.inactive")}
                      </span>
                    )}
                    <button
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t("providers.testConnection")}
                    >
                      {testingConnection ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={handleToggleProviderEnabled}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${providerEnabled ? "bg-primary" : "bg-muted-foreground/20"
                        }`}
                      title={providerEnabled ? "Disable provider" : "Enable provider"}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${providerEnabled ? "translate-x-6" : "translate-x-0.5"
                          }`}
                      />
                    </button>
                    <button
                      onClick={handleDeleteProvider}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Delete configuration"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Provider Details Content */}
              <div className="flex-1 overflow-auto p-6 space-y-6">
                {/* API Key Section */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t("providers.apiKey")}
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setSaved(false);
                      }}
                      placeholder={t("providers.apiKeyPlaceholder")}
                      className="w-full px-3 py-2 pr-10 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Get your API key from{" "}
                    <a
                      href={`https://${selectedBuiltinProvider.id === "openrouter" ? "openrouter.ai" : selectedBuiltinProvider.id + ".com"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {selectedBuiltinProvider.name} Keys →
                    </a>
                  </p>
                </div>

                {/* Models Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-foreground">
                      {t("providers.models")}
                    </label>
                    <button
                      onClick={handleOpenModelDialog}
                      disabled={fetchingModels}
                      className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                    >
                      {fetchingModels ? t("providers.fetching") : t("providers.fetch")}
                    </button>
                  </div>

                  {/* Model Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      placeholder={t("providers.searchModels")}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* Selected Models List */}
                  <div className="space-y-2">
                    {filteredModels.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground mb-2">
                          {modelSearchQuery
                            ? t("providers.noModelsFound", "未找到匹配的模型")
                            : "尚未选择模型"}
                        </p>
                        {!modelSearchQuery && (
                          <p className="text-xs text-muted-foreground">
                            点击上方 <strong>Fetch</strong> 按钮选择模型
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs mb-3">
                          <span className="text-muted-foreground">
                            {modelSearchQuery
                              ? `显示 ${filteredModels.length} / ${models.length} 个模型`
                              : `已选择 ${models.length} 个模型`}
                          </span>
                        </div>
                        {filteredModels.map((model) => (
                          <div
                            key={model.id}
                            className={`flex items-center gap-3 p-3 rounded-lg ${!providerEnabled
                              ? "bg-muted/30 opacity-60"
                              : "bg-accent/50"
                              }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-foreground">
                                  {model.displayName}
                                </span>
                                {!providerEnabled && (
                                  <span className="px-1.5 py-0.5 text-xs bg-destructive/20 text-destructive rounded">
                                    Provider Disabled
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {model.modelPath}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteModel(model.id)}
                              disabled={!providerEnabled}
                              className="p-1.5 hover:bg-destructive/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="移除模型"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {t("providers.selectProvider")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Model Selection Dialog */}
      {showModelDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="w-[700px] max-h-[80vh] bg-card border border-border rounded-lg shadow-xl flex flex-col">
            {/* Dialog Header */}
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold">{t("providers.selectModels", "选择模型")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                从 {availableModels.length} 个可用模型中选择
              </p>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={dialogSearchQuery}
                  onChange={(e) => setDialogSearchQuery(e.target.value)}
                  placeholder={t("providers.searchModels")}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Models List */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="space-y-2">
                {filteredDialogModels.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {dialogSearchQuery
                      ? t("providers.noModelsFound", "未找到匹配的模型")
                      : "没有可用的模型"}
                  </p>
                ) : (
                  filteredDialogModels.map((model) => {
                    const isSelected = selectedModelsInDialog.has(model.id);
                    return (
                      <button
                        key={model.id}
                        onClick={() => handleToggleModelInDialog(model.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${isSelected
                          ? "bg-primary/10 border border-primary"
                          : "bg-accent/50 hover:bg-accent border border-transparent"
                          }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground mb-1">
                            {model.displayName}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {model.modelPath}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/30"
                            }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-primary-foreground"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                已选择 {selectedModelsInDialog.size} 个模型
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowModelDialog(false);
                    setDialogSearchQuery("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-secondary rounded hover:bg-secondary/80"
                >
                  {t("actions.cancel")}
                </button>
                <button
                  onClick={handleConfirmModelSelection}
                  disabled={selectedModelsInDialog.size === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("actions.confirm", "确认")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Connection Result Dialog */}
      {showTestResult && testResult && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="w-[500px] bg-card border border-border rounded-lg shadow-xl">
            {/* Dialog Header */}
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${testResult.success
                ? "bg-green-500/10 border-green-500/20"
                : "bg-red-500/10 border-red-500/20"
              }`}>
              {testResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  {testResult.success
                    ? t("providers.testSuccess", "连接成功")
                    : t("providers.testFailed", "连接失败")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedBuiltinProvider?.name}
                </p>
              </div>
            </div>

            {/* Dialog Content */}
            <div className="px-6 py-4">
              <div className={`p-4 rounded-lg text-sm ${testResult.success
                  ? "bg-green-500/5 border border-green-500/20 text-foreground"
                  : "bg-red-500/5 border border-red-500/20 text-foreground"
                }`}>
                <p className="whitespace-pre-wrap break-words">{testResult.message}</p>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-end">
              <button
                onClick={() => setShowTestResult(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary/90"
              >
                {t("actions.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

