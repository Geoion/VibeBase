import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/tauri";
import { Play, Loader2, AlertCircle } from "lucide-react";
import { useConfigStore, WorkspaceConfig } from "../../stores/configStore";

interface ExecutionPanelProps {
  variables: string[];
  promptContent: string;
}

interface ExecutionResult {
  id: string;
  output: string;
  metadata: {
    model: string;
    provider: string;
    latency_ms: number;
    tokens_input: number;
    tokens_output: number;
    cost_usd: number;
    timestamp: number;
  };
}

interface GlobalVariable {
  id: string;
  key: string;
  value: string;
}

export default function ExecutionPanel({
  variables,
  promptContent,
}: ExecutionPanelProps) {
  const { t } = useTranslation();
  const { config, currentEnvironment } = useConfigStore();
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {}
  );
  const [globalVariableKeys, setGlobalVariableKeys] = useState<Set<string>>(new Set());
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载全局变量并自动填充
  useEffect(() => {
    const loadGlobalVariables = async () => {
      try {
        const globalVars = await invoke<GlobalVariable[]>("list_global_variables");
        const newValues: Record<string, string> = { ...variableValues };
        const globalKeys = new Set<string>();

        // 为每个在全局变量中存在的变量自动填充默认值
        variables.forEach((varName) => {
          const globalVar = globalVars.find((v) => v.key === varName);
          if (globalVar) {
            globalKeys.add(varName);
            if (!variableValues[varName]) {
              newValues[varName] = globalVar.value;
            }
          }
        });

        setGlobalVariableKeys(globalKeys);
        setVariableValues(newValues);
      } catch (error) {
        console.error("Failed to load global variables:", error);
      }
    };

    if (variables.length > 0) {
      loadGlobalVariables();
    }
  }, [variables]);

  const handleExecute = async () => {
    if (!config || !currentEnvironment) {
      setError(t("execution.no_environment"));
      return;
    }

    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      // Get API key from keychain or environment variable
      const apiKey = await invoke<string>("get_api_key_for_environment", {
        config: config,
        environmentName: currentEnvironment,
      });

      const env = config.environments[currentEnvironment];

      const result = await invoke<ExecutionResult>("execute_prompt", {
        promptYaml: promptContent,
        variables: variableValues,
        apiKey: apiKey,
        baseUrl: env.base_url || null,
      });

      setResult(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  const canExecute =
    variables.every((v) => variableValues[v]) &&
    config &&
    currentEnvironment;

  return (
    <div className="h-full flex flex-col">
      {/* Variables Input */}
      <div className="p-4 space-y-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{t("execution.variables")}</h3>

        {variables.map((variable) => {
          const isGlobalVariable = globalVariableKeys.has(variable);
          return (
            <div key={variable} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <span>{variable}</span>
                {isGlobalVariable && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    {t("execution.global")}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={variableValues[variable] || ""}
                onChange={(e) =>
                  setVariableValues({
                    ...variableValues,
                    [variable]: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t("execution.enter_variable", { variable })}
              />
            </div>
          );
        })}

        {/* Environment Info */}
        {config && currentEnvironment && (
          <div className="p-3 bg-secondary rounded-md">
            <div className="text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">{t("execution.environment")}: </span>
                <span className="font-medium text-foreground">
                  {currentEnvironment}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("execution.provider")}: </span>
                <span className="font-medium text-foreground">
                  {config.environments[currentEnvironment].provider}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("execution.model")}: </span>
                <span className="font-medium text-foreground">
                  {config.environments[currentEnvironment].model}
                </span>
              </div>
            </div>
          </div>
        )}

        {!config && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="text-xs text-yellow-600 dark:text-yellow-400">
              <p className="font-medium">{t("execution.config_not_found")}</p>
              <p className="mt-1">
                {t("execution.config_not_found_desc")}
              </p>
            </div>
          </div>
        )}

        {/* Run Button */}
        <button
          onClick={handleExecute}
          disabled={!canExecute || isExecuting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("execution.executing")}
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {t("actions.run")}
            </>
          )}
        </button>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
            <p className="text-sm text-destructive font-medium">{t("execution.error")}</p>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Output */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                {t("execution.output")}
              </h4>
              <div className="p-3 bg-secondary rounded-md">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {result.output}
                </p>
              </div>
            </div>

            {/* Metadata */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                {t("execution.metadata")}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-secondary rounded">
                  <span className="text-muted-foreground">{t("execution.model")}:</span>
                  <span className="ml-1 text-foreground font-medium">
                    {result.metadata.model}
                  </span>
                </div>
                <div className="p-2 bg-secondary rounded">
                  <span className="text-muted-foreground">{t("execution.latency")}:</span>
                  <span className="ml-1 text-foreground font-medium">
                    {result.metadata.latency_ms}ms
                  </span>
                </div>
                <div className="p-2 bg-secondary rounded">
                  <span className="text-muted-foreground">{t("execution.tokens")}:</span>
                  <span className="ml-1 text-foreground font-medium">
                    {result.metadata.tokens_input} / {result.metadata.tokens_output}
                  </span>
                </div>
                <div className="p-2 bg-secondary rounded">
                  <span className="text-muted-foreground">{t("execution.cost")}:</span>
                  <span className="ml-1 text-foreground font-medium">
                    ${result.metadata.cost_usd.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!result && !error && !isExecuting && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground text-center">
              {variables.length > 0
                ? t("execution.fill_variables_hint")
                : t("execution.click_run_hint")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

