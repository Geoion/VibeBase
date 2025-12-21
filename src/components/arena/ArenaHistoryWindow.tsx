import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/tauri";
import { Clock, Trophy } from "lucide-react";
import { appWindow } from "@tauri-apps/api/window";
import VoteCard from "./VoteCard";
import PromptPreview from "./PromptPreview";
import { useWorkspaceStore } from "../../stores/workspaceStore";

interface ArenaHistoryWindowProps {
  onClose: () => void;
  isStandaloneWindow?: boolean;
}

interface ArenaBattle {
  id: string;
  prompt_file_id: string | null;
  prompt_content: string;
  input_variables: string;
  models: string;
  outputs: string;
  winner_model: string | null;
  votes: string | null;
  timestamp: number;
}

interface ModelOutput {
  model_id?: string;
  provider_name?: string;
  model_name?: string;
  provider_type?: string;
  model?: string;  // 兼容旧数据
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

export default function ArenaHistoryWindow({ onClose, isStandaloneWindow = false }: ArenaHistoryWindowProps) {
  const { t } = useTranslation();
  const { workspace } = useWorkspaceStore();
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [battles, setBattles] = useState<ArenaBattle[]>([]);
  const [selectedBattle, setSelectedBattle] = useState<ArenaBattle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 localStorage 读取 workspace 路径（独立窗口模式）
    const savedWorkspacePath = localStorage.getItem("arena_history_workspace");
    if (savedWorkspacePath) {
      setWorkspacePath(savedWorkspacePath);
    } else if (workspace) {
      setWorkspacePath(workspace.path);
    }
  }, [workspace]);

  useEffect(() => {
    if (workspacePath) {
      loadBattles();
    }
  }, [workspacePath]);

  const loadBattles = async () => {
    if (!workspacePath) {
      console.warn("[Arena History] No workspace path");
      setLoading(false);
      return;
    }

    try {
      console.log("[Arena History] Loading battles from:", workspacePath);
      console.log("[Arena History] Database should be at:", workspacePath + "/.vibebase/project.db");

      const battlesList = await invoke<ArenaBattle[]>("get_arena_battles", {
        workspacePath: workspacePath,
        limit: 100,
      });

      console.log("[Arena History] Loaded", battlesList.length, "battles");
      console.log("[Arena History] Battles:", battlesList);

      setBattles(battlesList);
      if (battlesList.length > 0) {
        setSelectedBattle(battlesList[0]);
      }
    } catch (error) {
      console.error("[Arena History] Failed to load arena battles:", error);
    } finally {
      setLoading(false);
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

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const parseOutputs = (outputsJson: string): ModelOutput[] => {
    try {
      return JSON.parse(outputsJson);
    } catch (error) {
      console.error("Failed to parse outputs:", error);
      return [];
    }
  };

  const parseVariables = (variablesJson: string): Record<string, string> => {
    try {
      return JSON.parse(variablesJson);
    } catch (error) {
      console.error("Failed to parse variables:", error);
      return {};
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
            {t("arena.history")}
          </h2>
          <div className="w-[68px]" />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Battle List */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold">{t("arena.historyList")}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t("arena.totalBattles", { count: battles.length })}
            </p>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">{t("execution.loading")}</p>
              </div>
            ) : battles.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">{t("arena.noHistory")}</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {battles.map((battle) => {
                  const isSelected = selectedBattle?.id === battle.id;
                  const outputs = parseOutputs(battle.outputs);
                  const modelCount = outputs.length;

                  return (
                    <button
                      key={battle.id}
                      onClick={() => setSelectedBattle(battle)}
                      className={`w-full p-3 text-left rounded-md transition-colors ${isSelected ? "bg-accent border border-border" : "hover:bg-accent/50"
                        }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(battle.timestamp)}
                        </span>
                        {battle.winner_model && (
                          <Trophy className="w-3 h-3 text-yellow-600 dark:text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm font-medium mb-1">
                        {modelCount} {t("arena.models")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {outputs.map(o => o.model_name || o.metadata.model).join(", ")}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Battle Details */}
        {selectedBattle ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Prompt Preview */}
            <PromptPreview
              promptContent={selectedBattle.prompt_content}
              fileName={`Battle ${selectedBattle.id.substring(0, 8)}`}
            />

            {/* Variables Display */}
            {selectedBattle.input_variables && selectedBattle.input_variables !== "{}" && (
              <div className="px-4 py-3 border-b border-border bg-secondary/20">
                <h3 className="text-xs font-semibold mb-2">{t("arena.variables")}</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(parseVariables(selectedBattle.input_variables)).map(
                    ([key, value]) => (
                      <div key={key} className="text-xs bg-background px-2 py-1 rounded border border-border">
                        <span className="font-medium text-muted-foreground">{key}:</span>{" "}
                        <span>{value}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Results */}
            {(() => {
              const outputs = parseOutputs(selectedBattle.outputs);
              const modelCount = outputs.length;

              // 调试日志：显示 winner_model 的值
              if (selectedBattle.winner_model) {
                console.log("[Arena History] Winner model:", selectedBattle.winner_model);
                console.log("[Arena History] Available models:", outputs.map(o => ({
                  model_id: o.model_id,
                  model_name: o.model_name,
                  metadata_model: o.metadata.model
                })));
              }
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
                    {outputs.map((output) => {
                      const modelKey = output.model_id || output.model || "unknown";
                      const modelName = output.model_name || output.metadata.model;
                      const providerType = output.provider_type || output.metadata.provider;

                      // 尝试多种方式匹配 winner：model_name, model_id, 或 metadata.model
                      const isWinner = selectedBattle.winner_model === modelName ||
                        selectedBattle.winner_model === modelKey ||
                        selectedBattle.winner_model === output.metadata.model;

                      // 调试日志
                      if (selectedBattle.winner_model) {
                        console.log(`[Arena History] Checking ${modelName}: isWinner=${isWinner}`, {
                          winner_model: selectedBattle.winner_model,
                          modelName,
                          modelKey,
                          metadata_model: output.metadata.model
                        });
                      }

                      const votes = selectedBattle.votes ? JSON.parse(selectedBattle.votes) : {};
                      const hasVoted = votes[modelName] === 1;

                      return (
                        <VoteCard
                          key={modelKey}
                          modelId={modelKey}
                          modelName={modelName}
                          providerType={providerType}
                          output={output.output}
                          metadata={output.metadata}
                          hasVoted={hasVoted}
                          isWinner={isWinner}
                          isLoading={false}
                          cardWidth={cardWidthClass}
                          onVote={() => { }}
                          onMarkWinner={() => { }}
                          isReadOnly={true}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-sm">{t("arena.selectBattle")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
