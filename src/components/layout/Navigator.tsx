import { useTranslation } from "react-i18next";
import { useWorkspaceStore, Workspace, FileNode } from "../../stores/workspaceStore";
import { useEditorStore } from "../../stores/editorStore";
import { useGitStore } from "../../stores/gitStore";
import { useConsoleStore } from "../../stores/consoleStore";
import { invoke } from "@tauri-apps/api/tauri";
import { RefreshCw, FilePlus, FolderPlus, GitBranch } from "lucide-react";
import { useState } from "react";
import NewPromptDialog from "../dialogs/NewPromptDialog";
import NewFolderDialog from "../dialogs/NewFolderDialog";
import DeleteConfirmDialog from "../dialogs/DeleteConfirmDialog";
import RenameDialog from "../dialogs/RenameDialog";
import FileTreeNode from "../filetree/FileTreeNode";
import ContextMenu from "../filetree/ContextMenu";
import GitConfigDialog from "../git/GitConfigDialog";
import GitPanel from "../git/GitPanel";
import { useDragDrop } from "../../hooks/useDragDrop";

export default function Navigator() {
  const { t } = useTranslation();
  const { workspace, setWorkspace } = useWorkspaceStore();
  const { currentFile, setCurrentFile, setContent, setDirty } = useEditorStore();
  const { setWorkspacePath } = useGitStore();
  const { addLog } = useConsoleStore();
  const [showNewPromptDialog, setShowNewPromptDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showGitConfigDialog, setShowGitConfigDialog] = useState(false);
  const [showGitPanel, setShowGitPanel] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    node: FileNode;
    position: { x: number; y: number };
  } | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<FileNode | null>(null);
  const [renameTarget, setRenameTarget] = useState<FileNode | null>(null);
  const { isDragging, draggedItem: draggedNode, handleMouseDown, handleMouseUp } = useDragDrop<FileNode>();
  const [dropTarget, setDropTarget] = useState<FileNode | null>(null);
  const [isRootDropZone, setIsRootDropZone] = useState(false);

  // Save file history
  const saveHistory = async (filePath: string, fileContent: string) => {
    if (!workspace?.path) return;

    try {
      await invoke<boolean>("save_file_history", {
        workspacePath: workspace.path,
        filePath: filePath,
        content: fileContent,
      });
    } catch (error) {
      console.error("Failed to save file history:", error);
    }
  };

  const handleFileClick = async (filePath: string) => {
    // Get current store state
    const { currentFile: prevFile, content: prevContent, isDirty: prevDirty } = useEditorStore.getState();

    // If current file is open and modified, save history first
    if (prevFile && prevDirty && workspace?.path) {
      await saveHistory(prevFile, prevContent);
    }

    try {
      const fileContent = await invoke<string>("read_prompt", {
        filePath: filePath,
      });

      // Validate based on file type
      if (filePath.endsWith(".vibe.md")) {
        // For Markdown files, try to parse
        try {
          await invoke("extract_variables_from_markdown", { content: fileContent });
        } catch (parseError) {
          console.warn("Markdown parsing warning:", parseError);
          // Continue anyway, allow user to edit
        }
      } else if (filePath.endsWith(".vibe.yaml") || filePath.endsWith(".vibe.yml")) {
        // For YAML files, validate
        try {
          await invoke("parse_yaml", { content: fileContent });
        } catch (parseError) {
          console.error("YAML parsing error:", parseError);
          alert(`Invalid YAML format: ${parseError}`);
          return;
        }
      }

      setCurrentFile(filePath);
      setContent(fileContent);
      setDirty(false);
    } catch (error) {
      console.error("Failed to open file:", error);
      alert(`Failed to open file: ${error}`);
    }
  };

  const handleRefresh = async () => {
    if (!workspace) return;

    try {
      const refreshedWorkspace = await invoke<Workspace>("open_workspace", {
        path: workspace.path,
      });
      setWorkspace(refreshedWorkspace);
    } catch (error) {
      console.error("Failed to refresh workspace:", error);
    }
  };

  const handleContextMenu = (node: FileNode, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      node,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  // Get parent directory of a file path
  const getParentDirectory = (filePath: string): string => {
    const lastSlashIndex = filePath.lastIndexOf('/');
    if (lastSlashIndex === -1) return filePath;
    return filePath.substring(0, lastSlashIndex);
  };

  const handleNewFile = (folderPath?: string) => {
    if (folderPath) {
      setSelectedFolderPath(folderPath);
    } else if (contextMenu?.node) {
      // If right-clicked on folder, use folder path; if file, use its parent directory
      if (contextMenu.node.type === "folder") {
        setSelectedFolderPath(contextMenu.node.path);
      } else {
        setSelectedFolderPath(getParentDirectory(contextMenu.node.path));
      }
    } else if (currentFile) {
      // If there's a selected file, use its parent directory
      setSelectedFolderPath(getParentDirectory(currentFile));
    } else if (workspace) {
      setSelectedFolderPath(workspace.path);
    }
    setShowNewPromptDialog(true);
  };

  const handleNewFolder = (folderPath?: string) => {
    if (folderPath) {
      setSelectedFolderPath(folderPath);
    } else if (contextMenu?.node) {
      // If right-clicked on folder, use folder path; if file, use its parent directory
      if (contextMenu.node.type === "folder") {
        setSelectedFolderPath(contextMenu.node.path);
      } else {
        setSelectedFolderPath(getParentDirectory(contextMenu.node.path));
      }
    } else if (currentFile) {
      // If there's a selected file, use its parent directory
      setSelectedFolderPath(getParentDirectory(currentFile));
    } else if (workspace) {
      setSelectedFolderPath(workspace.path);
    }
    setShowNewFolderDialog(true);
  };

  const handleGit = async () => {
    if (!workspace) return;
    
    try {
      // Set workspace path for Git store
      setWorkspacePath(workspace.path);
      
      // Check if Git is configured
      const config = await invoke('get_git_config', { workspacePath: workspace.path });
      
      if (!config || !(config as any).is_configured) {
        // Show config dialog
        setShowGitConfigDialog(true);
      } else {
        // Show Git panel
        setShowGitPanel(true);
      }
    } catch (error) {
      console.error("Failed to check Git config:", error);
      // Show config dialog on error
      setShowGitConfigDialog(true);
    }
  };

  // Handle drag and move to folder
  const handleDragMove = async (targetNode: FileNode) => {
    if (!workspace || !draggedNode || !isDragging) return;

    console.log("📦 Drop:", draggedNode.name, "->", targetNode.name);

    // Prevent dragging to itself
    if (draggedNode.path === targetNode.path) return;

    // Prevent dragging folder to its own subfolder
    if (draggedNode.type === "folder" && targetNode.path.startsWith(draggedNode.path + '/')) {
      alert('Cannot move folder into its own subfolder');
      return;
    }

    // Check if already in target directory
    const sourceParent = draggedNode.path.substring(0, draggedNode.path.lastIndexOf('/'));
    if (sourceParent === targetNode.path) return;

    // Check for name conflict
    if (targetNode.type === "folder") {
      const hasConflict = targetNode.children.some(child => child.name === draggedNode.name);
      if (hasConflict) {
        alert(`Already exists in target directory: ${draggedNode.name}`);
        return;
      }
    }

    try {
      const newPath = await invoke<string>("move_file", {
        sourcePath: draggedNode.path,
        destDir: targetNode.path,
      });

      console.log("✅ Move successful:", newPath);
      await handleRefresh();

      if (currentFile === draggedNode.path) {
        setCurrentFile(newPath);
      }
    } catch (error) {
      console.error("Move failed:", error);
      alert(`Move failed: ${error}`);
    }
  };

  // Handle drag and move to root directory
  const handleDragMoveToRoot = async () => {
    if (!workspace || !draggedNode) return;

    console.log("📦 Drop to root:", draggedNode.name);

    // Check if already in root directory
    const sourceParent = draggedNode.path.substring(0, draggedNode.path.lastIndexOf('/'));
    if (sourceParent === workspace.path) {
      console.log("Already in root directory, no need to move");
      return;
    }

    // Check for name conflict in root
    const rootHasChild = workspace.file_tree.type === 'folder' && workspace.file_tree.children.some((child: FileNode) => child.name === draggedNode.name);
    if (rootHasChild) {
      alert(`Already exists in root directory: ${draggedNode.name}`);
      return;
    }

    try {
      const newPath = await invoke<string>("move_file", {
        sourcePath: draggedNode.path,
        destDir: workspace.path,
      });

      console.log("✅ Move to root successful:", newPath);
      await handleRefresh();

      if (currentFile === draggedNode.path) {
        setCurrentFile(newPath);
      }
    } catch (error) {
      console.error("Move to root failed:", error);
      alert(`Move failed: ${error}`);
    }
  };

  const handleRename = () => {
    if (!contextMenu) return;
    setRenameTarget(contextMenu.node);
    setContextMenu(null);
  };

  const handleConfirmRename = async (newName: string) => {
    if (!renameTarget || !workspace) return;

    try {
      const newPath = await invoke<string>("rename_file", {
        oldPath: renameTarget.path,
        newName: newName,
      });

      addLog("UPDATE", `Renamed: ${renameTarget.path} -> ${newPath}`);

      // If renamed file is currently open, update file path in editor
      if (currentFile === renameTarget.path) {
        setCurrentFile(newPath);
      }

      // Refresh workspace
      await handleRefresh();
      setRenameTarget(null);
    } catch (error) {
      addLog("ERROR", `Rename failed: ${renameTarget.path} - ${error}`);
      alert(`${t("rename.failed")}: ${error}`);
    }
  };

  const handleDelete = () => {
    if (!contextMenu) return;
    // Open confirmation dialog
    setDeleteTarget(contextMenu.node);
    setContextMenu(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      // Call backend to delete file/folder (including database records)
      await invoke("delete_file_with_metadata", {
        filePath: deleteTarget.path,
        workspacePath: workspace?.path,
      });

      const type = deleteTarget.type === "folder" ? "folder" : "file";
      addLog("DELETE", `Deleted ${type}: ${deleteTarget.path}`);

      // If deleted file is currently open, clear editor
      if (currentFile === deleteTarget.path) {
        setCurrentFile(null);
        setContent("");
        setDirty(false);
      }

      // If deleted folder contains currently open file, clear editor
      if (deleteTarget.type === "folder" && currentFile && currentFile.startsWith(deleteTarget.path + '/')) {
        setCurrentFile(null);
        setContent("");
        setDirty(false);
      }

      await handleRefresh();
      setDeleteTarget(null);
    } catch (error) {
      addLog("ERROR", `Delete failed: ${deleteTarget.path} - ${error}`);
      alert(`Delete failed: ${error}`);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col">
      {/* Navigator Header */}
      <div className="h-10 border-b border-border flex items-center px-3 justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleNewFile()}
            className="p-1 hover:bg-accent rounded transition-colors"
            title={t("workspace.newFile")}
            disabled={!workspace}
          >
            <FilePlus className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => handleNewFolder()}
            className="p-1 hover:bg-accent rounded transition-colors"
            title={t("workspace.newFolder")}
            disabled={!workspace}
          >
            <FolderPlus className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleGit}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Git"
            disabled={!workspace}
          >
            <GitBranch className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-accent rounded transition-colors"
            title={t("workspace.refresh")}
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div
        className={`flex-1 overflow-auto p-2 relative ${isRootDropZone ? "bg-primary/10 border-2 border-primary border-dashed" : ""}`}
        onMouseMove={() => {
          // If dragging and mouse is in blank area (not on any folder), it's root drop zone
          if (isDragging && draggedNode && !dropTarget) {
            setIsRootDropZone(true);
          } else {
            setIsRootDropZone(false);
          }
        }}
        onMouseUp={() => {
          console.log("🖱️ Mouse up, isDragging:", isDragging, "dropTarget:", dropTarget?.name, "isRoot:", isRootDropZone);

          // Check if dropped on folder
          if (isDragging && draggedNode) {
            if (dropTarget) {
              handleDragMove(dropTarget);
            } else if (isRootDropZone) {
              handleDragMoveToRoot();
            }
          }

          handleMouseUp();
          setDropTarget(null);
          setIsRootDropZone(false);
        }}
      >
        {workspace?.file_tree && workspace.file_tree.type === 'folder' ? (
          <>
            {workspace.file_tree.children.map((child: FileNode, idx: number) => (
              <div
                key={idx}
                className={dropTarget?.path === child.path ? "bg-primary/10 rounded-md border-2 border-primary" : ""}
              >
                <FileTreeNode
                  node={child}
                  level={0}
                  onFileClick={handleFileClick}
                  onContextMenu={handleContextMenu}
                  currentFile={currentFile}
                  isDragging={isDragging}
                  draggedNode={draggedNode}
                  onMouseDownCapture={handleMouseDown}
                  onHoverFolder={setDropTarget}
                />
              </div>
            ))}

            {/* Root drop zone indicator */}
            {isRootDropZone && isDragging && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
                  Move to root directory
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground text-center px-4">
              {t("workspace.noPrompts")}
            </p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          node={contextMenu.node}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      )}

      {/* New Prompt Dialog */}
      {showNewPromptDialog && (
        <NewPromptDialog
          parentPath={selectedFolderPath}
          onClose={() => setShowNewPromptDialog(false)}
          onSuccess={handleRefresh}
        />
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <NewFolderDialog
          parentPath={selectedFolderPath}
          onClose={() => setShowNewFolderDialog(false)}
          onSuccess={handleRefresh}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <DeleteConfirmDialog
          itemName={deleteTarget.name}
          itemType={deleteTarget.type}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Rename Dialog */}
      {renameTarget && (
        <RenameDialog
          isOpen={true}
          currentName={renameTarget.name}
          itemType={renameTarget.type}
          onConfirm={handleConfirmRename}
          onCancel={() => setRenameTarget(null)}
        />
      )}

      {/* Git Dialogs */}
      {showGitConfigDialog && (
        <GitConfigDialog onClose={() => setShowGitConfigDialog(false)} />
      )}

      {showGitPanel && (
        <GitPanel onClose={() => setShowGitPanel(false)} />
      )}
    </div>
  );
}

