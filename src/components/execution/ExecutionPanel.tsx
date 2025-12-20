import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/tauri";
import { Play, Loader2, AlertCircle, ChevronDown, Check, DollarSign, Trophy } from "lucide-react";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useEditorStore } from "../../stores/editorStore";

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
  model_id: string;        // 实际的模型 ID
  model_name: string;      // 显示名称
  provider_name: string;   // Provider 配置名称
  provider_type: string;   // Provider 类型
}

export default function ExecutionPanel({
  variables,
  promptContent,
}: ExecutionPanelProps) {
  const { t } = useTranslation();
  const { workspace } = useWorkspaceStore();
  const { currentFile } = useEditorStore();
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [globalVariableKeys, setGlobalVariableKeys] = useState<Set<string>>(new Set());
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [enabledModels, setEnabledModels] = useState<EnabledModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<Map<string, ExecutionResult>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [arenaSettings, setArenaSettings] = useState<ArenaSettings>({
    concurrent_execution: true,
    max_concurrent: 3,
    cost_warning_threshold: 0.5,
    remember_last_selection: true,
    auto_save_results: true,
    card_density: "normal",
  });

  // 加载 Arena 设置
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

  // 加载 LLM Providers 和启用的模型
  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载所有 providers（用于获取 API key 等配置）
        const providersList = await invoke<LLMProvider[]>("list_llm_providers");
        setProviders(providersList);

        // 加载所有启用的模型
        const models = await invoke<EnabledModel[]>("list_enabled_models");
        setEnabledModels(models);

        // 如果启用了"记住上次选择"，从 localStorage 恢复
        if (arenaSettings.remember_last_selection) {
          const saved = localStorage.getItem("arena_last_selected_models");
          if (saved) {
            try {
              const savedIds = JSON.parse(saved) as string[];
              // 过滤出仍然存在的模型
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

        // 否则自动选择第一个模型
        if (models.length > 0) {
          setSelectedModels(new Set([models[0].id]));
        }
      } catch (error) {
        console.error("Failed to load models:", error);
      }
    };

    loadData();
  }, [arenaSettings.remember_last_selection]);

  // 加载全局变量并自动填充
  useEffect(() => {
    const loadGlobalVariables = async () => {
      try {
        const globalVars = await invoke<GlobalVariable[]>("list_global_variables");
        const newValues: Record<string, string> = { ...variableValues };
        const globalKeys = new Set<string>();

        // 为每个在全局变量中存在的变量自动填充默认值
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

  const toggleModelSelection = (modelName: string) => {
    const newSelection = new Set(selectedModels);
    if (newSelection.has(modelName)) {
      newSelection.delete(modelName);
    } else {
      // 检查是否超过最大限制
      if (newSelection.size >= arenaSettings.max_concurrent) {
        alert(t("execution.max_models_reached"));
        return;
      }
      newSelection.add(modelName);
    }
    setSelectedModels(newSelection);

    // 保存选择（如果启用了记住功能）
    if (arenaSettings.remember_last_selection) {
      localStorage.setItem("arena_last_selected_models", JSON.stringify(Array.from(newSelection)));
    }
  };

  const handleExecute = async () => {
    if (selectedModels.size === 0) {
      setError(t("execution.no_model_selected"));
      return;
    }

    // 如果选择了多个模型，打开 Arena 窗口
    if (selectedModels.size >= 2) {
      handleOpenArena();
      return;
    }

    // 单模型执行：在当前面板显示结果
    setIsExecuting(true);
    setError(null);
    setResults(new Map());

    try {
      const newResults = new Map<string, ExecutionResult>();
      const modelArray = Array.from(selectedModels);

      if (arenaSettings.concurrent_execution) {
        // 并发执行（批量执行，受 max_concurrent 限制）
        const chunks = [];
        for (let i = 0; i < modelArray.length; i += arenaSettings.max_concurrent) {
          chunks.push(modelArray.slice(i, i + arenaSettings.max_concurrent));
        }

        for (const chunk of chunks) {
          const promises = chunk.map(async (modelId) => {
            const model = enabledModels.find(m => m.id === modelId);
            if (!model) return null;

            const provider = providers.find(p => p.name === model.provider_name);
            if (!provider) return null;

            try {
              // 获取 API Key
              let apiKey = "";
              if (provider.api_key_source === "keychain" && provider.api_key_ref) {
                apiKey = await invoke<string>("get_api_key_from_keychain", {
                  environment: provider.api_key_ref,
                });
              } else if (provider.api_key_source === "env_var" && provider.api_key_ref) {
                apiKey = provider.api_key_ref;
              } else if (provider.api_key) {
                apiKey = provider.api_key;
              }

              const modifiedPromptYaml = promptContent.replace(
                /model:\s*.*/,
                `model: ${model.model_id}`
              );

              const result = await invoke<ExecutionResult>("execute_prompt", {
                promptYaml: modifiedPromptYaml,
                variables: variableValues,
                apiKey: apiKey,
                baseUrl: provider.base_url || null,
              });

              return { modelId, result };
            } catch (err) {
              console.error(`Failed to execute with ${model.model_name}:`, err);
              return null;
            }
          });

          const chunkResults = await Promise.all(promises);
          chunkResults.forEach((item) => {
            if (item) {
              newResults.set(item.modelId, item.result);
            }
          });
        }
      } else {
        // 串行执行
        for (const modelId of modelArray) {
          const model = enabledModels.find(m => m.id === modelId);
          if (!model) continue;

          const provider = providers.find(p => p.name === model.provider_name);
          if (!provider) continue;

          try {
            // 获取 API Key
            let apiKey = "";
            if (provider.api_key_source === "keychain" && provider.api_key_ref) {
              apiKey = await invoke<string>("get_api_key_from_keychain", {
                environment: provider.api_key_ref,
              });
            } else if (provider.api_key_source === "env_var" && provider.api_key_ref) {
              apiKey = provider.api_key_ref;
            } else if (provider.api_key) {
              apiKey = provider.api_key;
            }

            const modifiedPromptYaml = promptContent.replace(
              /model:\s*.*/,
              `model: ${model.model_id}`
            );

            const result = await invoke<ExecutionResult>("execute_prompt", {
              promptYaml: modifiedPromptYaml,
              variables: variableValues,
              apiKey: apiKey,
              baseUrl: provider.base_url || null,
            });

            newResults.set(modelId, result);
          } catch (err) {
            console.error(`Failed to execute with ${model.model_name}:`, err);
            // 继续执行其他模型
          }
        }
      }

      if (newResults.size === 0) {
        throw new Error(t("execution.all_models_failed"));
      }

      setResults(newResults);

      // 自动保存结果到数据库（如果启用）
      if (arenaSettings.auto_save_results && newResults.size > 0) {
        saveArenaBattle(newResults);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsExecuting(false);
    }
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

    // 保存 Arena 上下文到 localStorage
    const arenaContext = {
      variables,
      variableValues,
      filePath: currentFile,  // 使用文件路径而不是内容
      fileName: currentFile.split('/').pop(),
      workspacePath: workspace.path,
      selectedModels: Array.from(selectedModels),
    };
    localStorage.setItem("arena_context", JSON.stringify(arenaContext));

    // 打开 Arena 窗口
    try {
      await invoke("open_arena_window");
    } catch (error) {
      console.error("Failed to open arena window:", error);
      alert("Failed to open Arena window: " + error);
    }
  };

  const saveArenaBattle = async (resultsMap: Map<string, ExecutionResult>) => {
    if (!workspace) {
      console.warn("No workspace available, skipping arena battle save");
      return;
    }

    try {
      const modelsArray = Array.from(resultsMap.keys());
      const outputsArray = Array.from(resultsMap.entries()).map(([modelId, result]) => {
        const model = enabledModels.find(m => m.id === modelId);
        return {
          model_id: modelId,  // 原始 ID（用于内部引用）
          provider_name: model?.provider_name || result.metadata.provider,  // Provider 显示名称
          model_name: model?.model_name || result.metadata.model,  // 模型显示名称
          provider_type: model?.provider_type || result.metadata.provider,  // Provider 类型
          output: result.output,
          metadata: result.metadata,
        };
      });

      await invoke("save_arena_battle", {
        workspacePath: workspace.path,
        promptFileId: null,  // TODO: 从当前文件上下文获取
        promptContent: promptContent,
        inputVariables: JSON.stringify(variableValues),
        models: JSON.stringify(modelsArray),
        outputs: JSON.stringify(outputsArray),
      });

      console.log("Arena battle saved successfully");
    } catch (error) {
      console.error("Failed to save arena battle:", error);
      // Don't show error to user, this is a background operation
    }
  };

  const canExecute =
    variables.every((v) => variableValues[v]) &&
    selectedModels.size > 0;

  const isArenaMode = selectedModels.size >= 1;

  return (
    <div className="h-full flex flex-col">
      {/* Variables Input */}
      <div className="p-4 space-y-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{t("execution.variables")}</h3>

        {variables.map((variable) => {
          const isGlobalVariable = globalVariableKeys.has(variable);
          return (
            <div key={variable} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <span>{variable}</span>
                {isGlobalVariable && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    {t("execution.global")}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={variableValues[variable] || ""}
                onChange={(e) =>
                  setVariableValues({
                    ...variableValues,
                    [variable]: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t("execution.enter_variable", { variable })}
              />
            </div>
          );
        })}

        {/* Model Selector (Multi-select) */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            {t("execution.select_model")}
          </label>
          <div className="relative">
            <button
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="w-full flex items-center justify-between px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-sm"
              disabled={enabledModels.length === 0}
            >
              <span>
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
                              {model.provider_type}
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
        </div>

        {/* Selected Models Info */}
        {selectedModels.size > 0 && (
          <div className="p-3 bg-secondary/50 rounded-md space-y-2">
            <div className="text-xs text-muted-foreground">
              {isArenaMode
                ? t("execution.arena_mode_hint")
                : t("execution.single_model_hint")}
            </div>
            <div className="flex flex-wrap gap-1.5">
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
          </div>
        )}

        {enabledModels.length === 0 && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="text-xs text-yellow-600 dark:text-yellow-400">
              <p className="font-medium">{t("execution.no_models_enabled")}</p>
              <p className="mt-1">
                {t("execution.no_models_enabled_desc")}
              </p>
            </div>
          </div>
        )}

        {/* Run Button */}
        <button
          onClick={handleExecute}
          disabled={!canExecute || isExecuting}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isArenaMode
            ? "bg-yellow-600 text-white hover:bg-yellow-700"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("execution.executing")}
            </>
          ) : (
            <>
              {isArenaMode ? <Trophy className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isArenaMode ? t("arena.title") : t("actions.run")}
            </>
          )}
        </button>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
            <p className="text-sm text-destructive font-medium">{t("execution.error")}</p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
          </div>
        )}

        {results.size > 0 && (
          <div className="space-y-4">
            {isArenaMode ? (
              /* Arena Mode: Side by Side Comparison */
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">
                  {t("execution.arena_results")} ({results.size} {t("execution.models")})
                </h4>
                <div className={`grid gap-4 ${results.size === 2 ? "grid-cols-2" :
                  results.size === 3 ? "grid-cols-3" :
                    "grid-cols-2 md:grid-cols-3"
                  }`}>
                  {Array.from(results.entries()).map(([modelId, result]) => {
                    const model = enabledModels.find(m => m.id === modelId);
                    return (
                      <div key={modelId} className="border border-border rounded-lg p-4 space-y-3">
                        {/* Model Header */}
                        <div className="pb-2 border-b border-border">
                          <h5 className="font-semibold text-sm">{model?.model_name}</h5>
                          <p className="text-xs text-muted-foreground">{model?.provider_type}</p>
                        </div>

                        {/* Output */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {t("execution.output")}
                          </p>
                          <div className="p-2 bg-secondary/50 rounded text-xs max-h-40 overflow-auto">
                            <p className="whitespace-pre-wrap">{result.output}</p>
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          <div className="p-1.5 bg-secondary/30 rounded">
                            <span className="text-muted-foreground">{t("execution.latency")}:</span>
                            <span className="ml-1 font-medium">{result.metadata.latency_ms}ms</span>
                          </div>
                          <div className="p-1.5 bg-secondary/30 rounded">
                            <span className="text-muted-foreground">{t("execution.cost")}:</span>
                            <span className="ml-1 font-medium">${result.metadata.cost_usd.toFixed(4)}</span>
                          </div>
                          <div className="col-span-2 p-1.5 bg-secondary/30 rounded">
                            <span className="text-muted-foreground">{t("execution.tokens")}:</span>
                            <span className="ml-1 font-medium">
                              {result.metadata.tokens_input} / {result.metadata.tokens_output}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Single Model Mode */
              Array.from(results.entries()).map(([modelName, result]) => (
                <div key={modelName} className="space-y-4">
                  {/* Output */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      {t("execution.output")}
                    </h4>
                    <div className="p-3 bg-secondary rounded-md">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {result.output}
                      </p>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      {t("execution.metadata")}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-secondary rounded">
                        <span className="text-muted-foreground">{t("execution.model")}:</span>
                        <span className="ml-1 text-foreground font-medium">
                          {result.metadata.model}
                        </span>
                      </div>
                      <div className="p-2 bg-secondary rounded">
                        <span className="text-muted-foreground">{t("execution.latency")}:</span>
                        <span className="ml-1 text-foreground font-medium">
                          {result.metadata.latency_ms}ms
                        </span>
                      </div>
                      <div className="p-2 bg-secondary rounded">
                        <span className="text-muted-foreground">{t("execution.tokens")}:</span>
                        <span className="ml-1 text-foreground font-medium">
                          {result.metadata.tokens_input} / {result.metadata.tokens_output}
                        </span>
                      </div>
                      <div className="p-2 bg-secondary rounded">
                        <span className="text-muted-foreground">{t("execution.cost")}:</span>
                        <span className="ml-1 text-foreground font-medium">
                          ${result.metadata.cost_usd.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {results.size === 0 && !error && !isExecuting && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground text-center">
              {variables.length > 0
                ? t("execution.fill_variables_hint")
                : t("execution.click_run_hint")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
