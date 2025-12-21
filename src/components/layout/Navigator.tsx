import { useTranslation } from "react-i18next";
import { useWorkspaceStore, Workspace, FileNode } from "../../stores/workspaceStore";
import { useEditorStore } from "../../stores/editorStore";
import { invoke } from "@tauri-apps/api/tauri";
import { message } from "@tauri-apps/api/dialog";
import { RefreshCw, FilePlus, FolderPlus, GitBranch } from "lucide-react";
import { useState, useRef } from "react";
import NewPromptDialog from "../dialogs/NewPromptDialog";
import NewFolderDialog from "../dialogs/NewFolderDialog";
import DeleteConfirmDialog from "../dialogs/DeleteConfirmDialog";
import RenameDialog from "../dialogs/RenameDialog";
import FileTreeNode from "../filetree/FileTreeNode";
import ContextMenu from "../filetree/ContextMenu";
import { useDragDrop } from "../../hooks/useDragDrop";

export default function Navigator() {
  const { t } = useTranslation();
  const { workspace, setWorkspace } = useWorkspaceStore();
  const { currentFile, setCurrentFile, setContent, setDirty } = useEditorStore();
  const [showNewPromptDialog, setShowNewPromptDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
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

  // 保存文件历史记录
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
    // 获取当前 store 状态
    const { currentFile: prevFile, content: prevContent, isDirty: prevDirty } = useEditorStore.getState();

    // 如果当前有打开的文件且内容有变化，先保存历史
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

  // 获取文件路径的父目录
  const getParentDirectory = (filePath: string): string => {
    const lastSlashIndex = filePath.lastIndexOf('/');
    if (lastSlashIndex === -1) return filePath;
    return filePath.substring(0, lastSlashIndex);
  };

  const handleNewFile = (folderPath?: string) => {
    if (folderPath) {
      setSelectedFolderPath(folderPath);
    } else if (contextMenu?.node) {
      // 如果右键点击的是文件夹，使用文件夹路径；如果是文件，使用其父目录
      if (contextMenu.node.type === "folder") {
        setSelectedFolderPath(contextMenu.node.path);
      } else {
        setSelectedFolderPath(getParentDirectory(contextMenu.node.path));
      }
    } else if (currentFile) {
      // 如果有当前选中的文件，使用其父目录
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
      // 如果右键点击的是文件夹，使用文件夹路径；如果是文件，使用其父目录
      if (contextMenu.node.type === "folder") {
        setSelectedFolderPath(contextMenu.node.path);
      } else {
        setSelectedFolderPath(getParentDirectory(contextMenu.node.path));
      }
    } else if (currentFile) {
      // 如果有当前选中的文件，使用其父目录
      setSelectedFolderPath(getParentDirectory(currentFile));
    } else if (workspace) {
      setSelectedFolderPath(workspace.path);
    }
    setShowNewFolderDialog(true);
  };

  const handleGit = async () => {
    try {
      await message(t("common.featureComingSoon"), { 
        title: "VibeBase",
        type: "info" 
      });
    } catch (error) {
      console.error("Failed to show message:", error);
      // 降级到 alert
      alert(t("common.featureComingSoon"));
    }
  };

  // 处理拖拽移动到文件夹
  const handleDragMove = async (targetNode: FileNode) => {
    if (!workspace || !draggedNode || !isDragging) return;

    console.log("📦 拖放:", draggedNode.name, "->", targetNode.name);

    // 防止拖到自己
    if (draggedNode.path === targetNode.path) return;

    // 防止文件夹拖到自己的子文件夹
    if (draggedNode.type === "folder" && targetNode.path.startsWith(draggedNode.path + '/')) {
      alert('不能将文件夹移动到自己的子文件夹中');
      return;
    }

    // 检查是否已在目标目录
    const sourceParent = draggedNode.path.substring(0, draggedNode.path.lastIndexOf('/'));
    if (sourceParent === targetNode.path) return;

    // 检查重名
    if (targetNode.type === "folder") {
      const hasConflict = targetNode.children.some(child => child.name === draggedNode.name);
      if (hasConflict) {
        alert(`目标目录中已存在: ${draggedNode.name}`);
        return;
      }
    }

    try {
      const newPath = await invoke<string>("move_file", {
        sourcePath: draggedNode.path,
        destDir: targetNode.path,
      });

      console.log("✅ 移动成功:", newPath);
      await handleRefresh();

      if (currentFile === draggedNode.path) {
        setCurrentFile(newPath);
      }
    } catch (error) {
      console.error("移动失败:", error);
      alert(`移动失败: ${error}`);
    }
  };

  // 处理拖拽移动到根目录
  const handleDragMoveToRoot = async () => {
    if (!workspace || !draggedNode) return;

    console.log("📦 拖放到根目录:", draggedNode.name);

    // 检查是否已在根目录
    const sourceParent = draggedNode.path.substring(0, draggedNode.path.lastIndexOf('/'));
    if (sourceParent === workspace.path) {
      console.log("已在根目录，无需移动");
      return;
    }

    // 检查根目录重名
    const rootHasChild = workspace.file_tree.children.some(child => child.name === draggedNode.name);
    if (rootHasChild) {
      alert(`根目录中已存在: ${draggedNode.name}`);
      return;
    }

    try {
      const newPath = await invoke<string>("move_file", {
        sourcePath: draggedNode.path,
        destDir: workspace.path,
      });

      console.log("✅ 移动到根目录成功:", newPath);
      await handleRefresh();

      if (currentFile === draggedNode.path) {
        setCurrentFile(newPath);
      }
    } catch (error) {
      console.error("移动到根目录失败:", error);
      alert(`移动失败: ${error}`);
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

      // 如果重命名的是当前打开的文件，更新编辑器中的文件路径
      if (currentFile === renameTarget.path) {
        setCurrentFile(newPath);
      }

      // 刷新工作区
      await handleRefresh();
      setRenameTarget(null);
    } catch (error) {
      alert(`${t("rename.failed")}: ${error}`);
    }
  };

  const handleDelete = () => {
    if (!contextMenu) return;
    // 打开确认对话框
    setDeleteTarget(contextMenu.node);
    setContextMenu(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      // 调用后端删除文件/文件夹（包括数据库记录）
      await invoke("delete_file_with_metadata", {
        filePath: deleteTarget.path,
        workspacePath: workspace?.path,
      });

      // 如果删除的是当前打开的文件，清空编辑器
      if (currentFile === deleteTarget.path) {
        setCurrentFile(null);
        setContent("");
        setDirty(false);
      }

      // 如果删除的是文件夹，检查当前打开的文件是否在该文件夹下
      if (deleteTarget.type === "folder" && currentFile && currentFile.startsWith(deleteTarget.path + '/')) {
        setCurrentFile(null);
        setContent("");
        setDirty(false);
      }

      await handleRefresh();
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete:", error);
      alert(`删除失败: ${error}`);
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
        onMouseMove={(e) => {
          // 如果正在拖拽，且鼠标在空白区域（不在任何文件夹上），就是根目录拖放区
          if (isDragging && draggedNode && !dropTarget) {
            setIsRootDropZone(true);
          } else {
            setIsRootDropZone(false);
          }
        }}
        onMouseUp={(e) => {
          console.log("🖱️ 鼠标松开, isDragging:", isDragging, "dropTarget:", dropTarget?.name, "isRoot:", isRootDropZone);

          // 检查是否拖放到了文件夹上
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
        {workspace?.file_tree ? (
          <>
            {workspace.file_tree.children.map((child, idx) => (
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

            {/* 根目录拖放提示 */}
            {isRootDropZone && isDragging && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
                  移动到根目录
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
    </div>
  );
}

