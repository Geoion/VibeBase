import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, AlertCircle, ChevronDown, Check, Trophy } from "lucide-react";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useEditorStore } from "../../stores/editorStore";
import TagInput from "../ui/TagInput";

interface ArenaSettings {
  concurrent_execution: boolean;
  max_concurrent: number;
  cost_warning_threshold: number;
  remember_last_selection: boolean;
  auto_save_results: boolean;
  card_density: string;
}

interface ExecutionPanelProps {
  variables: string[];
  promptContent: string;
  filePath: string;
}

interface ExecutionResult {
  id: string;
  output: string;
  metadata: {
    model: string;
    provider: string;
    latency_ms: number;
    tokens_input: number;
    tokens_output: number;
    cost_usd: number;
    timestamp: number;
  };
}

interface GlobalVariable {
  id: string;
  key: string;
  value: string;
}

interface LLMProvider {
  id: string;
  name: string;
  provider: string;
  model: string;
  base_url?: string;
  api_key?: string;
  api_key_source: string;
  api_key_ref?: string;
  parameters?: string;
  enabled: boolean;
  enabled_models?: string;
  is_default: boolean;
}

interface EnabledModel {
  id: string;              // provider_name::model_id
  model_id: string;        // Actual model ID
  model_name: string;      // Display name
  provider_name: string;   // Provider configuration name
  provider_type: string;   // Provider type
}

