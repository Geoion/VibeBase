import { useTranslation } from "react-i18next";
import { ThumbsUp, Trophy, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";

interface VoteCardProps {
  modelId: string;
  modelName: string;
  providerType: string;
  output: string;
  metadata?: {
    latency_ms: number;
    tokens_input: number;
    tokens_output: number;
    cost_usd: number;
  };
  hasVoted: boolean;
  isWinner: boolean;
  isLoading?: boolean;
  isReadOnly?: boolean;
  error?: string | null;
  cardWidth?: string;
  onVote: () => void;
  onMarkWinner: () => void;
  onRetry?: () => void;
}

export default function VoteCard({
  modelId: _modelId,
  modelName,
  providerType,
  output,
  metadata,
  hasVoted,
  isWinner,
  isLoading = false,
  isReadOnly = false,
  error = null,
  cardWidth = "w-80 flex-shrink-0",
  onVote,
  onMarkWinner,
  onRetry,
}: VoteCardProps) {
  const { t } = useTranslation();
  const outputRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (outputRef.current && output && !isLoading && !error) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, isLoading, error]);

  return (
    <div className={`${cardWidth} border rounded-lg overflow-hidden flex flex-col h-full ${isWinner ? "border-yellow-500 shadow-lg shadow-yellow-500/20" : "border-border"
      }`}>
      {/* Header */}
      <div className={`p-3 border-b flex-shrink-0 ${isWinner ? "bg-yellow-500/10 border-yellow-500/20" : "bg-secondary/50 border-border"
        }`}>
        <div className="flex items-start justify-between mb-1">
          <h4 className="font-semibold text-sm">{modelName}</h4>
          {isWinner && (
            <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-medium">{t("arena.winner")}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{providerType}</p>
      </div>

      {/* Output - 占据剩余空间 */}
      <div className="flex-1 overflow-auto p-3">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">
          {t("arena.output")}
        </p>
        <div
          ref={outputRef}
          className="relative p-2 bg-background/50 rounded text-xs border border-border h-[calc(100%-24px)] overflow-auto"
        >
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">{t("arena.waitingResponse")}</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-4">
              <AlertCircle className="w-8 h-8 text-destructive mb-2" />
              <p className="text-sm font-medium text-destructive mb-2">{t("arena.executionFailed")}</p>
              <p className="text-xs text-muted-foreground text-center mb-4 max-w-full break-words">
                {error}
              </p>
              {onRetry && !isReadOnly && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-sm">{t("arena.retry")}</span>
                </button>
              )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{output}</p>
          )}
        </div>
      </div>

      {/* Metadata - 固定在底部 */}
      {metadata && (
        <div className="flex-shrink-0 p-3 pt-0">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            {t("arena.metadata")}
          </p>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <div className="p-1.5 bg-secondary/30 rounded whitespace-nowrap">
              <span className="text-muted-foreground">{t("arena.latency")}:</span>
              <span className="ml-1 font-medium">{metadata.latency_ms}ms</span>
            </div>
            <div className="p-1.5 bg-secondary/30 rounded whitespace-nowrap">
              <span className="text-muted-foreground">{t("arena.cost")}:</span>
              <span className="ml-1 font-medium">${metadata.cost_usd.toFixed(4)}</span>
            </div>
            <div className="p-1.5 bg-secondary/30 rounded whitespace-nowrap">
              <span className="text-muted-foreground">{t("arena.tokens")}:</span>
              <span className="ml-1 font-medium">
                {metadata.tokens_input} / {metadata.tokens_output}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Vote Buttons - 固定在底部（只读模式下隐藏） */}
      {!isReadOnly && (
        <div className="flex-shrink-0 p-3 pt-0 border-t border-border">
          <div className="flex gap-2 pt-2">
            <button
              onClick={onVote}
              disabled={isLoading}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${isLoading
                ? "opacity-50 cursor-not-allowed bg-secondary"
                : hasVoted
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
                }`}
            >
              <ThumbsUp className={`w-4 h-4 ${hasVoted ? "fill-current" : ""}`} />
              <span>{hasVoted ? t("arena.voted") : t("arena.vote")}</span>
            </button>
            <button
              onClick={onMarkWinner}
              disabled={isLoading}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${isLoading
                ? "opacity-50 cursor-not-allowed bg-secondary"
                : isWinner
                  ? "bg-yellow-500 text-white"
                  : "bg-secondary hover:bg-secondary/80"
                }`}
              title={t("arena.markAsWinner")}
            >
              <Trophy className={`w-4 h-4 ${isWinner ? "fill-current" : ""}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


