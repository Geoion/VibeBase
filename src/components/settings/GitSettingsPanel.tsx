import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Palette, Languages } from "lucide-react";
import { invoke } from "@tauri-apps/api/tauri";

interface EnabledModel {
  id: string;              // provider_name::model_id
  model_id: string;
  model_name: string;      // Display name
  provider_name: string;   // Provider configuration name
  provider_type: string;   // Provider type
}

export default function GitSettingsPanel() {
  const { t, i18n } = useTranslation();
  
  const [commitMessageModel, setCommitMessageModel] = useState("");
  const [commitMessageStyle, setCommitMessageStyle] = useState("conventional");
  const [commitMessageLanguage, setCommitMessageLanguage] = useState("");
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
      
      setCommitMessageModel(model);
      setCommitMessageStyle(style);
      setCommitMessageLanguage(language || "auto");
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

  const handleModelChange = async (value: string) => {
    setCommitMessageModel(value);
    try {
      await invoke("save_app_setting", { key: "git.commit_message_model", value });
    } catch (error) {
      console.error("Failed to save model setting:", error);
    }
  };

  const handleStyleChange = async (value: string) => {
    setCommitMessageStyle(value);
    try {
      await invoke("save_app_setting", { key: "git.commit_message_style", value });
    } catch (error) {
      console.error("Failed to save style setting:", error);
    }
  };

  const handleLanguageChange = async (value: string) => {
    setCommitMessageLanguage(value);
    try {
      await invoke("save_app_setting", { key: "git.commit_message_language", value });
    } catch (error) {
      console.error("Failed to save language setting:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-8 max-w-3xl mx-auto w-full space-y-8">
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
                  Select the LLM model to use for generating commit messages
                </p>
              </div>
            </div>
            <select
              value={commitMessageModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="px-3 py-2 bg-secondary rounded-lg border border-border text-sm min-w-[240px]"
            >
              <option value="">Select a model...</option>
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
                  Choose the format style for generated commit messages
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
                  Language for generated commit messages (can be different from app language)
                </p>
              </div>
            </div>
            <select
              value={commitMessageLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-2 bg-secondary rounded-lg border border-border text-sm min-w-[240px]"
            >
              <option value="auto">{t("git.languageFollowApp")}</option>
              <option value="zh-Hans">简体中文</option>
              <option value="zh-Hant">繁體中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">💡 {t("settings.general.about")}</h3>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• When you click "AI Generate" in the commit dialog, it uses the model configured here</li>
            <li>• The AI analyzes your git diff and generates an appropriate commit message</li>
            <li>• You can edit the generated message before committing</li>
            <li>• Make sure to configure your LLM providers in the Providers tab first</li>
            <li>• You can choose a different language for commit messages than your app interface</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
