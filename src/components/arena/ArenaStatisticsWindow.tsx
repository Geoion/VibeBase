import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { Trophy, ThumbsUp, DollarSign, Clock, Zap, BarChart3 } from "lucide-react";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import WindowControls, { useWindowStyle } from "../ui/WindowControls";

interface ArenaStatisticsWindowProps {
  onClose: () => void;
  isStandaloneWindow?: boolean;
}

interface Statistics {
  total_battles: number;
  unique_models_count: number;
  total_model_appearances: number;
  model_votes: Record<string, number>;
  model_wins: Record<string, number>;
  provider_tokens: Record<string, [number, number]>;
  provider_avg_latency: Record<string, number>;
  provider_cost: Record<string, number>;
  model_tokens: Record<string, [number, number]>;
  model_avg_latency: Record<string, number>;
  model_cost: Record<string, number>;
}

export default function ArenaStatisticsWindow({ onClose, isStandaloneWindow = false }: ArenaStatisticsWindowProps) {
  const { t } = useTranslation();
  const { workspace } = useWorkspaceStore();
  const { getWindowBorderRadius } = useWindowStyle();
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedWorkspacePath = localStorage.getItem("arena_history_workspace");
    if (savedWorkspacePath) {
      setWorkspacePath(savedWorkspacePath);
    } else if (workspace) {
      setWorkspacePath(workspace.path);
    }
  }, [workspace]);

  useEffect(() => {
    if (workspacePath) {
      loadStatistics();
    }
  }, [workspacePath]);

  const loadStatistics = async () => {
    if (!workspacePath) {
      setLoading(false);
      return;
    }

    try {
      console.log("[Arena Stats] Loading statistics from:", workspacePath);
      const stats = await invoke<Statistics>("get_arena_statistics", {
        workspacePath: workspacePath,
      });
      console.log("[Arena Stats] Loaded statistics:", stats);
      setStatistics(stats);
    } catch (error) {
      console.error("[Arena Stats] Failed to load statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const sortedByVotes = statistics
    ? Object.entries(statistics.model_votes).sort((a, b) => b[1] - a[1])
    : [];

  const sortedByWins = statistics
    ? Object.entries(statistics.model_wins).sort((a, b) => b[1] - a[1])
    : [];

  const sortedProvidersByTokens = statistics
    ? Object.entries(statistics.provider_tokens).sort((a, b) => (b[1][0] + b[1][1]) - (a[1][0] + a[1][1]))
    : [];

  const sortedModelsByTokens = statistics
    ? Object.entries(statistics.model_tokens).sort((a, b) => (b[1][0] + b[1][1]) - (a[1][0] + a[1][1]))
    : [];

  return (
    <div className={`w-full h-full flex flex-col ${isStandaloneWindow ? "bg-card rounded-xl overflow-hidden" : "bg-card overflow-hidden"}`}>
      {/* Window Controls */}
      {isStandaloneWindow && (
        <WindowControls title={t("statistics.title")} onClose={onClose} />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">{t("execution.loading")}</p>
          </div>
        ) : !statistics ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">{t("statistics.noData")}</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-secondary/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {t("statistics.totalBattles")}
                  </span>
                </div>
                <p className="text-2xl font-bold">{statistics.total_battles}</p>
              </div>

              <div className="bg-secondary/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {t("statistics.uniqueModels")}
                  </span>
                </div>
                <p className="text-2xl font-bold">{statistics.unique_models_count}</p>
              </div>

              <div className="bg-secondary/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {t("statistics.totalModelAppearances")}
                  </span>
                </div>
                <p className="text-2xl font-bold">{statistics.total_model_appearances}</p>
              </div>
            </div>

            {/* Model Votes & Wins */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Votes */}
              <div className="bg-secondary/10 p-6 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <ThumbsUp className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">{t("statistics.modelVotes")}</h3>
                </div>
                {sortedByVotes.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {sortedByVotes.map(([model, votes]) => (
                      <div key={model} className="flex items-center justify-between p-2 bg-background/50 rounded">
                        <span className="text-sm font-medium truncate flex-1" title={model}>{model}</span>
                        <span className="text-sm text-primary font-semibold ml-2">{votes}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("statistics.noVotes")}</p>
                )}
              </div>

              {/* Wins */}
              <div className="bg-secondary/10 p-6 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                  <h3 className="text-lg font-semibold">{t("statistics.bestModels")}</h3>
                </div>
                {sortedByWins.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {sortedByWins.map(([model, wins]) => (
                      <div key={model} className="flex items-center justify-between p-2 bg-background/50 rounded">
                        <span className="text-sm font-medium truncate flex-1" title={model}>{model}</span>
                        <span className="text-sm text-yellow-600 dark:text-yellow-500 font-semibold ml-2">{wins}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("statistics.noWins")}</p>
                )}
              </div>
            </div>

            {/* Provider Statistics */}
            <div className="bg-secondary/10 p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold mb-4">{t("statistics.providerStats")}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedProvidersByTokens.map(([provider, tokens]) => (
                  <div key={provider} className="bg-background/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3 truncate">{provider}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {t("statistics.tokens")}:
                        </span>
                        <span className="font-medium">{(tokens[0] + tokens[1]).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {t("statistics.avgLatency")}:
                        </span>
                        <span className="font-medium">{statistics.provider_avg_latency[provider] || 0}ms</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {t("statistics.cost")}:
                        </span>
                        <span className="font-medium">${(statistics.provider_cost[provider] || 0).toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Statistics */}
            <div className="bg-secondary/10 p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold mb-4">{t("statistics.modelStats")}</h3>
              <div className="space-y-2">
                {sortedModelsByTokens.map(([model, tokens]) => (
                  <div key={model} className="bg-background/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium truncate flex-1">{model}</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t("statistics.tokens")}: </span>
                        <span className="font-medium">{(tokens[0] + tokens[1]).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("statistics.avgLatency")}: </span>
                        <span className="font-medium">{statistics.model_avg_latency[model] || 0}ms</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("statistics.cost")}: </span>
                        <span className="font-medium">${(statistics.model_cost[model] || 0).toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
