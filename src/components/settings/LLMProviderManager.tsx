import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useTranslation } from "react-i18next";
import { Search, Eye, EyeOff, Zap, Trash2, CheckCircle, XCircle, Loader2, Plus, Edit2 } from "lucide-react";
import CustomProviderDialog, { CustomProviderData } from "../dialogs/CustomProviderDialog";

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
  { id: "deepseek", name: "DeepSeek", description: "DeepSeek AI models" },
  { id: "ollama", name: "Ollama", description: "Run LLMs locally with Ollama" },
  { id: "aihubmix", name: "AiHubMix", description: "AI Hub Mix unified API" },
  { id: "google", name: "Google Gemini", description: "Google's Gemini AI models" },
  { id: "azure", name: "Azure OpenAI", description: "Microsoft Azure OpenAI Service" },
  { id: "github", name: "GitHub Copilot", description: "GitHub Copilot models" },
];

interface LLMProviderManagerProps {
  onSaveStatusChange?: (status: "saving" | "saved") => void;
}

export default function LLMProviderManager({ onSaveStatusChange }: LLMProviderManagerProps) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Selected provider details
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [providerEnabled, setProviderEnabled] = useState(false);
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [_savedEnabledModels, setSavedEnabledModels] = useState<string[]>([]);
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

  // Custom provider dialog
  const [showCustomProviderDialog, setShowCustomProviderDialog] = useState(false);
  const [editingCustomProvider, setEditingCustomProvider] = useState<CustomProviderData | null>(null);
  const [customProviders, setCustomProviders] = useState<Array<{ id: string; name: string; description: string }>>([]);

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
      onSaveStatusChange?.("saving");
      await handleSaveInternal();
      onSaveStatusChange?.("saved");
    }, 1000); // Auto-save 1 second after last change

    return () => clearTimeout(autoSaveTimer);
  }, [saved, apiKey, providerEnabled, models]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await invoke<LLMProvider[]>("list_llm_providers");
      setProviders(data);

      // Extract custom Providers (provider type is 'custom')
      const custom = data
        .filter(p => p.provider === 'custom')
        .map(p => ({
          id: p.name,  // Use name as unique ID for custom providers
          name: p.name,
          description: `Custom Provider - ${p.base_url || 'OpenAI Compatible API'}`,
        }));
      setCustomProviders(custom);

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
      const existingConfig = providersList.find(p => p.name === providerName);

      if (existingConfig) {
        // Load the full provider details to get the actual API key
        try {
          const fullProvider = await invoke<LLMProvider>("get_llm_provider", {
            providerName: existingConfig.name,
          });

          console.log("[loadProviderDetailsWithData] fullProvider:", fullProvider);

          setApiKey(fullProvider.api_key || "");
          setBaseUrl(fullProvider.base_url || "");
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
          setBaseUrl("");
          setProviderEnabled(false);
          setSavedEnabledModels([]);
          setModels([]);
        }
      } else {
        console.log("[loadProviderDetailsWithData] No existing config for provider:", providerName);
        // No config yet for this provider - default to disabled
        setApiKey("");
        setBaseUrl("");
        setProviderEnabled(false);
        setSavedEnabledModels([]);
        setModels([]);
      }
    } catch (error) {
      console.error("Failed to load provider details:", error);
    }
  };

  const handleProviderSelect = (providerName: string) => {
    setSelectedProvider(providerName);
    loadProviderDetailsWithData(providerName, providers);
  };


  const handleOpenModelDialog = async () => {
    console.log("[handleOpenModelDialog] Called!");
    console.log("[handleOpenModelDialog] selectedProvider:", selectedProvider);
    console.log("[handleOpenModelDialog] apiKey length:", apiKey?.length);

    // Ollama doesn't require API key
    if (!selectedProvider || (!apiKey && selectedProvider !== "ollama")) {
      alert("Please enter an API Key first");
      return;
    }

    setFetchingModels(true);
    try {
      const selectedBuiltin = BUILTIN_PROVIDERS.find(p => p.id === selectedProvider);
      const selectedCustom = customProviders.find(p => p.name === selectedProvider);

      console.log("[handleOpenModelDialog] selectedBuiltin:", selectedBuiltin);
      console.log("[handleOpenModelDialog] selectedCustom:", selectedCustom);
      console.log("[handleOpenModelDialog] selectedProviderConfig:", selectedProviderConfig);
      console.log("[handleOpenModelDialog] customProviders:", customProviders);
      console.log("[handleOpenModelDialog] providers:", providers);

      // For custom Provider, use custom type for fetching
      const providerType = selectedBuiltin ? selectedBuiltin.id : "custom";
      const fetchBaseUrl = selectedCustom ? selectedProviderConfig?.base_url :
        selectedProvider === "ollama" ? (baseUrl || undefined) :
          undefined;

      console.log("[handleOpenModelDialog] Final params:", {
        provider: providerType,
        apiKeyLength: apiKey.length,
        baseUrl: fetchBaseUrl,
      });

      if (!fetchBaseUrl && selectedCustom) {
        console.error("[handleOpenModelDialog] Custom provider but no base_url!");
        alert("Custom provider missing base URL");
        setFetchingModels(false);
        return;
      }

      const modelsList = await invoke<Array<{ id: string, name: string, description?: string }>>("fetch_provider_models", {
        provider: providerType,
        apiKey: apiKey || "",
        baseUrl: fetchBaseUrl,
      });

      console.log("[handleOpenModelDialog] Fetched models:", modelsList);

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
      const selectedCustom = customProviders.find(p => p.name === selectedProvider);

      // If neither builtin nor custom, return
      if (!selectedBuiltin && !selectedCustom) return;

      // Check if provider already exists
      // Both builtin and custom: match by exact name
      const existingProvider = providers.find(p => p.name === selectedProvider);

      // Get list of enabled model IDs
      const enabledModelIds = models.filter(m => m.enabled).map(m => m.id);

      console.log("[handleSaveInternal] Saving models:", enabledModelIds);

      const input = {
        name: existingProvider?.name || (selectedBuiltin ? selectedBuiltin.id : selectedProvider),
        provider: selectedBuiltin ? selectedBuiltin.id : "custom",  // Custom providers use custom type
        model: models.find(m => m.enabled)?.name || "",
        base_url: (selectedCustom || selectedProvider === "ollama") ? (baseUrl || undefined) : undefined,
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

  const handleTestConnection = async () => {
    // Ollama doesn't require API key
    if (!selectedProvider || (!apiKey && selectedProvider !== "ollama")) {
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
      const selectedCustom = customProviders.find(p => p.name === selectedProvider);

      console.log("[handleTestConnection] selectedProvider:", selectedProvider);
      console.log("[handleTestConnection] selectedBuiltin:", selectedBuiltin);
      console.log("[handleTestConnection] selectedCustom:", selectedCustom);
      console.log("[handleTestConnection] selectedProviderConfig:", selectedProviderConfig);

      // For custom Provider, use custom type for testing
      const providerType = selectedBuiltin ? selectedBuiltin.id : "custom";
      const testBaseUrl = selectedCustom ? selectedProviderConfig?.base_url :
        selectedProvider === "ollama" ? (baseUrl || undefined) :
          undefined;

      console.log("[handleTestConnection] Testing with:", {
        provider: providerType,
        apiKeyLength: apiKey.length,
        baseUrl: testBaseUrl,
      });

      const result = await invoke<string>("test_provider_connection", {
        provider: providerType,
        apiKey: apiKey || "",
        baseUrl: testBaseUrl,
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

  const handleAddOrUpdateCustomProvider = async (providerData: CustomProviderData) => {
    try {
      const isEditing = !!editingCustomProvider;

      console.log("[handleAddOrUpdateCustomProvider] isEditing:", isEditing);
      console.log("[handleAddOrUpdateCustomProvider] providerData:", providerData);
      console.log("[handleAddOrUpdateCustomProvider] editingCustomProvider:", editingCustomProvider);

      const input = {
        name: providerData.name,
        provider: "custom",  // Custom providers use dedicated "custom" type
        model: "",  // Default empty, user can add later
        base_url: providerData.baseUrl,
        api_key: apiKey || "",  // Preserve existing API key
        api_key_source: "direct",
        enabled: providerEnabled,
        enabled_models: JSON.stringify(models.filter(m => m.enabled).map(m => m.id)),
        is_default: false,  // Mark as custom provider
      };

      console.log("[handleAddOrUpdateCustomProvider] input:", input);

      if (isEditing) {
        // Update existing custom provider
        const existingProvider = providers.find(p => p.name === editingCustomProvider.name);
        console.log("[handleAddOrUpdateCustomProvider] existingProvider:", existingProvider);

        if (existingProvider) {
          // Check if name changed
          const nameChanged = providerData.name !== editingCustomProvider.name;

          if (nameChanged) {
            // Name changed: delete old and create new
            console.log("[handleAddOrUpdateCustomProvider] Name changed, deleting old and creating new");
            await invoke("delete_llm_provider", {
              providerName: existingProvider.name,
            });
            await invoke("save_llm_provider", { input });
          } else {
            // Name unchanged: update in place
            console.log("[handleAddOrUpdateCustomProvider] Calling update_llm_provider with:", {
              providerName: existingProvider.name,
              input,
            });

            await invoke("update_llm_provider", {
              providerName: existingProvider.name,
              input,
            });
          }

          console.log("[handleAddOrUpdateCustomProvider] Update successful");
        } else {
          console.error("[handleAddOrUpdateCustomProvider] Existing provider not found!");
        }
      } else {
        // Create new custom provider
        console.log("[handleAddOrUpdateCustomProvider] Creating new custom provider");
        await invoke("save_llm_provider", { input });
        console.log("[handleAddOrUpdateCustomProvider] Create successful");
      }

      // Reload Provider list and select the provider
      await loadProviders();
      setSelectedProvider(providerData.name);
      setEditingCustomProvider(null);
    } catch (error) {
      console.error("[handleAddOrUpdateCustomProvider] Failed to save custom provider:", error);
      alert(`Failed to save custom provider: ${error}`);
    }
  };

  const handleEditCustomProvider = () => {
    if (!selectedCustomProvider || !selectedProviderConfig) return;

    setEditingCustomProvider({
      name: selectedProviderConfig.name,
      baseUrl: selectedProviderConfig.base_url || "",
      description: "",
    });
    setShowCustomProviderDialog(true);
  };

  const handleToggleProviderEnabled = () => {
    setProviderEnabled(prev => !prev);
    setSaved(false);
  };

  const filteredBuiltinProviders = BUILTIN_PROVIDERS.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomProviders = customProviders.filter((p) =>
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

  const selectedCustomProvider = customProviders.find(
    (p) => p.id === selectedProvider
  );

  // Find the actual provider configuration by name
  const selectedProviderConfig = providers.find(p => p.name === selectedProvider);

  const isProviderConfigured = selectedProviderConfig?.api_key_status === "configured";

  const isCustomProvider = !selectedBuiltinProvider && selectedCustomProvider;

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
              onClick={() => setShowCustomProviderDialog(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              {t("providers.addCustomProvider")}
            </button>
          </div>

          {/* Provider List */}
          <div className="flex-1 overflow-auto p-3 space-y-1">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">{t("providers.loading")}</p>
              </div>
            ) : (
              <>
                {/* Custom Providers */}
                {filteredCustomProviders.map((provider) => {
                  const providerConfig = providers.find(p => p.name === provider.name);
                  const isConfigured = providerConfig?.api_key_status === "configured";
                  return (
                    <button
                      key={`custom-${provider.id}`}
                      onClick={() => handleProviderSelect(provider.name)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${selectedProvider === provider.name
                        ? "bg-primary/10 border border-primary"
                        : "hover:bg-accent border border-transparent"
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {provider.name}
                        </div>
                        <div className="text-xs text-muted-foreground">{t("providers.custom")}</div>
                      </div>
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${isConfigured ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                      />
                    </button>
                  );
                })}

                {/* Separator */}
                {filteredCustomProviders.length > 0 && filteredBuiltinProviders.length > 0 && (
                  <div className="my-2 border-t border-border" />
                )}

                {/* Built-in Providers */}
                {filteredBuiltinProviders.length === 0 && filteredCustomProviders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">{t("providers.noProvidersFound")}</p>
                  </div>
                ) : (
                  filteredBuiltinProviders.map((provider) => {
                    const isConfigured = providers.some(
                      p => p.name === provider.id && p.api_key_status === "configured"
                    );

                    return (
                      <button
                        key={`builtin-${provider.id}`}
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
              </>
            )}
          </div>
        </div>

        {/* Right Column - Provider Details */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedBuiltinProvider || isCustomProvider ? (
            <>
              {/* Provider Header */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground">
                        {isCustomProvider ? selectedCustomProvider?.name : selectedBuiltinProvider?.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {isCustomProvider ? selectedCustomProvider?.description : selectedBuiltinProvider?.description}
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
                    {isCustomProvider && (
                      <button
                        onClick={handleEditCustomProvider}
                        className="p-2 hover:bg-accent rounded-md transition-colors"
                        title={t("providers.editCustomProvider", "编辑自定义提供商")}
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </button>
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
                {/* API Key Section - Hide for Ollama */}
                {selectedProvider !== "ollama" && (
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
                    {!isCustomProvider && selectedBuiltinProvider && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Get your API key from{" "}
                        <a
                          href={`https://${selectedBuiltinProvider?.id === "openrouter" ? "openrouter.ai" : (selectedBuiltinProvider?.id || "example") + ".com"}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {selectedBuiltinProvider?.name} Keys →
                        </a>
                      </p>
                    )}
                  </div>
                )}

                {/* Ollama Configuration */}
                {selectedProvider === "ollama" && (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-sm text-foreground">
                        {t("providers.ollamaInfo", "Ollama 是本地 LLM 服务，不需要 API Key。请确保 Ollama 正在运行。")}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {t("providers.baseUrl", "Base URL")}
                      </label>
                      <input
                        type="text"
                        value={baseUrl || "http://localhost:11434"}
                        onChange={(e) => {
                          setBaseUrl(e.target.value);
                          setSaved(false);
                        }}
                        placeholder="http://localhost:11434"
                        className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {t("providers.ollamaBaseUrlDesc", "Ollama 服务地址，支持局域网地址（如 http://192.168.1.100:11434）")}
                      </p>
                    </div>
                  </div>
                )}

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
      {
        showModelDialog && (
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
        )
      }

      {/* Test Connection Result Dialog */}
      {
        showTestResult && testResult && (
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
                    {isCustomProvider ? selectedCustomProvider?.name : selectedBuiltinProvider?.name}
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
        )
      }

      {/* Custom Provider Dialog */}
      <CustomProviderDialog
        isOpen={showCustomProviderDialog}
        onClose={() => {
          setShowCustomProviderDialog(false);
          setEditingCustomProvider(null);
        }}
        onConfirm={handleAddOrUpdateCustomProvider}
        existingProviders={providers.map(p => p.name)}
        builtinProviderIds={BUILTIN_PROVIDERS.map(p => p.id)}
        builtinProviderNames={BUILTIN_PROVIDERS.map(p => p.name)}
        editingProvider={editingCustomProvider}
      />
    </div >
  );
}