export default function ExecutionPanel({
  variables,
  promptContent: _promptContent,
  filePath,
}: ExecutionPanelProps) {
  const { t } = useTranslation();
  const { workspace } = useWorkspaceStore();
  const { currentFile } = useEditorStore();
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [globalVariableKeys, setGlobalVariableKeys] = useState<Set<string>>(new Set());
  const [_providers, setProviders] = useState<LLMProvider[]>([]);
  const [enabledModels, setEnabledModels] = useState<EnabledModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isExecuting, _setIsExecuting] = useState(false);
  const [_results, _setResults] = useState<Map<string, ExecutionResult>>(new Map());
  const [_error, setError] = useState<string | null>(null);

  // Tags state
  const [tags, setTags] = useState<string[]>([]);
  const [arenaSettings, setArenaSettings] = useState<ArenaSettings>({
    concurrent_execution: true,
    max_concurrent: 3,
    cost_warning_threshold: 0.5,
    remember_last_selection: true,
    auto_save_results: true,
    card_density: "normal",
  });

  // Load Arena settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await invoke<ArenaSettings>("get_arena_settings");
        setArenaSettings(settings);
      } catch (error) {
        console.error("Failed to load arena settings:", error);
      }
    };
    loadSettings();
  }, []);

  // Load LLM Providers and enabled models
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load all providers (for getting API key and other configurations)
        const providersList = await invoke<LLMProvider[]>("list_llm_providers");
        setProviders(providersList);

        // Load all enabled models
        const models = await invoke<EnabledModel[]>("list_enabled_models");
        setEnabledModels(models);

        // If "remember last selection" is enabled, restore from localStorage
        if (arenaSettings.remember_last_selection) {
          const saved = localStorage.getItem("arena_last_selected_models");
          if (saved) {
            try {
              const savedIds = JSON.parse(saved) as string[];
              // Filter out models that still exist
              const validIds = savedIds.filter(id => models.some(m => m.id === id));
              if (validIds.length > 0) {
                setSelectedModels(new Set(validIds));
                return;
              }
            } catch (e) {
              console.error("Failed to restore last selection:", e);
            }
          }
        }

        // Otherwise auto-select the first model
        if (models.length > 0) {
          setSelectedModels(new Set([models[0].id]));
        }
      } catch (error) {
        console.error("Failed to load models:", error);
      }
    };

    loadData();
  }, [arenaSettings.remember_last_selection]);

  // Load global variables and auto-fill
  useEffect(() => {
    const loadGlobalVariables = async () => {
      try {
        const globalVars = await invoke<GlobalVariable[]>("list_global_variables");
        const newValues: Record<string, string> = { ...variableValues };
        const globalKeys = new Set<string>();

        // Auto-fill default values for each variable that exists in global variables
        variables.forEach((varName) => {
          const globalVar = globalVars.find((v) => v.key === varName);
          if (globalVar) {
            globalKeys.add(varName);
            if (!variableValues[varName]) {
              newValues[varName] = globalVar.value;
            }
          }
        });

        setGlobalVariableKeys(globalKeys);
        setVariableValues(newValues);
      } catch (error) {
        console.error("Failed to load global variables:", error);
      }
    };

    if (variables.length > 0) {
      loadGlobalVariables();
    }
  }, [variables]);

  // Load tags when file changes
  useEffect(() => {
    if (filePath && workspace) {
      loadTags();
    }
  }, [filePath, workspace]);

  const loadTags = async () => {
    if (!workspace || !filePath) return;

    try {
      const metadataResult = await invoke<any>("get_prompt_metadata", {
        workspacePath: workspace.path,
        filePath: filePath,
      });

      if (metadataResult && metadataResult.tags) {
        const parsedTags = JSON.parse(metadataResult.tags);
        setTags(parsedTags);
      } else {
        setTags([]);
      }
    } catch (error) {
      console.error("Failed to load tags:", error);
      setTags([]);
    }
  };

  const handleTagsChange = async (newTags: string[]) => {
    setTags(newTags);
    
    if (!workspace || !filePath) return;

    try {
      await invoke("save_prompt_metadata", {
        workspacePath: workspace.path,
        metadata: {
          file_path: filePath,
          provider_ref: "default",
          tags: JSON.stringify(newTags),
        },
      });
    } catch (error) {
      console.error("Failed to save tags:", error);
    }
  };

  const toggleModelSelection = (modelName: string) => {
    const newSelection = new Set(selectedModels);
    if (newSelection.has(modelName)) {
      newSelection.delete(modelName);
    } else {
      // Check if exceeds maximum limit
      if (newSelection.size >= arenaSettings.max_concurrent) {
        alert(t("execution.max_models_reached"));
        return;
      }
      newSelection.add(modelName);
    }
    setSelectedModels(newSelection);

    // Save selection (if remember feature is enabled)
    if (arenaSettings.remember_last_selection) {
      localStorage.setItem("arena_last_selected_models", JSON.stringify(Array.from(newSelection)));
    }
  };

  const handleExecute = async () => {
    if (selectedModels.size === 0) {
      setError(t("execution.no_model_selected"));
      return;
    }

    // All executions go through Arena window
    handleOpenArena();
  };

  const handleOpenArena = async () => {
    if (!workspace) {
      alert("No workspace available");
      return;
    }

    if (!currentFile) {
      alert("No file selected");
      return;
    }

    // Save Arena context to localStorage
    const arenaContext = {
      variables,
      variableValues,
      filePath: currentFile,
      fileName: currentFile.split('/').pop(),
      workspacePath: workspace.path,
      selectedModels: Array.from(selectedModels),
    };
    localStorage.setItem("arena_context", JSON.stringify(arenaContext));

    // Open Arena window
    try {
      await invoke("open_arena_window");
    } catch (error) {
      console.error("Failed to open arena window:", error);
      alert("Failed to open Arena window: " + error);
    }
  };

  const handleVariableChange = (variable: string, value: string) => {
    setVariableValues((prev) => ({
      ...prev,
      [variable]: value,
    }));
  };

  const canExecute =
    variables.every((v) => variableValues[v]) &&
    selectedModels.size > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Tags Section */}
        <TagInput
          workspacePath={workspace?.path}
          tags={tags}
          onTagsChange={handleTagsChange}
        />

        {/* Variables Section */}
        {variables.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">{t("execution.variables")}</h3>
            <div className="space-y-2">
              {variables.map((variable) => {
                const isGlobalVariable = globalVariableKeys.has(variable);
                return (
                  <div key={variable}>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      {variable}
                      {isGlobalVariable && (
                        <span className="text-xs px-1 py-0.5 bg-primary/10 text-primary rounded">
                          {t("execution.global")}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={variableValues[variable] || ""}
                      onChange={(e) => handleVariableChange(variable, e.target.value)}
                      placeholder={t("execution.enter_variable", { variable })}
                      className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Model Selection Section */}
        <div>
          <h3 className="text-sm font-semibold mb-2">{t("execution.model")}</h3>
          <div className="relative">
            <button
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm bg-background border border-input rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={enabledModels.length === 0}
            >
              <span className="truncate">
                {selectedModels.size === 0
                  ? t("execution.select_model")
                  : selectedModels.size === 1
                    ? enabledModels.find(m => m.id === Array.from(selectedModels)[0])?.model_name
                    : t("execution.models_selected", { count: selectedModels.size })}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showModelMenu && enabledModels.length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowModelMenu(false)}
                />
                <div className="absolute left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-20 max-h-60 overflow-auto">
                  <div className="p-2 space-y-1">
                    <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
                      {t("execution.models_count", {
                        current: selectedModels.size,
                        max: arenaSettings.max_concurrent
                      })}
                    </div>
                    {enabledModels.map((model) => {
                      const isSelected = selectedModels.has(model.id);
                      const isDisabled = !isSelected && selectedModels.size >= arenaSettings.max_concurrent;
                      return (
                        <button
                          key={model.id}
                          onClick={() => !isDisabled && toggleModelSelection(model.id)}
                          disabled={isDisabled}
                          className={`w-full px-3 py-2 text-left rounded-md transition-colors flex items-start gap-2 ${isDisabled
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-accent cursor-pointer"
                            }`}
                        >
                          <div className={`w-4 h-4 mt-0.5 flex-shrink-0 rounded border ${isSelected
                            ? "bg-primary border-primary"
                            : "border-input"
                            } flex items-center justify-center`}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">
                              {model.model_name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {model.provider_name}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Selected Models Display */}
          {selectedModels.size > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Array.from(selectedModels).map(modelId => {
                const model = enabledModels.find(m => m.id === modelId);
                return model ? (
                  <div key={modelId} className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                    <span>{model.model_name}</span>
                    <span className="text-primary/60">({model.provider_type})</span>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {/* Warning when no models enabled */}
          {enabledModels.length === 0 && (
            <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                <p className="font-medium">{t("execution.no_models_enabled")}</p>
                <p className="mt-1">{t("execution.no_models_enabled_desc")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Arena Button at Bottom */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-card">
        <button
          onClick={handleExecute}
          disabled={!canExecute || isExecuting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-yellow-600 text-white hover:bg-yellow-700"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("execution.executing")}
            </>
          ) : (
            <>
              <Trophy className="w-4 h-4" />
              {t("arena.title")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
