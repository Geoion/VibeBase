import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/tauri";
import { Play, Loader2, Check, Trophy, X } from "lucide-react";
import PromptPreview from "./PromptPreview";
import VoteCard from "./VoteCard";
import { appWindow } from "@tauri-apps/api/window";

interface ArenaWindowProps {
  onClose: () => void;
  isStandaloneWindow?: boolean;
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

interface EnabledModel {
  id: string;
  model_id: string;
  model_name: string;
  provider_name: string;
  provider_type: string;
}

interface LLMProvider {
  id: string;
  name: string;
  provider: string;
  model: string;
  api_key?: string;
  api_key_source: string;
  api_key_ref?: string;
  base_url?: string;
}

interface ArenaSettings {
  concurrent_execution: boolean;
  max_concurrent: number;
  cost_warning_threshold: number;
  remember_last_selection: boolean;
  auto_save_results: boolean;
  card_density: string;
}

export default function ArenaWindow({ onClose, isStandaloneWindow = false }: ArenaWindowProps) {
  const { t } = useTranslation();

  // Read passed data from localStorage
  const [variables, setVariables] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [filePath, setFilePath] = useState<string>("");
  const [promptContent, setPromptContent] = useState("");
  const [fileName, setFileName] = useState<string>();
  const [workspacePath, setWorkspacePath] = useState<string>();

  // Arena state
  const [enabledModels, setEnabledModels] = useState<EnabledModel[]>([]);
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [arenaSettings, setArenaSettings] = useState<ArenaSettings>({
    concurrent_execution: true,
    max_concurrent: 3,
    cost_warning_threshold: 0.5,
    remember_last_selection: true,
    auto_save_results: true,
    card_density: "normal",
  });

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<Map<string, ExecutionResult>>(new Map());
  const [streamingOutputs, setStreamingOutputs] = useState<Map<string, string>>(new Map());
  const [loadingModels, setLoadingModels] = useState<Set<string>>(new Set());
  const [modelErrors, setModelErrors] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Voting state
  const [votes, setVotes] = useState<Set<string>>(new Set());
  const [winnerModel, setWinnerModel] = useState<string | null>(null);
  const [battleId, setBattleId] = useState<string | null>(null);

  useEffect(() => {
    loadArenaData();
  }, []);

  const loadArenaData = async () => {
    try {
      // Read Arena context from localStorage
      const arenaContext = localStorage.getItem("arena_context");
      if (arenaContext) {
        const context = JSON.parse(arenaContext);
        setVariables(context.variables || []);
        setVariableValues(context.variableValues || {});
        setFilePath(context.filePath || "");
        setFileName(context.fileName);
        setWorkspacePath(context.workspacePath);
        setSelectedModels(new Set(context.selectedModels || []));

        // Read file content for preview
        if (context.filePath) {
          try {
            const content = await invoke<string>("read_prompt", {
              filePath: context.filePath,
            });
            setPromptContent(content);
          } catch (err) {
            console.error("Failed to read prompt file:", err);
          }
        }
      }

      // 加载 Arena 设置
      const settings = await invoke<ArenaSettings>("get_arena_settings");
      setArenaSettings(settings);

      // 加载模型和 providers
      const modelsList = await invoke<EnabledModel[]>("list_enabled_models");
      setEnabledModels(modelsList);

      const providersList = await invoke<LLMProvider[]>("list_llm_providers");
      setProviders(providersList);
    } catch (error) {
      console.error("Failed to load arena data:", error);
    }
  };

  const handleMinimize = async () => {
    try {
      await appWindow.minimize();
    } catch (error) {
      console.error("Failed to minimize:", error);
    }
  };

  const handleMaximize = async () => {
    try {
      await appWindow.toggleMaximize();
    } catch (error) {
      console.error("Failed to maximize:", error);
    }
  };

  const toggleModelSelection = (modelId: string) => {
    const newSelection = new Set(selectedModels);
    if (newSelection.has(modelId)) {
      newSelection.delete(modelId);
    } else {
      if (newSelection.size >= arenaSettings.max_concurrent) {
        alert(t("execution.max_models_reached"));
        return;
      }
      newSelection.add(modelId);
    }
    setSelectedModels(newSelection);
  };

  const handleExecute = async () => {
    if (selectedModels.size === 0) {
      setError(t("execution.no_model_selected"));
      return;
    }

    setIsExecuting(true);
    setError(null);
    setResults(new Map());
    setStreamingOutputs(new Map());
    setModelErrors(new Map());
    setVotes(new Set());
    setWinnerModel(null);
    setBattleId(null);

    // 立即显示所有选中模型的加载状态
    const modelArray = Array.from(selectedModels);
    setLoadingModels(new Set(modelArray));

    try {
      const newResults = new Map<string, ExecutionResult>();

      if (arenaSettings.concurrent_execution) {
        // 并发执行
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
              console.log(`[Arena] Executing model: ${model.model_name}`);

              // 获取完整的 provider 信息（包含真实 API key）
              const fullProvider = await invoke<LLMProvider>("get_llm_provider", {
                providerName: model.provider_name,
              });

              console.log(`[Arena] Full provider loaded`);

              // 根据 api_key_source 获取 API key
              let apiKey = "";
              if (fullProvider.api_key_source === "keychain" && fullProvider.api_key_ref) {
                console.log(`[Arena] Getting API key from keychain: ${fullProvider.api_key_ref}`);
                apiKey = await invoke<string>("get_api_key_from_keychain", {
                  environment: fullProvider.api_key_ref,
                });
              } else if (fullProvider.api_key_source === "direct" && fullProvider.api_key) {
                console.log(`[Arena] Using direct API key from full provider`);
                apiKey = fullProvider.api_key;
              }

              console.log(`[Arena] Final API key length: ${apiKey.length}`);

              // 加载 runtime 并替换模型
              const runtime = await invoke("load_prompt_runtime", {
                filePath: filePath,
              });

              console.log(`[Arena] Runtime loaded, original provider: ${runtime.config.provider}`);

              // 修改 model 和 provider
              runtime.config.model = model.model_id;

              // 根据 provider 类型设置正确的枚举值
              if (fullProvider.provider === "openrouter") {
                runtime.config.provider = "openrouter";
              }

              console.log(`[Arena] Final config:`, JSON.stringify(runtime.config));

              // 确定正确的 base_url
              let baseUrl = fullProvider.base_url || null;
              if (!baseUrl && fullProvider.provider === "openrouter") {
                baseUrl = "https://openrouter.ai/api/v1";
              }

              console.log(`[Arena] Using base_url: ${baseUrl}, Provider type: ${fullProvider.provider}`);

              const result = await invoke<ExecutionResult>("execute_prompt", {
                promptYaml: JSON.stringify(runtime),
                variables: variableValues,
                apiKey: apiKey,
                baseUrl: baseUrl,
              });

              console.log(`[Arena] Execution success for ${model.model_name}`);

              // 立即更新 results 状态，然后移除加载状态
              setResults(prev => {
                const newMap = new Map(prev);
                newMap.set(modelId, result);
                return newMap;
              });

              // 开始流式显示输出
              animateOutput(modelId, result.output);

              // 移除加载状态（放在最后，确保 results 已更新）
              setLoadingModels(prev => {
                const newSet = new Set(prev);
                newSet.delete(modelId);
                return newSet;
              });

              // 同时也添加到本地变量，用于最后保存
              newResults.set(modelId, result);

              return { modelId, result };
            } catch (err) {
              console.error(`[Arena] Failed to execute ${model.model_name}:`, err);
              console.error(`[Arena] Error details:`, err);

              // 保存错误信息
              const errorMessage = String(err);
              setModelErrors(prev => {
                const newMap = new Map(prev);
                newMap.set(modelId, errorMessage);
                return newMap;
              });

              // 移除加载状态
              setLoadingModels(prev => {
                const newSet = new Set(prev);
                newSet.delete(modelId);
                return newSet;
              });

              return null;
            }
          });

          await Promise.all(promises);
        }
      } else {
        // 串行执行
        for (const modelId of modelArray) {
          const model = enabledModels.find(m => m.id === modelId);
          if (!model) continue;

          try {
            console.log(`[Arena Serial] Executing model: ${model.model_name}`);

            // 获取完整的 provider 信息（包含真实 API key）
            const fullProvider = await invoke<LLMProvider>("get_llm_provider", {
              providerName: model.provider_name,
            });

            console.log(`[Arena Serial] Full provider loaded`);

            // 根据 api_key_source 获取 API key
            let apiKey = "";
            if (fullProvider.api_key_source === "keychain" && fullProvider.api_key_ref) {
              console.log(`[Arena Serial] Getting API key from keychain: ${fullProvider.api_key_ref}`);
              apiKey = await invoke<string>("get_api_key_from_keychain", {
                environment: fullProvider.api_key_ref,
              });
            } else if (fullProvider.api_key_source === "direct" && fullProvider.api_key) {
              console.log(`[Arena Serial] Using direct API key from full provider`);
              apiKey = fullProvider.api_key;
            }

            console.log(`[Arena Serial] Final API key length: ${apiKey.length}`);

            // 加载 runtime 并替换模型
            const runtime = await invoke("load_prompt_runtime", {
              filePath: filePath,
            });

            console.log(`[Arena Serial] Runtime loaded, original provider: ${runtime.config.provider}`);

            // 修改 model 和 provider
            runtime.config.model = model.model_id;

            // 根据 provider 类型设置正确的枚举值
            if (fullProvider.provider === "openrouter") {
              runtime.config.provider = "openrouter";
            }

            console.log(`[Arena Serial] Final config:`, JSON.stringify(runtime.config));

            // 确定正确的 base_url
            let baseUrl = fullProvider.base_url || null;
            if (!baseUrl && fullProvider.provider === "openrouter") {
              baseUrl = "https://openrouter.ai/api/v1";
            }

            console.log(`[Arena Serial] Using base_url: ${baseUrl}, Provider type: ${fullProvider.provider}`);

            const result = await invoke<ExecutionResult>("execute_prompt", {
              promptYaml: JSON.stringify(runtime),
              variables: variableValues,
              apiKey: apiKey,
              baseUrl: baseUrl,
            });

            console.log(`[Arena Serial] Execution success for ${model.model_name}`);

            // 立即更新 results 状态
            setResults(prev => {
              const newMap = new Map(prev);
              newMap.set(modelId, result);
              return newMap;
            });

            // 开始流式显示输出
            animateOutput(modelId, result.output);

            // 移除加载状态（放在最后，确保 results 已更新）
            setLoadingModels(prev => {
              const newSet = new Set(prev);
              newSet.delete(modelId);
              return newSet;
            });

            // 同时也添加到本地变量，用于最后保存
            newResults.set(modelId, result);
          } catch (err) {
            console.error(`[Arena Serial] Failed to execute ${model.model_name}:`, err);
            console.error(`[Arena Serial] Error details:`, err);

            // 保存错误信息
            const errorMessage = String(err);
            setModelErrors(prev => {
              const newMap = new Map(prev);
              newMap.set(modelId, errorMessage);
              return newMap;
            });

            // 移除加载状态
            setLoadingModels(prev => {
              const newSet = new Set(prev);
              newSet.delete(modelId);
              return newSet;
            });
          }
        }
      }

      if (newResults.size === 0) {
        throw new Error(t("execution.all_models_failed"));
      }

      // 注意：results 已在每个模型执行完成时立即更新，这里不需要再次调用 setResults

      // 自动保存结果
      if (arenaSettings.auto_save_results && workspacePath) {
        saveArenaBattle(newResults);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsExecuting(false);
      setLoadingModels(new Set()); // 清空所有加载状态
    }
  };

  // 流式输出动画效果
  const animateOutput = (modelId: string, fullOutput: string) => {
    const chars = fullOutput.split('');
    let currentIndex = 0;

    // 根据文本长度调整速度
    const speed = Math.max(5, Math.min(50, 2000 / chars.length));

    const interval = setInterval(() => {
      if (currentIndex < chars.length) {
        const displayText = chars.slice(0, currentIndex + 1).join('');
        setStreamingOutputs(prev => {
          const newMap = new Map(prev);
          newMap.set(modelId, displayText);
          return newMap;
        });
        currentIndex++;
      } else {
        clearInterval(interval);
        // 动画完成后，从 streaming 中移除，使用完整结果
        setStreamingOutputs(prev => {
          const newMap = new Map(prev);
          newMap.delete(modelId);
          return newMap;
        });
      }
    }, speed);
  };

  const saveArenaBattle = async (resultsMap: Map<string, ExecutionResult>) => {
    if (!workspacePath) {
      console.warn("[Arena] No workspace path, skipping save");
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

      // 使用当前文件内容或文件路径
      const contentToSave = promptContent || filePath;

      console.log("[Arena] Saving battle to:", workspacePath);
      console.log("[Arena] Models:", modelsArray);
      console.log("[Arena] Auto save enabled:", arenaSettings.auto_save_results);

      const id = await invoke<string>("save_arena_battle", {
        workspacePath: workspacePath,
        promptFileId: null,
        promptContent: contentToSave,
        inputVariables: JSON.stringify(variableValues),
        models: JSON.stringify(modelsArray),
        outputs: JSON.stringify(outputsArray),
      });

      setBattleId(id);
      console.log("[Arena] Battle saved successfully with ID:", id);
      console.log("[Arena] Database should be at:", workspacePath + "/.vibebase/project.db");
    } catch (error) {
      console.error("[Arena] Failed to save arena battle:", error);
    }
  };

  const handleVote = (modelId: string) => {
    const newVotes = new Set(votes);
    if (newVotes.has(modelId)) {
      newVotes.delete(modelId);
    } else {
      newVotes.add(modelId);
    }
    setVotes(newVotes);

    // 更新数据库中的投票
    if (battleId) {
      updateVotesInDB(newVotes, winnerModel);
    }
  };

  const handleMarkWinner = (modelId: string) => {
    const newWinner = winnerModel === modelId ? null : modelId;
    setWinnerModel(newWinner);

    // 更新数据库中的获胜者
    if (battleId) {
      updateVotesInDB(votes, newWinner);
    }
  };

  const updateVotesInDB = async (votesSet: Set<string>, winner: string | null) => {
    if (!battleId || !workspacePath) return;

    try {
      // 使用 model_name 作为 key（与保存时的 model_name 字段对应）
      const votesObject: Record<string, number> = {};
      votesSet.forEach(modelId => {
        const model = enabledModels.find(m => m.id === modelId);
        const modelName = model?.model_name || modelId;
        votesObject[modelName] = 1;
      });

      // 获胜者也使用 model_name
      const winnerModelName = winner
        ? enabledModels.find(m => m.id === winner)?.model_name || winner
        : null;

      await invoke("update_arena_votes", {
        workspacePath: workspacePath,
        battleId: battleId,
        winnerModel: winnerModelName,
        votes: JSON.stringify(votesObject),
      });
    } catch (error) {
      console.error("Failed to update votes:", error);
    }
  };

  const handleRetryModel = async (modelId: string) => {
    const model = enabledModels.find(m => m.id === modelId);
    if (!model) return;

    // 清除该模型的错误状态
    setModelErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(modelId);
      return newMap;
    });

    // 清除该模型的结果
    setResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(modelId);
      return newMap;
    });

    // 设置为加载状态
    setLoadingModels(prev => new Set(prev).add(modelId));

    try {
      console.log(`[Arena Retry] Retrying model: ${model.model_name}`);

      // 获取完整的 provider 信息
      const fullProvider = await invoke<LLMProvider>("get_llm_provider", {
        providerName: model.provider_name,
      });

      // 根据 api_key_source 获取 API key
      let apiKey = "";
      if (fullProvider.api_key_source === "keychain" && fullProvider.api_key_ref) {
        apiKey = await invoke<string>("get_api_key_from_keychain", {
          environment: fullProvider.api_key_ref,
        });
      } else if (fullProvider.api_key_source === "direct" && fullProvider.api_key) {
        apiKey = fullProvider.api_key;
      }

      // 加载 runtime 并替换模型
      const runtime = await invoke("load_prompt_runtime", {
        filePath: filePath,
      });

      runtime.config.model = model.model_id;

      if (fullProvider.provider === "openrouter") {
        runtime.config.provider = "openrouter";
      }

      // 确定正确的 base_url
      let baseUrl = fullProvider.base_url || null;
      if (!baseUrl && fullProvider.provider === "openrouter") {
        baseUrl = "https://openrouter.ai/api/v1";
      }

      const result = await invoke<ExecutionResult>("execute_prompt", {
        promptYaml: JSON.stringify(runtime),
        variables: variableValues,
        apiKey: apiKey,
        baseUrl: baseUrl,
      });

      console.log(`[Arena Retry] Success for ${model.model_name}`);

      // 更新结果
      setResults(prev => {
        const newMap = new Map(prev);
        newMap.set(modelId, result);
        return newMap;
      });

      // 开始流式显示输出
      animateOutput(modelId, result.output);

      // 移除加载状态
      setLoadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelId);
        return newSet;
      });
    } catch (err) {
      console.error(`[Arena Retry] Failed to execute ${model.model_name}:`, err);

      // 保存错误信息
      const errorMessage = String(err);
      setModelErrors(prev => {
        const newMap = new Map(prev);
        newMap.set(modelId, errorMessage);
        return newMap;
      });

      // 移除加载状态
      setLoadingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelId);
        return newSet;
      });
    }
  };

  return (
    <div className="w-full h-full bg-card flex flex-col">
      {/* Window Controls */}
      {isStandaloneWindow && (
        <div
          className="h-12 border-b border-border flex items-center justify-between px-6 bg-gradient-to-r from-card to-card/50"
          data-tauri-drag-region
        >
          <div className="flex items-center gap-2" data-tauri-drag-region="none">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
              title={t("actions.close")}
            />
            <button
              onClick={handleMinimize}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
              title={t("actions.minimize")}
            />
            <button
              onClick={handleMaximize}
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
              title={t("actions.maximize")}
            />
          </div>
          <h2 className="text-lg font-semibold flex-1 text-center" data-tauri-drag-region>
            {t("arena.title")}
          </h2>
          <div className="w-[68px]" />
        </div>
      )}

      {/* Prompt Preview */}
      <PromptPreview promptContent={promptContent} fileName={fileName} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Variables & Model Selection */}
        <div className="w-80 border-r border-border flex flex-col">
          {/* Variables Section (固定) */}
          {variables.length > 0 && (
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold mb-3">{t("arena.variables")}</h3>
              <div className="space-y-2">
                {variables.map((variable) => (
                  <div key={variable}>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      {variable}
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
                      className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded-md"
                      placeholder={`Enter ${variable}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model Selection (可滚动) */}
          <div className="flex-1 overflow-auto p-4">
            <h3 className="text-sm font-semibold mb-2">{t("arena.selectModels")}</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t("arena.modelsSelected", { count: selectedModels.size })}
            </p>
            <div className="space-y-1.5">
              {enabledModels.map((model) => {
                const isSelected = selectedModels.has(model.id);
                const isDisabled = !isSelected && selectedModels.size >= arenaSettings.max_concurrent;

                return (
                  <button
                    key={model.id}
                    onClick={() => !isDisabled && toggleModelSelection(model.id)}
                    disabled={isDisabled}
                    className={`w-full px-3 py-2 text-left rounded-md flex items-start gap-2 transition-colors ${isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-accent cursor-pointer"
                      }`}
                  >
                    <div
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 rounded border flex items-center justify-center ${isSelected ? "bg-primary border-primary" : "border-input"
                        }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{model.model_name}</div>
                      <div className="text-xs text-muted-foreground">{model.provider_type}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedModels.size >= arenaSettings.max_concurrent && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                {t("arena.maxModelsHint", { max: arenaSettings.max_concurrent })}
              </p>
            )}
          </div>

          {/* Run Button (固定在底部) */}
          <div className="p-4 border-t border-border">
            <button
              onClick={handleExecute}
              disabled={selectedModels.size === 0 || isExecuting || variables.some(v => !variableValues[v])}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("arena.running")}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {t("arena.runArena")}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel - Results (Horizontal Scroll) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {error && (
            <div className="m-4 p-3 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {(results.size > 0 || loadingModels.size > 0) ? (
            (() => {
              const modelCount = selectedModels.size;
              const containerClasses = modelCount === 1
                ? "flex-1 overflow-y-hidden"
                : modelCount === 2
                  ? "flex-1 overflow-y-hidden"
                  : "flex-1 overflow-x-auto overflow-y-hidden";

              const gridClasses = modelCount === 1
                ? "h-full"
                : modelCount === 2
                  ? "grid grid-cols-2 gap-4 h-full"
                  : "flex gap-4 h-full";

              const cardWidthClass = modelCount === 1
                ? "w-full"
                : modelCount === 2
                  ? "w-full"
                  : "w-[400px] flex-shrink-0";

              return (
                <div className={containerClasses}>
                  <div className={`${gridClasses} p-4`}>
                    {Array.from(selectedModels).map((modelId) => {
                      const model = enabledModels.find(m => m.id === modelId);
                      if (!model) return null;

                      const isLoading = loadingModels.has(modelId);
                      const result = results.get(modelId);
                      const error = modelErrors.get(modelId);

                      if (isLoading) {
                        // 显示加载中的卡片
                        return (
                          <VoteCard
                            key={modelId}
                            modelId={modelId}
                            modelName={model.model_name}
                            providerType={model.provider_type}
                            output=""
                            hasVoted={false}
                            isWinner={false}
                            isLoading={true}
                            cardWidth={cardWidthClass}
                            onVote={() => { }}
                            onMarkWinner={() => { }}
                          />
                        );
                      } else if (error) {
                        // 显示错误的卡片
                        return (
                          <VoteCard
                            key={modelId}
                            modelId={modelId}
                            modelName={model.model_name}
                            providerType={model.provider_type}
                            output=""
                            hasVoted={false}
                            isWinner={false}
                            isLoading={false}
                            error={error}
                            cardWidth={cardWidthClass}
                            onVote={() => { }}
                            onMarkWinner={() => { }}
                            onRetry={() => handleRetryModel(modelId)}
                          />
                        );
                      } else if (result) {
                        // 显示已完成的卡片（有输出）
                        const displayOutput = streamingOutputs.get(modelId) || result.output;

                        return (
                          <VoteCard
                            key={modelId}
                            modelId={modelId}
                            modelName={model.model_name}
                            providerType={model.provider_type}
                            output={displayOutput}
                            metadata={result.metadata}
                            hasVoted={votes.has(modelId)}
                            isWinner={winnerModel === modelId}
                            isLoading={false}
                            cardWidth={cardWidthClass}
                            onVote={() => handleVote(modelId)}
                            onMarkWinner={() => handleMarkWinner(modelId)}
                          />
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">{t("arena.noResults")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


