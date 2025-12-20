import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

interface PromptPreviewProps {
  promptContent: string;
  fileName?: string;
}

export default function PromptPreview({ promptContent, fileName }: PromptPreviewProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // 获取前N行
  const getPreviewLines = (content: string, maxLines: number = 3) => {
    const lines = content.split('\n');
    return lines.slice(0, maxLines).join('\n');
  };

  const previewContent = getPreviewLines(promptContent, 3);
  const hasMore = promptContent.split('\n').length > 3;

  return (
    <div className="border-b border-border bg-secondary/30">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{t("arena.promptPreview")}</h3>
            {fileName && (
              <span className="text-xs text-muted-foreground">({fileName})</span>
            )}
          </div>
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-accent transition-colors"
            >
              <span>{expanded ? t("arena.showLess") : t("arena.showMore")}</span>
              {expanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
        <pre className={`text-xs bg-background/50 p-3 rounded border border-border overflow-auto ${expanded ? "max-h-96" : "max-h-24"
          }`}>
          {expanded ? promptContent : previewContent}
          {!expanded && hasMore && <span className="text-muted-foreground">...</span>}
        </pre>
      </div>
    </div>
  );
}


