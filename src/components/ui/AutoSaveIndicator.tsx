import { Check, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AutoSaveIndicatorProps {
  status: "idle" | "saving" | "saved";
  lastSavedAt?: Date | null;
}

export default function AutoSaveIndicator({ status }: AutoSaveIndicatorProps) {
  const { t } = useTranslation();

  if (status === "idle") {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg border backdrop-blur-sm transition-all duration-300 ${
          status === "saved"
            ? "bg-green-500/20 border-green-500/30 text-green-600 dark:text-green-400"
            : "bg-blue-500/20 border-blue-500/30 text-blue-600 dark:text-blue-400"
        }`}
      >
        {status === "saving" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Check className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {status === "saving" ? t("settings.saving") : t("settings.autoSaved")}
        </span>
      </div>
    </div>
  );
}

