import { useEffect } from "react";
import { useThemeStore } from "./stores/themeStore";
import { useWorkspaceStore } from "./stores/workspaceStore";
import MainLayout from "./components/layout/MainLayout";
import WelcomeScreen from "./components/WelcomeScreen";
import Header from "./components/layout/Header";

function App() {
  const { theme, initTheme } = useThemeStore();
  const { workspace } = useWorkspaceStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  if (!workspace) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1">
          <WelcomeScreen />
        </div>
      </div>
    );
  }

  return <MainLayout />;
}

export default App;






