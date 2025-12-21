import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

interface CustomProviderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (provider: CustomProviderData) => void;
  existingProviders: string[];
}

export interface CustomProviderData {
  name: string;
  displayName: string;
  baseUrl: string;
  description: string;
}

export default function CustomProviderDialog({
  isOpen,
  onClose,
  onConfirm,
  existingProviders,
}: CustomProviderDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    // 验证
    if (!name.trim()) {
      setError(t("providers.customNameRequired"));
      return;
    }

    if (!displayName.trim()) {
      setError(t("providers.customDisplayNameRequired"));
      return;
    }

    if (!baseUrl.trim()) {
      setError(t("providers.customBaseUrlRequired"));
      return;
    }

    // Validate URL format
    try {
      new URL(baseUrl);
    } catch (e) {
      setError(t("providers.customInvalidUrl"));
      return;
    }

    // Check for duplicate names (case-insensitive)
    const lowerName = name.toLowerCase();
    if (existingProviders.some(p => p.toLowerCase() === lowerName)) {
      setError(t("providers.customNameExists"));
      return;
    }

    onConfirm({ name: name.trim(), displayName: displayName.trim(), baseUrl: baseUrl.trim(), description: description.trim() });
    handleClose();
  };

  const handleClose = () => {
    setName("");
    setDisplayName("");
    setBaseUrl("");
    setDescription("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold">{t("providers.addCustomProvider")}</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-accent rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Provider ID (Internal Name) */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {t("providers.customName")}
              <span className="text-destructive ml-1">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="custom-provider"
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("providers.customNameHint")}
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {t("providers.customDisplayName")}
              <span className="text-destructive ml-1">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setError("");
              }}
              placeholder="My Custom Provider"
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("providers.customDisplayNameHint")}
            </p>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {t("providers.customBaseUrl")}
              <span className="text-destructive ml-1">*</span>
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setError("");
              }}
              placeholder="https://api.example.com/v1"
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("providers.customBaseUrlHint")}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {t("providers.customDescription")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("providers.customDescriptionPlaceholder")}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-border">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            {t("actions.cancel")}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            {t("actions.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
