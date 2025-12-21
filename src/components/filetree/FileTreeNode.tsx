import { useState, useRef } from "react";
import { FileNode } from "../../stores/workspaceStore";
import { ChevronRight, ChevronDown, Folder, File, FileCode } from "lucide-react";
import { useWorkspaceStore } from "../../stores/workspaceStore";

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
  onFileClick: (filePath: string) => void;
  onContextMenu: (node: FileNode, e: React.MouseEvent) => void;
  currentFile: string | null;
  isDragging?: boolean;
  draggedNode?: FileNode | null;
  onMouseDownCapture?: (node: FileNode, e: React.MouseEvent) => void;
  onHoverFolder?: (node: FileNode | null) => void;
}

export default function FileTreeNode({
  node,
  level,
  onFileClick,
  onContextMenu,
  currentFile,
  isDragging: isBeingDragged,
  draggedNode,
  onMouseDownCapture,
  onHoverFolder,
}: FileTreeNodeProps) {
  const { toggleFolder } = useWorkspaceStore();
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle left button
    if (e.button !== 0) return;

    // Notify parent component to start drag detection
    if (onMouseDownCapture) {
      onMouseDownCapture(node, e);
    }
  };

  const handleMouseEnter = () => {
    // Only respond to hover when dragging folders
    if (isBeingDragged && draggedNode && node.type === "folder" && node.path !== draggedNode.path) {
      console.log("🎯 Hover folder:", node.name);
      if (onHoverFolder) {
        onHoverFolder(node);
      }
    }
  };

  const handleMouseLeave = () => {
    if (isBeingDragged && onHoverFolder) {
      onHoverFolder(null);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Ignore click if dragging
    if (isBeingDragged) {
      e.stopPropagation();
      return;
    }

    // Delay click execution to ensure it's not a drag operation
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
    }

    clickTimer.current = setTimeout(() => {
      if (node.type === "folder") {
        toggleFolder(node.path);
      } else {
        onFileClick(node.path);
      }
    }, 100);
  };

  // Determine if this is a drop target (determined by parent's dropTarget, will be highlighted in Navigator)
  const isThisBeingDragged = isBeingDragged && draggedNode?.path === node.path;

  if (node.type === "folder") {
    return (
      <div>
        <div
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onContextMenu={(e) => {
            e.stopPropagation();
            onContextMenu(node, e);
          }}
          className={`flex items-center gap-1 px-2 py-1 hover:bg-accent rounded-md cursor-pointer transition-colors ${isThisBeingDragged ? "opacity-50" : ""}`}
          style={{
            paddingLeft: `${level * 12 + 8}px`,
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          {node.expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )}
          <Folder className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm text-foreground truncate">{node.name}</span>
        </div>

        {node.expanded &&
          node.children.map((child, idx) => (
            <FileTreeNode
              key={`${child.path}-${idx}`}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
              currentFile={currentFile}
              isDragging={isBeingDragged}
              draggedNode={draggedNode}
              onMouseDownCapture={onMouseDownCapture}
              onHoverFolder={onHoverFolder}
            />
          ))}
      </div>
    );
  }

  // File node
  const isActive = currentFile === node.path;
  const Icon = node.is_vibe_file ? FileCode : File;

  // Hide .vibe.md suffix
  const displayName = node.name.endsWith('.vibe.md')
    ? node.name.slice(0, -8)
    : node.name;

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.stopPropagation();
        onContextMenu(node, e);
      }}
      className={`flex items-center gap-2 px-2 py-1 hover:bg-accent rounded-md cursor-pointer transition-colors ${isActive ? "bg-accent" : ""
        } ${isThisBeingDragged ? "opacity-50" : ""}`}
      style={{
        paddingLeft: `${level * 12 + 20}px`,
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      <Icon
        className={`w-4 h-4 flex-shrink-0 ${node.is_vibe_file ? "text-primary" : "text-muted-foreground"
          }`}
      />
      <span className={`text-sm truncate ${isActive ? "font-medium" : ""}`}>
        {displayName}
      </span>
    </div>
  );
}






