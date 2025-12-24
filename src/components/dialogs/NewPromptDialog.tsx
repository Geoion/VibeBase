import { useState } from "react";
import { X, FileCode } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useEditorStore } from "../../stores/editorStore";
import { useConsoleStore } from "../../stores/consoleStore";

interface NewPromptDialogProps {
  parentPath: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewPromptDialog({
  parentPath,
  onClose,
  onSuccess,
}: NewPromptDialogProps) {
  const { workspace } = useWorkspaceStore();
  const { setCurrentFile, setContent, setDirty } = useEditorStore();
  const { addLog } = useConsoleStore();
  const [fileName, setFileName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if file exists
  const checkFileExists = (fullFileName: string): boolean => {
    if (!workspace || !workspace.file_tree) return false;

    const checkInFolder = (node: any): boolean => {
      if (node.type === "folder") {
        if (node.path === parentPath) {
          // Found target folder, check if there's a file with the same name
          return node.children.some((child: any) => child.name === fullFileName);
        }
        // Recursively check subfolders
        return node.children.some((child: any) => checkInFolder(child));
      }
      return false;
    };

    return checkInFolder(workspace.file_tree);
  };

  const handleCreate = async () => {
    if (!workspace || !fileName) return;

    // Ensure .vibe.md extension (v2.0)
    let fullFileName = fileName;
    if (!fullFileName.endsWith(".vibe.md")) {
      fullFileName = `${fullFileName}.vibe.md`;
    }

    // Check if file already exists
    if (checkFileExists(fullFileName)) {
      setError(`File already exists: ${fullFileName}`);
      return;
    }

    // Calculate relative path from workspace to parent folder
    const relativeParent = parentPath.replace(workspace.path, "").replace(/^\//, "");
    const relativePath = relativeParent ? `${relativeParent}/${fullFileName}` : fullFileName;

    setIsCreating(true);
    setError(null);

    try {
      const filePath = await invoke<string>("create_new_prompt", {
        workspacePath: workspace.path,
        relativePath: relativePath,
      });

      addLog("CREATE", `File created: ${filePath}`);

      // Read the created file
      const content = await invoke<string>("read_prompt", {
        filePath: filePath,
      });

      // Open in editor
      setCurrentFile(filePath);
      setContent(content);
      setDirty(false);

      // Refresh workspace
      onSuccess();
      onClose();
    } catch (err) {
      // Calculate full path for error message
      const fullPath = parentPath ? `${parentPath}/${fullFileName}` : fullFileName;
      addLog("ERROR", `Create failed: ${fullPath} - ${err}`);
      setError(String(err));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-[500px] bg-card border border-border rounded-lg shadow-xl">
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              New Prompt File
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
              File Name
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g., greeting or greeting.vibe.md"
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              .vibe.md extension will be added automatically
            </p>
          </div>

          <div className="p-3 bg-secondary rounded-md">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Location:</span> {parentPath}/
              <span className="text-foreground">{fileName || "..."}</span>
              {!fileName.endsWith(".vibe.md") && ".vibe.md"}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-input rounded-md hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!fileName || isCreating}
              className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

