import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { X, Plus, Trash2, HelpCircle, Search } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import WindowControls, { useWindowStyle } from "../ui/WindowControls";

interface GlobalVariable {
  id: string;
  key: string;
  value: string;
}

interface VariablesManagerProps {
  onClose: () => void;
  isStandaloneWindow?: boolean;
}

export default function VariablesManager({ onClose, isStandaloneWindow = false }: VariablesManagerProps) {
  const { t } = useTranslation();
  const { getWindowBorderRadius } = useWindowStyle();
  const [variables, setVariables] = useState<GlobalVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadVariables();
  }, []);

  const loadVariables = async () => {
    try {
      setLoading(true);
      const data = await invoke<GlobalVariable[]>("list_global_variables");
      setVariables(data);
    } catch (error) {
      console.error("Failed to load variables:", error);
      // If no variables exist yet, start with empty array
      setVariables([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariable = () => {
    const newVar: GlobalVariable = {
      id: Date.now().toString(),
      key: "",
      value: "",
    };
    setVariables([...variables, newVar]);
  };

  const handleUpdateVariable = (id: string, field: keyof GlobalVariable, value: string) => {
    setVariables(
      variables.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const handleDeleteVariable = (id: string) => {
    setVariables(variables.filter((v) => v.id !== id));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate
      for (const v of variables) {
        if (!v.key) {
          alert("Variable key cannot be empty");
          setSaving(false);
          return;
        }
      }

      // Check for duplicate keys
      const keys = variables.map((v) => v.key);
      const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
      if (duplicates.length > 0) {
        alert(`Duplicate variable keys: ${duplicates.join(", ")}`);
        setSaving(false);
        return;
      }

      await invoke("save_global_variables", { variables });

      // Close window after successful save
      if (isStandaloneWindow) {
        await handleClose();
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Failed to save variables:", error);
      alert("Failed to save: " + error);
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (isStandaloneWindow) {
      try {
        const window = getCurrentWindow();
        console.log("Closing variables window...");
        await window.close();
        console.log("Variables window closed successfully");
      } catch (error) {
        console.error("Failed to close variables window:", error);
      }
    } else {
      onClose();
    }
  };

  // Filter variables
  const filteredVariables = variables.filter((variable) =>
    variable.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get highlighted match positions
  const getMatchIndices = (text: string, query: string): [number, number] | null => {
    if (!query) return null;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return null;
    return [index, index + query.length];
  };

  return (
    <div className={isStandaloneWindow ? "w-full h-full" : "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"}>
      <div
        className={isStandaloneWindow ? `w-full h-full bg-card flex flex-col ${getWindowBorderRadius()} overflow-hidden` : "w-full max-w-[800px] h-[700px] bg-card border border-border rounded-lg shadow-2xl flex flex-col"}
      >
        {/* Header with window controls */}
        {isStandaloneWindow ? (
          <WindowControls title={t("variables.manager")} onClose={handleClose} />
        ) : (
          <div className="h-12 border-b border-border flex items-center justify-between px-6 bg-gradient-to-r from-card to-card/50 relative">
            <h2 className="text-lg font-semibold text-foreground">
              {t("variables.manager")}
            </h2>
            <button
              onClick={handleClose}
              className="absolute right-4 p-1.5 hover:bg-accent rounded transition-colors"
              title={t("actions.close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">{t("variables.loading")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2 gap-4">
                {/* 搜索框 */}
                <div className="flex-1 max-w-md relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("variables.searchPlaceholder", "搜索变量名...")}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-accent rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleAddVariable}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 shadow-sm flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  {t("variables.addVariable")}
                </button>
              </div>

              {/* 列表表头 */}
              <div className="grid grid-cols-[1fr_1fr_40px] gap-3 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                <div>{t("variables.variableKey")} *</div>
                <div>{t("variables.defaultValue")} *</div>
                <div></div>
              </div>

              {/* 变量列表 */}
              <div className="space-y-1">
                {filteredVariables.map((variable) => {
                  const matchIndices = getMatchIndices(variable.key, searchQuery);
                  return (
                    <div
                      key={variable.id}
                      className={`grid grid-cols-[1fr_1fr_40px] gap-3 px-3 py-2 rounded transition-colors group ${matchIndices
                        ? "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30"
                        : "hover:bg-accent/50"
                        }`}
                    >
                      <div className="relative">
                        {/* 背景高亮层 - 仅显示匹配的部分 */}
                        {matchIndices && (
                          <div className="absolute inset-0 px-2 py-1.5 text-sm font-mono pointer-events-none flex items-center">
                            <span className="invisible">{variable.key.slice(0, matchIndices[0])}</span>
                            <span className="bg-amber-400/40 dark:bg-amber-600/40 rounded px-0.5">
                              {variable.key.slice(matchIndices[0], matchIndices[1])}
                            </span>
                          </div>
                        )}
                        <input
                          type="text"
                          value={variable.key}
                          onChange={(e) =>
                            handleUpdateVariable(variable.id, "key", e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm bg-transparent border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring font-mono relative z-10"
                          placeholder="variable_name"
                        />
                      </div>
                      <input
                        type="text"
                        value={variable.value}
                        onChange={(e) =>
                          handleUpdateVariable(variable.id, "value", e.target.value)
                        }
                        className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder={t("variables.defaultValue")}
                      />
                      <button
                        onClick={() => handleDeleteVariable(variable.id)}
                        className="p-1.5 hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title={t("actions.delete", "Delete")}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  );
                })}

                {variables.length === 0 && (
                  <div className="text-center py-20">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {t("variables.noVariablesYet")}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                      {t("variables.noVariablesDesc")}
                    </p>
                    <button
                      onClick={handleAddVariable}
                      className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 shadow-sm"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      {t("variables.addFirstVariable")}
                    </button>
                  </div>
                )}

                {variables.length > 0 && filteredVariables.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      {t("variables.noResults", "没有找到匹配的变量")}
                    </p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-3 text-sm text-primary hover:underline"
                    >
                      {t("actions.clearSearch", "清除搜索")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-16 border-t border-border flex items-center justify-between px-6 bg-card/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs text-muted-foreground">
                {searchQuery
                  ? `${filteredVariables.length} / ${variables.length} variable(s)`
                  : `${variables.length} variable(s)`} • {t("variables.stored")} ~/.vibebase/app.db
              </span>
            </div>
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
              title={t("variables.help")}
            >
              <HelpCircle className="w-4 h-4" />
              {t("variables.help")}
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              {t("actions.cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 shadow-sm transition-colors"
            >
              {saving ? t("variables.saving") : t("variables.saveVariables")}
            </button>
          </div>
        </div>

        {/* Help Dialog */}
        {showHelp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-[600px] max-h-[90vh] bg-card border border-border rounded-lg shadow-xl flex flex-col">
              {/* Help Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
                <h3 className="text-lg font-semibold text-foreground">
                  {t("variables.helpTitle")}
                </h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-1 hover:bg-accent rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Help Content */}
              <div className="p-6 space-y-4 text-sm overflow-y-auto flex-1">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    {t("variables.helpWhatTitle")}
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("variables.helpWhatDesc")}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    {t("variables.helpDefineTitle")}
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>{t("variables.helpDefineStep1")}</li>
                    <li>{t("variables.helpDefineStep2")}<code className="px-1 py-0.5 bg-secondary rounded text-primary">company_name</code>)</li>
                    <li>{t("variables.helpDefineStep3")}<code className="px-1 py-0.5 bg-secondary rounded">Acme Corp</code>)</li>
                    <li>{t("variables.helpDefineStep4")}</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    {t("variables.helpUseTitle")}
                  </h4>
                  <p className="text-muted-foreground mb-2">
                    {t("variables.helpUseDesc")}
                  </p>
                  <div className="p-3 bg-secondary rounded font-mono text-xs">
                    <div className="text-muted-foreground mb-1"># Customer Email</div>
                    <div className="text-muted-foreground mb-2">## User Message</div>
                    <div>Company: <span className="text-primary">{`{{company_name}}`}</span></div>
                    <div>Customer: <span className="text-primary">{`{{customer_name}}`}</span></div>
                    <div className="mt-2 text-muted-foreground">Generate an email.</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    {t("variables.helpBehaviorTitle")}
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>
                      <code className="px-1 py-0.5 bg-secondary rounded text-primary">{`{{company_name}}`}</code>{" "}
                      → {t("variables.helpBehaviorItem1")} "Acme Corp"
                    </li>
                    <li>
                      <code className="px-1 py-0.5 bg-secondary rounded text-primary">{`{{customer_name}}`}</code>{" "}
                      → {t("variables.helpBehaviorItem2")}
                    </li>
                    <li>{t("variables.helpBehaviorItem3")}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    {t("variables.helpUseCasesTitle")}
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><strong>{t("variables.helpUseCasesCompany")}</strong> company_name, support_email, website</li>
                    <li><strong>{t("variables.helpUseCasesApi")}</strong> api_base_url, api_version</li>
                    <li><strong>{t("variables.helpUseCasesTest")}</strong> test_customer, test_order_id</li>
                    <li><strong>{t("variables.helpUseCasesConstants")}</strong> max_retries, timeout_seconds</li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong>{t("variables.helpProTip")}</strong> {t("variables.helpProTipDesc")}{" "}
                    <code className="px-1 py-0.5 bg-secondary rounded">~/.vibebase/app.db</code>{" "}
                    {t("variables.helpProTipDesc2")}
                  </p>
                </div>
              </div>

              {/* Help Footer */}
              <div className="px-6 py-4 border-t border-border flex justify-end flex-shrink-0">
                <button
                  onClick={() => setShowHelp(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary/90"
                >
                  {t("variables.helpGotIt")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

