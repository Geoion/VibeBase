import { useState } from "react";
import { X, FolderPlus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore } from "../../stores/workspaceStore";

interface NewFolderDialogProps {
  parentPath: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewFolderDialog({
  parentPath,
  onClose,
  onSuccess,
}: NewFolderDialogProps) {
  const { workspace } = useWorkspaceStore();
  const [folderName, setFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if folder exists
  const checkFolderExists = (folderName: string): boolean => {
    if (!workspace || !workspace.file_tree) return false;

    const checkInFolder = (node: any): boolean => {
      if (node.type === "folder") {
        if (node.path === parentPath) {
          // Found target folder, check for subfolder with same name
          return node.children.some((child: any) =>
            child.type === "folder" && child.name === folderName
          );
        }
        // Recursively check subfolders
        return node.children.some((child: any) => checkInFolder(child));
      }
      return false;
    };

    return checkInFolder(workspace.file_tree);
  };

  const handleCreate = async () => {
    if (!workspace || !folderName) return;

    // Check if folder already exists
    if (checkFolderExists(folderName)) {
      setError(`Folder already exists: ${folderName}`);
      return;
    }

    const folderPath = `${parentPath}/${folderName}`;

    setIsCreating(true);
    setError(null);

    try {
      await invoke("create_folder", {
        folderPath: folderPath,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreate();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-[450px] bg-card border border-border rounded-lg shadow-xl">
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              New Folder
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Folder Name
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="e.g., prompts or customer-service"
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          <div className="p-3 bg-secondary rounded-md">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Location:</span> {parentPath}/
              <span className="text-foreground">{folderName || "..."}</span>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-input rounded-md hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!folderName || isCreating}
              className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? "Creating..." : "Create Folder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}








