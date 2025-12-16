import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/api/dialog";
import { invoke } from "@tauri-apps/api/tauri";
import { useWorkspaceStore, Workspace } from "../stores/workspaceStore";
import { FolderOpen, Clock } from "lucide-react";
import { useState, useEffect } from "react";

interface RecentProject {
  id: string;
  path: string;
  name: string;
  last_opened: number;
  pinned: boolean;
}

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { setWorkspace } = useWorkspaceStore();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    loadRecentProjects();
  }, []);

  const loadRecentProjects = async () => {
    try {
      const projects = await invoke<RecentProject[]>("get_recent_projects", {
        limit: 5,
      });
      setRecentProjects(projects);
    } catch (error) {
      console.error("Failed to load recent projects:", error);
    }
  };

  const handleOpenWorkspace = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t("welcome.openWorkspace"),
      });

      if (selected && typeof selected === "string") {
        const workspace = await invoke<Workspace>("open_workspace", {
          path: selected,
        });
        setWorkspace(workspace);
      }
    } catch (error) {
      console.error("Failed to open workspace:", error);
    }
  };

  const handleOpenRecentProject = async (path: string) => {
    try {
      const workspace = await invoke<Workspace>("open_workspace", {
        path: path,
      });
      setWorkspace(workspace);
    } catch (error) {
      console.error("Failed to open recent project:", error);
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-background">
      <div className="text-center space-y-8 max-w-md px-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            {t("app.name")}
          </h1>
          <p className="text-lg text-muted-foreground">{t("app.slogan")}</p>
        </div>

        <button
          onClick={handleOpenWorkspace}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <FolderOpen className="w-5 h-5" />
          {t("welcome.openWorkspace")}
        </button>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div className="space-y-3 w-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{t("welcome.recentProjects")}</span>
            </div>
            <div className="space-y-2">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleOpenRecentProject(project.path)}
                  className="w-full px-4 py-3 text-left bg-card border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">
                    {project.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {project.path}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}






