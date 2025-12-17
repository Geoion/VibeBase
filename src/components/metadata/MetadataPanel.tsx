import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useWorkspaceStore } from "../../stores/workspaceStore";

interface PromptMetadata {
  id: string;
  file_path: string;
  provider_ref: string;
  model_override?: string;
  parameters?: string;
  test_data_path?: string;
  tags?: string;
  variables?: string;
}

interface MetadataPanelProps {
  filePath: string;
}

export default function MetadataPanel({ filePath }: MetadataPanelProps) {
  const { t } = useTranslation();
  const { workspace } = useWorkspaceStore();
  const [metadata, setMetadata] = useState<PromptMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);

  // Form state
  const [providerRef, setProviderRef] = useState("");
  const [modelOverride, setModelOverride] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("");
  const [testDataPath, setTestDataPath] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 存储待保存的数据快照
  const pendingSaveDataRef = useRef<{
    workspacePath: string;
    filePath: string;
    providerRef: string;
    modelOverride: string;
    temperature: string;
    maxTokens: string;
    tags: string[];
    testDataPath: string;
  } | null>(null);
  // 使用 ref 来控制是否允许保存（同步更新，避免 React 状态延迟问题）
  const canSaveRef = useRef<boolean>(false);
  // 当前文件路径的 ref
  const currentFilePathRef = useRef<string>(filePath);

  // 组件挂载时和 filePath 变化时加载数据
  useEffect(() => {

    // 立即禁止保存（同步）
    canSaveRef.current = false;
    currentFilePathRef.current = filePath;

    // 立即清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // 在切换文件前，先保存上一个文件的数据
    const saveAndLoad = async () => {
      // 如果有待保存的数据，且文件路径不同，先保存
      const pendingData = pendingSaveDataRef.current;
      if (pendingData && pendingData.filePath !== filePath) {
        const parameters: Record<string, number> = {};
        if (pendingData.temperature) parameters.temperature = parseFloat(pendingData.temperature);
        if (pendingData.maxTokens) parameters.max_tokens = parseInt(pendingData.maxTokens);

        const metadataUpdate = {
          file_path: pendingData.filePath,
          provider_ref: pendingData.providerRef || "default",
          model_override: pendingData.modelOverride || null,
          parameters: Object.keys(parameters).length > 0 ? JSON.stringify(parameters) : null,
          tags: pendingData.tags.length > 0 ? JSON.stringify(pendingData.tags) : null,
          test_data_path: pendingData.testDataPath || null,
        };

        console.log("Saving previous file on switch:", metadataUpdate);
        try {
          await invoke("save_prompt_metadata", {
            workspacePath: pendingData.workspacePath,
            metadata: metadataUpdate,
          });
        } catch (err) {
          console.error("Failed to save on switch:", err);
        }
      }

      // 清空 pending 数据
      pendingSaveDataRef.current = null;

      // 加载新文件
      await loadMetadata();
      loadProviders();
    };

    saveAndLoad();
  }, [filePath, workspace?.path]);

  // 自动保存 - 当表单数据变化时
  useEffect(() => {
    // 使用 ref 检查是否允许保存（同步检查）
    if (!canSaveRef.current || !workspace?.path) return;

    const savedFilePath = currentFilePathRef.current;

    // 存储当前数据快照（用于切换文件时保存）
    pendingSaveDataRef.current = {
      workspacePath: workspace.path,
      filePath: savedFilePath,
      providerRef,
      modelOverride,
      temperature,
      maxTokens,
      tags,
      testDataPath,
    };

    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 延迟 500ms 后自动保存
    saveTimeoutRef.current = setTimeout(async () => {
      // 再次检查是否允许保存，以及文件是否匹配
      if (!canSaveRef.current || currentFilePathRef.current !== savedFilePath) {
        console.log("Skip auto-save: not allowed or file changed");
        return;
      }

      try {
        setSaving(true);

        // Build parameters JSON
        const parameters: Record<string, number> = {};
        if (temperature) parameters.temperature = parseFloat(temperature);
        if (maxTokens) parameters.max_tokens = parseInt(maxTokens);

        const metadataUpdate = {
          file_path: savedFilePath,
          provider_ref: providerRef || "default",
          model_override: modelOverride || null,
          parameters: Object.keys(parameters).length > 0 ? JSON.stringify(parameters) : null,
          tags: tags.length > 0 ? JSON.stringify(tags) : null,
          test_data_path: testDataPath || null,
        };

        await invoke("save_prompt_metadata", {
          workspacePath: workspace.path,
          metadata: metadataUpdate,
        });

        console.log("Metadata auto-saved:", metadataUpdate);
        // 保存成功后清空 pending
        if (pendingSaveDataRef.current?.filePath === savedFilePath) {
          pendingSaveDataRef.current = null;
        }
      } catch (error) {
        console.error("Failed to auto-save metadata:", error);
      } finally {
        setSaving(false);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [workspace?.path, providerRef, modelOverride, temperature, maxTokens, tags, testDataPath]);

  const loadMetadata = async () => {
    if (!workspace?.path) return;

    try {
      setLoading(true);
      const data = await invoke<PromptMetadata>("get_prompt_metadata", {
        workspacePath: workspace.path,
        filePath: filePath,
      });
      setMetadata(data);
      populateForm(data);
    } catch (error) {
      console.error("Failed to load metadata:", error);
      // Use default values on error
      setProviderRef("");
      setTags([]);
      setTemperature("0.7");
      setMaxTokens("");
      setModelOverride("");
      setTestDataPath("");
    } finally {
      setLoading(false);
      // 使用 setTimeout 确保 React 状态更新已完成，然后允许自动保存
      setTimeout(() => {
        if (currentFilePathRef.current === filePath) {
          canSaveRef.current = true;
        }
      }, 100);
    }
  };

  const loadProviders = async () => {
    try {
      const providerList = await invoke<any[]>("list_llm_providers");
      setProviders(providerList.map((p) => p.name));
    } catch (error) {
      console.error("Failed to load providers:", error);
    }
  };

  const populateForm = (data: PromptMetadata) => {
    setProviderRef(data.provider_ref || "");
    setModelOverride(data.model_override || "");

    // Parse parameters
    if (data.parameters) {
      try {
        const params = JSON.parse(data.parameters);
        setTemperature(params.temperature?.toString() || "0.7");
        setMaxTokens(params.max_tokens?.toString() || "");
      } catch (e) {
        console.error("Failed to parse parameters:", e);
        setTemperature("0.7");
        setMaxTokens("");
      }
    } else {
      setTemperature("0.7");
      setMaxTokens("");
    }

    // Parse tags
    if (data.tags) {
      try {
        setTags(JSON.parse(data.tags));
      } catch (e) {
        console.error("Failed to parse tags:", e);
        setTags([]);
      }
    } else {
      setTags([]);
    }

    setTestDataPath(data.test_data_path || "");
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">{t("metadata.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Tags */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">
            {t("metadata.tags")}
          </h4>

          {/* Tag input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="flex-1 px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={t("metadata.add_tag_placeholder")}
            />
            <button
              onClick={handleAddTag}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              {t("metadata.add_tag")}
            </button>
          </div>

          {/* Tags display */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-accent text-accent-foreground rounded border border-border"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* LLM Configuration */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">
            {t("metadata.llm_config")}
          </h4>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              {t("metadata.provider_ref")} *
            </label>
            <select
              value={providerRef}
              onChange={(e) => setProviderRef(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {providers.length === 0 ? (
                <option value="">{t("metadata.no_providers")}</option>
              ) : (
                providers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {t("metadata.provider_ref_desc")}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              {t("metadata.model_override")}
            </label>
            <input
              type="text"
              value={modelOverride}
              onChange={(e) => setModelOverride(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={t("metadata.model_override_placeholder")}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("metadata.model_override_desc")}
            </p>
          </div>
        </div>

        {/* Parameters */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">
            {t("metadata.parameters")}
          </h4>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t("metadata.temperature")}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t("metadata.max_tokens")}
              </label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={t("metadata.auto")}
              />
            </div>
          </div>
        </div>

        {/* Testing */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">
            {t("metadata.testing")}
          </h4>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              {t("metadata.test_data")}
            </label>
            <input
              type="text"
              value={testDataPath}
              onChange={(e) => setTestDataPath(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={t("metadata.test_data_placeholder")}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("metadata.test_data_desc")}
            </p>
          </div>
        </div>

        {/* Variables (Read-only) */}
        {metadata?.variables && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">
              {t("metadata.variables")}
            </h4>
            <div className="flex flex-wrap gap-1">
              {JSON.parse(metadata.variables).map((v: string) => (
                <span
                  key={v}
                  className="px-2 py-1 text-xs bg-primary/10 text-primary rounded border border-primary/20"
                >
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer - Auto save status */}
      <div className="px-4 py-2 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          {saving
            ? t("metadata.auto_saving", "自动保存中...")
            : t("metadata.auto_saved", "自动保存")}
        </p>
      </div>
    </div>
  );
}

