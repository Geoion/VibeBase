import { FileNode } from "../../stores/workspaceStore";
import { FilePlus, FolderPlus, Trash2, Edit3 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ContextMenuProps {
  node: FileNode;
  position: { x: number; y: number };
  onClose: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}

export default function ContextMenu({
  node,
  position,
  onClose,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
}: ContextMenuProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-48 bg-popover border border-border rounded-md shadow-lg py-1"
        style={{ left: position.x, top: position.y }}
      >
        {node.type === "folder" && (
          <>
            <button
              onClick={() => {
                onNewFile();
                onClose();
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
            >
              <FilePlus className="w-4 h-4" />
              {t("workspace.newFile")}
            </button>
            <button
              onClick={() => {
                onNewFolder();
                onClose();
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              {t("workspace.newFolder")}
            </button>
            <div className="h-px bg-border my-1" />
          </>
        )}

        {onRename && (
          <button
            onClick={() => {
              onRename();
              onClose();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            {t("actions.rename")}
          </button>
        )}

        {onDelete && (
          <button
            onClick={() => {
              if (confirm(t("workspace.deleteConfirm", { name: node.name }))) {
                onDelete();
                onClose();
              }
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-destructive/10 text-destructive transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {t("actions.delete")}
          </button>
        )}
      </div>
    </>
  );
}








