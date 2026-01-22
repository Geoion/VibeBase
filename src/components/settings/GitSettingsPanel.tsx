import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Palette, Languages, Clock } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface EnabledModel {
  id: string;              // provider_name::model_id
  model_id: string;
  model_name: string;      // Display name
  provider_name: string;   // Provider configuration name
  provider_type: string;   // Provider type
}

interface GitSettingsPanelProps {
  onSaveStatusChange?: (status: "saving" | "saved") => void;
}

export default function GitSettingsPanel({ onSaveStatusChange }: GitSettingsPanelProps) {
  const { t } = useTranslation();
  
  const [commitMessageModel, setCommitMessageModel] = useState("");
  const [commitMessageStyle, setCommitMessageStyle] = useState("conventional");
  const [commitMessageLanguage, setCommitMessageLanguage] = useState("");
  const [operationTimeout, setOperationTimeout] = useState("30");
  const [models, setModels] = useState<EnabledModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    loadModels();
  }, []);

  const loadSettings = async () => {
    try {
      const model = await invoke<string>("get_app_setting", { key: "git.commit_message_model" }).catch(() => "");
      const style = await invoke<string>("get_app_setting", { key: "git.commit_message_style" }).catch(() => "conventional");
      const language = await invoke<string>("get_app_setting", { key: "git.commit_message_language" }).catch(() => "auto");
      const timeout = await invoke<string>("get_app_setting", { key: "git.operation_timeout_seconds" }).catch(() => "30");
      
      setCommitMessageModel(model);
      setCommitMessageStyle(style);
      setCommitMessageLanguage(language || "auto");
      setOperationTimeout(timeout || "30");
    } catch (error) {
      console.error("Failed to load Git settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const modelList = await invoke<EnabledModel[]>("list_enabled_models");
      setModels(modelList);
    } catch (error) {
      console.error("Failed to load models:", error);
    }
  };

  const showSaveStatus = () => {
    onSaveStatusChange?.("saving");
    setTimeout(() => {
      onSaveStatusChange?.("saved");
    }, 300);
  };

  const handleModelChange = async (value: string) => {
    setCommitMessageModel(value);
    try {
      await invoke("save_app_setting", { key: "git.commit_message_model", value });
      showSaveStatus();
    } catch (error) {
      console.error("Failed to save model setting:", error);
    }
  };

  const handleStyleChange = async (value: string) => {
    setCommitMessageStyle(value);
    try {
      await invoke("save_app_setting", { key: "git.commit_message_style", value });
      showSaveStatus();
    } catch (error) {
      console.error("Failed to save style setting:", error);
    }
  };

  const handleLanguageChange = async (value: string) => {
    setCommitMessageLanguage(value);
    try {
      await invoke("save_app_setting", { key: "git.commit_message_language", value });
      showSaveStatus();
    } catch (error) {
      console.error("Failed to save language setting:", error);
    }
  };

  const handleTimeoutChange = async (value: string) => {
    // 验证输入是否为有效数字
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 5 || numValue > 300) {
      return; // 忽略无效输入
    }
    
    setOperationTimeout(value);
    try {
      await invoke("save_app_setting", { key: "git.operation_timeout_seconds", value });
      showSaveStatus();
    } catch (error) {
      console.error("Failed to save timeout setting:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">{t("providers.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-8 max-w-3xl mx-auto w-full space-y-8 relative">
      <div>
        <h3 className="text-lg font-semibold mb-6">{t("git.commitMessageSettings")}</h3>

        <div className="space-y-6">
          {/* Default Model */}
          <div className="flex items-start justify-between py-4 border-b border-border">
            <div className="flex items-start gap-3 flex-1">
              <Sparkles className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div>
                <h4 className="font-medium">{t("git.defaultModel")}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("about.selectModel")}
                </p>
              </div>
            </div>
            <select
              value={commitMessageModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="px-3 py-2 bg-secondary rounded-lg border border-border text-sm min-w-[240px]"
            >
              <option value="">{t("about.selectModel")}</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.provider_name} - {model.model_name}
                </option>
              ))}
            </select>
          </div>

          {/* Generation Style */}
          <div className="flex items-start justify-between py-4 border-b border-border">
            <div className="flex items-start gap-3 flex-1">
              <Palette className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div>
                <h4 className="font-medium">{t("git.generationStyle")}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("about.chooseFormatStyle")}
                </p>
              </div>
            </div>
            <select
              value={commitMessageStyle}
              onChange={(e) => handleStyleChange(e.target.value)}
              className="px-3 py-2 bg-secondary rounded-lg border border-border text-sm min-w-[240px]"
            >
              <option value="conventional">{t("git.styleConventional")}</option>
              <option value="detailed">{t("git.styleDetailed")}</option>
              <option value="concise">{t("git.styleConcise")}</option>
            </select>
          </div>

          {/* Generation Language */}
          <div className="flex items-start justify-between py-4 border-b border-border">
            <div className="flex items-start gap-3 flex-1">
              <Languages className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div>
                <h4 className="font-medium">{t("git.generationLanguage")}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("about.commitLanguageHint")}
                </p>
              </div>
            </div>
            <select
              value={commitMessageLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-2 bg-secondary rounded-lg border border-border text-sm min-w-[240px]"
            >
              <option value="auto">{t("git.languageFollowApp")}</option>
              <option value="zh-Hans">{t("language.zh-Hans")}</option>
              <option value="zh-Hant">{t("language.zh-Hant")}</option>
              <option value="en-US">{t("language.en-US")}</option>
            </select>
          </div>

          {/* Operation Timeout */}
          <div className="flex items-start justify-between py-4 border-b border-border">
            <div className="flex items-start gap-3 flex-1">
              <Clock className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div>
                <h4 className="font-medium">{t("git.operationTimeout")}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("git.operationTimeoutDescription")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="5"
                max="300"
                value={operationTimeout}
                onChange={(e) => handleTimeoutChange(e.target.value)}
                className="px-3 py-2 bg-secondary rounded-lg border border-border text-sm w-24 text-right"
              />
              <span className="text-sm text-muted-foreground">{t("git.seconds")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">💡 {t("about.generalAbout")}</h3>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• {t("about.gitSettingsInfo1")}</li>
            <li>• {t("about.gitSettingsInfo2")}</li>
            <li>• {t("about.gitSettingsInfo3")}</li>
            <li>• {t("about.gitSettingsInfo4")}</li>
            <li>• {t("about.gitSettingsInfo5")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
