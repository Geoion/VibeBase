import { useState } from "react";
import { useConfigStore } from "../../stores/configStore";
import { ChevronDown, Settings } from "lucide-react";

export default function EnvironmentSelector() {
  const { config, currentEnvironment, setCurrentEnvironment } = useConfigStore();
  const [showMenu, setShowMenu] = useState(false);

  if (!config) return null;

  const envEntries = Object.entries(config.environments);
  const currentEnv = currentEnvironment
    ? config.environments[currentEnvironment]
    : null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-sm"
      >
        <Settings className="w-3 h-3" />
        <span className="font-medium">
          {currentEnvironment || "Select Environment"}
        </span>
        {currentEnv && (
          <span className="text-xs text-muted-foreground">
            ({currentEnv.provider_ref || `${currentEnv.provider}/${currentEnv.model}`})
          </span>
        )}
        <ChevronDown className="w-3 h-3" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute left-0 mt-2 w-80 bg-popover border border-border rounded-md shadow-lg z-20">
            <div className="py-1">
              {envEntries.map(([name, env]) => (
                <button
                  key={name}
                  onClick={() => {
                    setCurrentEnvironment(name);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {env.name || name}
                    </span>
                    {currentEnvironment === name && (
                      <span className="text-primary">✓</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {env.provider_ref ? (
                      <>📎 {env.provider_ref}</>
                    ) : (
                      <>{env.provider} / {env.model}</>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}






