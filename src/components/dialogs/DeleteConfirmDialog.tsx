import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DeleteConfirmDialogProps {
  itemName: string;
  itemType: "file" | "folder";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({
  itemName,
  itemType,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  useTranslation();

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-[450px] bg-card border border-border rounded-lg shadow-xl">
        {/* Header */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-lg font-semibold text-foreground">
                确认删除{itemType === "folder" ? "文件夹" : "文件"}
              </h2>
              <p className="text-sm text-muted-foreground">
                你确定要删除 <span className="font-medium text-foreground">{itemName}</span> 吗？
              </p>
              {itemType === "folder" && (
                <p className="text-sm text-destructive">
                  ⚠️ 此操作将删除文件夹内的所有文件和子文件夹！
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                此操作无法撤销，所有相关的数据库记录也将被删除。
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-sm border border-input rounded-md hover:bg-accent transition-colors"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


