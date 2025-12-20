import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

interface RenameDialogProps {
  isOpen: boolean;
  currentName: string;
  itemType: "file" | "folder";
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

export default function RenameDialog({
  isOpen,
  currentName,
  itemType,
  onConfirm,
  onCancel,
}: RenameDialogProps) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName);
      setError(null);

      // 聚焦输入框并选中文件名（不包括扩展名）
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();

          if (itemType === "file") {
            const lastDotIndex = currentName.lastIndexOf(".");
            if (lastDotIndex > 0) {
              inputRef.current.setSelectionRange(0, lastDotIndex);
            } else {
              inputRef.current.select();
            }
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [isOpen, currentName, itemType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = newName.trim();

    // 验证
    if (!trimmedName) {
      setError(t("rename.error_empty"));
      return;
    }

    if (trimmedName === currentName) {
      onCancel();
      return;
    }

    if (trimmedName.includes("/") || trimmedName.includes("\\")) {
      setError(t("rename.error_invalid_chars"));
      return;
    }

    if (trimmedName.startsWith(".")) {
      setError(t("rename.error_starts_with_dot"));
      return;
    }

    onConfirm(trimmedName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-[480px] bg-card border border-border rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {itemType === "folder"
              ? t("rename.rename_folder")
              : t("rename.rename_file")}
          </h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("rename.new_name")}
              </label>
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t("rename.enter_new_name")}
              />
              {error && (
                <p className="text-sm text-destructive mt-1">{error}</p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                {t("actions.cancel")}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t("rename.confirm")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}



