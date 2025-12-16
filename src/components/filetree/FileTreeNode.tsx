import { useState } from "react";
import { FileNode } from "../../stores/workspaceStore";
import { ChevronRight, ChevronDown, Folder, File, FileCode } from "lucide-react";
import { useWorkspaceStore } from "../../stores/workspaceStore";

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
  onFileClick: (filePath: string) => void;
  onContextMenu: (node: FileNode, e: React.MouseEvent) => void;
  currentFile: string | null;
}

export default function FileTreeNode({
  node,
  level,
  onFileClick,
  onContextMenu,
  currentFile,
}: FileTreeNodeProps) {
  const { toggleFolder } = useWorkspaceStore();

  if (node.type === "folder") {
    return (
      <div>
        <div
          onClick={() => toggleFolder(node.path)}
          onContextMenu={(e) => onContextMenu(node, e)}
          className="flex items-center gap-1 px-2 py-1 hover:bg-accent rounded-md cursor-pointer transition-colors"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
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
              key={idx}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
              currentFile={currentFile}
            />
          ))}
      </div>
    );
  }

  // File node
  const isActive = currentFile === node.path;
  const Icon = node.is_vibe_file ? FileCode : File;

  // 隐藏 .vibe.md 后缀
  const displayName = node.name.endsWith('.vibe.md')
    ? node.name.slice(0, -8)
    : node.name;

  return (
    <div
      onClick={() => onFileClick(node.path)}
      onContextMenu={(e) => onContextMenu(node, e)}
      className={`flex items-center gap-2 px-2 py-1 hover:bg-accent rounded-md cursor-pointer transition-colors ${isActive ? "bg-accent" : ""
        }`}
      style={{ paddingLeft: `${level * 12 + 20}px` }}
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






