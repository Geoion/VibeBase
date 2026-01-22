import { useTranslation } from "react-i18next";
import { useThemeStore } from "../../stores/themeStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useGitStore } from "../../stores/gitStore";
import type { Workspace, FileNode } from "../../stores/workspaceStore";
import { Moon, Sun, Monitor, FolderOpen, Languages, Settings as SettingsIcon, Layers, ChevronDown, History, BarChart3, Search, X, Tag } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "../../stores/editorStore";

interface RecentProject {
  id: string;
  path: string;
  name: string;
  last_opened: number;
  pinned: boolean;
}

export default function Header() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { workspace, setWorkspace } = useWorkspaceStore();
  const { setWorkspacePath } = useGitStore();
  const { setCurrentFile, setContent, setDirty } = useEditorStore();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    files: Set<string>;
    tags: Map<string, string[]>;
    history: Map<string, any[]>;
    content: Map<string, string>;
  }>({
    files: new Set(),
    tags: new Map(),
    history: new Map(),
    content: new Map(),
  });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isTagSearch, setIsTagSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRecentProjects();
    if (workspace) {
      loadAvailableTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace]);

  const loadAvailableTags = async () => {
    if (!workspace) {
      setAvailableTags([]);
      return;
    }
    try {
      const tags = await invoke<string[]>("get_all_tags", {
        workspacePath: workspace.path,
      });
      setAvailableTags(tags || []);
    } catch (error) {
      console.error("Failed to load available tags:", error);
      setAvailableTags([]);
    }
  };

  const loadRecentProjects = async () => {
    try {
      const projects = await invoke<RecentProject[]>("get_recent_projects", {
        limit: 10,
      });
      // Filter out current workspace and deduplicate by path
      const uniquePaths = new Set<string>();
      const filtered = projects.filter((p) => {
        if (workspace && p.path === workspace.path) return false;
        if (uniquePaths.has(p.path)) return false;
        uniquePaths.add(p.path);
        return true;
      });
      setRecentProjects(filtered);
    } catch (error) {
      console.error("Failed to load recent projects:", error);
    }
  };

  const handleSwitchWorkspace = async (path: string) => {
    try {
      const newWorkspace = await invoke<Workspace>("open_workspace", {
        path: path,
      });
      setWorkspace(newWorkspace);
      // 自动设置 Git 工作区路径
      setWorkspacePath(path);
      setShowWorkspaceMenu(false);
    } catch (error) {
      console.error("Failed to switch workspace:", error);
    }
  };

  const handleOpenNewWorkspace = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t("workspace.openFolder"),
      });

      if (selected && typeof selected === "string") {
        const newWorkspace = await invoke<Workspace>("open_workspace", {
          path: selected,
        });
        setWorkspace(newWorkspace);
        // 自动设置 Git 工作区路径
        setWorkspacePath(selected);
        setShowWorkspaceMenu(false);
      }
    } catch (error) {
      console.error("Failed to open workspace:", error);
    }
  };

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const ThemeIcon = themeIcons[theme];

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("vibebase_locale", lang);
    setShowLanguageMenu(false);
  };

  const getCurrentLanguageDisplay = () => {
    const langMap: Record<string, string> = {
      "zh-Hans": "简",
      "zh-Hant": "繁",
      "en-US": "En"
    };
    return langMap[i18n.language] || "简";
  };

  const openVariablesWindow = async () => {
    try {
      await invoke("open_variables_window");
    } catch (error) {
      console.error("Failed to open variables window:", error);
    }
  };

  const openSettingsWindow = async () => {
    try {
      await invoke("open_settings_window");
    } catch (error) {
      console.error("Failed to open settings window:", error);
    }
  };

  const openArenaHistoryWindow = async () => {
    try {
      // Save current workspace path to localStorage
      if (workspace) {
        localStorage.setItem("arena_history_workspace", workspace.path);
      }
      await invoke("open_arena_history_window");
    } catch (error) {
      console.error("Failed to open arena history window:", error);
    }
  };

  const openArenaStatisticsWindow = async () => {
    try {
      // Save current workspace path to localStorage
      if (workspace) {
        localStorage.setItem("arena_history_workspace", workspace.path);
      }
      await invoke("open_arena_statistics_window");
    } catch (error) {
      console.error("Failed to open arena statistics window:", error);
    }
  };

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim() || !workspace) {
      setSearchResults({
        files: new Set(),
        tags: new Map(),
        history: new Map(),
        content: new Map(),
      });
      return;
    }

    const performSearch = async () => {
      // Check if it's a tag search (starts with # or tag:)
      const tagMatch = searchQuery.match(/^(?:#|tag:)(.+)$/i);
      const isTagQuery = !!tagMatch;
      setIsTagSearch(isTagQuery);
      
      const query = isTagQuery ? tagMatch[1].toLowerCase() : searchQuery.toLowerCase();
      const matchedFiles = new Set<string>();
      const matchedTags = new Map<string, string[]>();
      const matchedHistory = new Map<string, any[]>();
      const matchedContent = new Map<string, string>();

      // Search in file tree (file names and paths) - only for non-tag searches
      if (!isTagQuery) {
        const searchInTree = (node: FileNode) => {
          if (node.type === "file") {
            const fileName = node.name.toLowerCase();
            const filePath = node.path.toLowerCase();
            if (fileName.includes(query) || filePath.includes(query)) {
              matchedFiles.add(node.path);
            }
          } else if (node.type === "folder") {
            node.children.forEach(searchInTree);
          }
        };

        if (workspace.file_tree.type === "folder") {
          workspace.file_tree.children.forEach(searchInTree);
        }
      }

      // Collect all files
      const allFiles: string[] = [];
      const collectFiles = (node: FileNode) => {
        if (node.type === "file") {
          allFiles.push(node.path);
        } else if (node.type === "folder") {
          node.children.forEach(collectFiles);
        }
      };

      if (workspace.file_tree.type === "folder") {
        workspace.file_tree.children.forEach(collectFiles);
      }

      // Search file content, tags and history for each file
      for (const filePath of allFiles) {
        try {
          // Search in tags (always)
          const metadata = await invoke<{ tags?: string }>("get_prompt_metadata", {
            workspacePath: workspace.path,
            filePath: filePath,
          });

          if (metadata.tags) {
            const tags = JSON.parse(metadata.tags) as string[];
            const matchingTags = tags.filter((tag: string) =>
              tag.toLowerCase().includes(query)
            );
            if (matchingTags.length > 0) {
              matchedFiles.add(filePath);
              matchedTags.set(filePath, matchingTags);
            }
          }

          // Skip content and history search for tag-only searches
          if (isTagQuery) continue;

          // Search in file content
          const fileContent = await invoke<string>("read_prompt", {
            filePath: filePath,
          });

          if (fileContent.toLowerCase().includes(query)) {
            matchedFiles.add(filePath);
            // Extract a snippet around the match
            const lowerContent = fileContent.toLowerCase();
            const matchIndex = lowerContent.indexOf(query);
            const start = Math.max(0, matchIndex - 50);
            const end = Math.min(fileContent.length, matchIndex + query.length + 50);
            let snippet = fileContent.substring(start, end);
            if (start > 0) snippet = "..." + snippet;
            if (end < fileContent.length) snippet = snippet + "...";
            matchedContent.set(filePath, snippet);
          }

          // Search in history
          const history = await invoke<Array<{ preview?: string; content_hash?: string }>>("get_file_history", {
            workspacePath: workspace.path,
            filePath: filePath,
            limit: 50,
          });

          const matchingHistory = history.filter(
            (entry) =>
              entry.preview?.toLowerCase().includes(query) ||
              entry.content_hash?.toLowerCase().includes(query)
          );

          if (matchingHistory.length > 0) {
            matchedFiles.add(filePath);
            matchedHistory.set(filePath, matchingHistory);
          }
        } catch (error) {
          // Ignore errors for individual files
          console.debug("Search error for file:", filePath, error);
        }
      }

      setSearchResults({
        files: matchedFiles,
        tags: matchedTags,
        history: matchedHistory,
        content: matchedContent,
      });
    };

    // Debounce search
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, workspace]);

  const handleFileClick = async (filePath: string) => {
    try {
      const fileContent = await invoke<string>("read_prompt", {
        filePath: filePath,
      });

      setCurrentFile(filePath);
      setContent(fileContent);
      setDirty(false);
      setShowSearchResults(false);
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to open file:", error);
      alert(`Failed to open file: ${error}`);
    }
  };

  return (
    <header className="h-12 border-b border-border flex items-center px-4 bg-card">
      <div className="flex items-center gap-4 flex-1">
        {/* Workspace Selector */}
        {workspace ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="flex items-center gap-2 px-2 py-1 hover:bg-accent rounded-md transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {workspace.name}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>

            {showWorkspaceMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowWorkspaceMenu(false)}
                />
                <div className="absolute left-0 mt-2 w-64 bg-popover border border-border rounded-md shadow-lg z-20 max-h-96 overflow-auto">
                  <div className="py-1">
                    {recentProjects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => handleSwitchWorkspace(project.path)}
                        className="w-full px-4 py-2 text-left hover:bg-accent"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {project.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.path}
                        </p>
                      </button>
                    ))}
                    <div className="border-t border-border my-1" />
                    <button
                      type="button"
                      onClick={handleOpenNewWorkspace}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-foreground"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>{t("workspace.openNew")}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {t("workspace.noWorkspace")}
            </span>
          </div>
        )}
        {workspace && (
          <>
            <span className="text-xs text-muted-foreground">
              {t("workspace.promptsFound", { count: workspace.prompts.length })}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Search Box */}
        {workspace && (
          <div className="relative">
            <div className="relative">
              {isTagSearch ? (
                <Tag className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-primary pointer-events-none" />
              ) : (
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              )}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchResults(true)}
                placeholder={t("workspace.searchPrompts")}
                className={`w-64 pl-8 pr-8 py-1.5 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                  isTagSearch 
                    ? "border-primary focus:ring-primary" 
                    : "border-input focus:ring-ring"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setShowSearchResults(false);
                    setIsTagSearch(false);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-0.5 hover:bg-accent rounded transition-colors"
                  title={t("actions.clearSearch")}
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setShowSearchResults(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowSearchResults(false);
                  }}
                  aria-label="Close search results"
                  tabIndex={-1}
                />
                <div className="absolute right-0 mt-2 w-96 bg-popover border border-border rounded-md shadow-lg z-20 max-h-96 overflow-auto">
                  {/* Show tag suggestions when no search query */}
                  {!searchQuery && availableTags.length > 0 && (
                    <>
                      <div className="p-3 border-b border-border">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Tag className="w-3.5 h-3.5" />
                          {t("workspace.quickTagSearch")}
                        </div>
                      </div>
                      <div className="py-1 max-h-64 overflow-auto">
                        {availableTags.slice(0, 20).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setSearchQuery(`#${tag}`);
                              searchInputRef.current?.focus();
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-center gap-2"
                          >
                            <Tag className="w-3.5 h-3.5 text-primary" />
                            <span className="text-sm text-foreground">{tag}</span>
                          </button>
                        ))}
                        {availableTags.length > 20 && (
                          <div className="px-4 py-2 text-xs text-muted-foreground">
                            {t("workspace.moreTags", { count: availableTags.length - 20 })}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Show search results when there is a query */}
                  {searchQuery && (
                    <>
                      <div className={`p-3 border-b border-border ${isTagSearch ? "bg-primary/5" : ""}`}>
                        <div className="text-xs text-muted-foreground">
                          {isTagSearch && (
                            <div className="flex items-center gap-2 mb-2 text-primary font-medium">
                              <Tag className="w-3.5 h-3.5" />
                              {t("workspace.tagSearchMode")}
                            </div>
                          )}
                          {searchResults.files.size > 0 ? (
                            <div className="space-y-1">
                              <div className="font-medium">
                                {t("workspace.searchResults", { count: searchResults.files.size })}
                              </div>
                              {searchResults.content.size > 0 && !isTagSearch && (
                                <div className="text-green-600">
                                  · {searchResults.content.size} {t("workspace.matchedContent")}
                                </div>
                              )}
                              {searchResults.tags.size > 0 && (
                                <div className="text-primary">
                                  · {searchResults.tags.size} {t("workspace.matchedTags")}
                                </div>
                              )}
                              {searchResults.history.size > 0 && !isTagSearch && (
                                <div className="text-amber-600">
                                  · {searchResults.history.size} {t("workspace.matchedHistory")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>{t("workspace.noSearchResults")}</div>
                          )}
                        </div>
                      </div>
                      
                      {searchResults.files.size > 0 && (
                        <div className="py-1">
                          {Array.from(searchResults.files).map((filePath) => {
                            const fileName = filePath.split("/").pop()?.replace('.vibe.md', '') || filePath;
                            const matchedTags = searchResults.tags.get(filePath);
                            const matchedHistoryCount = searchResults.history.get(filePath)?.length || 0;
                            const matchedContentSnippet = searchResults.content.get(filePath);
                            
                            return (
                              <button
                                key={filePath}
                                type="button"
                                onClick={() => handleFileClick(filePath)}
                                className={`w-full px-4 py-2 text-left hover:bg-accent transition-colors ${
                                  isTagSearch ? "bg-primary/5" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-foreground truncate">
                                    {fileName}
                                  </span>
                                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                    {matchedContentSnippet && !isTagSearch && (
                                      <span className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded">
                                        {t("workspace.contentLabel")}
                                      </span>
                                    )}
                                    {matchedTags && matchedTags.length > 0 && (
                                      <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                        {matchedTags.length} {t("workspace.tagsLabel")}
                                      </span>
                                    )}
                                    {matchedHistoryCount > 0 && !isTagSearch && (
                                      <span className="text-xs px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded">
                                        {matchedHistoryCount} {t("workspace.historyLabel")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground truncate mt-0.5">
                                  {filePath}
                                </div>
                                {matchedContentSnippet && !isTagSearch && (
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2 bg-green-500/5 px-2 py-1 rounded">
                                    {matchedContentSnippet}
                                  </div>
                                )}
                                {matchedTags && matchedTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {matchedTags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Variables Manager */}
        <button
          type="button"
          onClick={openVariablesWindow}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title={t("variables.manager")}
        >
          <Layers className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Arena History */}
        <button
          type="button"
          onClick={openArenaHistoryWindow}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title={t("arena.history")}
        >
          <History className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Arena Statistics */}
        <button
          type="button"
          onClick={openArenaStatisticsWindow}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title={t("statistics.title")}
        >
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={openSettingsWindow}
          className="p-2 hover:bg-accent rounded-md transition-colors"
          title={t("settings.title")}
        >
          <SettingsIcon className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Language Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="p-2 hover:bg-accent rounded-md transition-colors flex items-center gap-1"
            title={t(`language.${i18n.language}`)}
          >
            <Languages className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{getCurrentLanguageDisplay()}</span>
          </button>

          {showLanguageMenu && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setShowLanguageMenu(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowLanguageMenu(false);
                }}
                aria-label="Close language menu"
                tabIndex={-1}
              />
              <div className="absolute right-0 mt-2 w-40 bg-popover border border-border rounded-md shadow-lg z-20">
                <div className="py-1">
                  {(["zh-Hans", "zh-Hant", "en-US"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => changeLanguage(lang)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-foreground"
                    >
                      <Languages className="w-4 h-4" />
                      <span>{t(`language.${lang}`)}</span>
                      {i18n.language === lang && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Theme Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title={t(`theme.${theme}`)}
          >
            <ThemeIcon className="w-4 h-4 text-muted-foreground" />
          </button>

          {showThemeMenu && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setShowThemeMenu(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowThemeMenu(false);
                }}
                aria-label="Close theme menu"
                tabIndex={-1}
              />
              <div className="absolute right-0 mt-2 w-40 bg-popover border border-border rounded-md shadow-lg z-20">
                <div className="py-1">
                  {(["light", "dark", "system"] as const).map((themeOption) => (
                    <button
                      key={themeOption}
                      type="button"
                      onClick={() => {
                        setTheme(themeOption);
                        setShowThemeMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-foreground"
                    >
                      {themeOption === "light" && <Sun className="w-4 h-4" />}
                      {themeOption === "dark" && <Moon className="w-4 h-4" />}
                      {themeOption === "system" && <Monitor className="w-4 h-4" />}
                      <span>{t(`theme.${themeOption}`)}</span>
                      {theme === themeOption && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

