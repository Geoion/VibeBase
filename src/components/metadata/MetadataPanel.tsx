import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import AutoSaveIndicator from "../ui/AutoSaveIndicator";
import TagInput from "../ui/TagInput";

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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [providers, setProviders] = useState<string[]>([]);

  // Form state
  const [providerRef, setProviderRef] = useState("");
  const [modelOverride, setModelOverride] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("");
  const [testDataPath, setTestDataPath] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store pending save data snapshot
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
  // Use ref to control whether saving is allowed (synchronous update, avoid React state delay issues)
  const canSaveRef = useRef<boolean>(false);
  // Ref for current file path
  const currentFilePathRef = useRef<string>(filePath);

  // Load data when component mounts and when filePath changes
  useEffect(() => {
    // Immediately disable saving (synchronous)
    canSaveRef.current = false;
    currentFilePathRef.current = filePath;

    // Immediately clear previous timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Before switching files, save previous file's data first
    const saveAndLoad = async () => {
      // If there's pending data and file path is different, save first
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

      // Clear pending data
      pendingSaveDataRef.current = null;

      // Load new file
      await loadMetadata();
      loadProviders();
    };

    saveAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  // Auto-save - when form data changes
  useEffect(() => {
    // Use ref to check if saving is allowed (synchronous check)
    if (!canSaveRef.current || !workspace?.path) return;

    const savedFilePath = currentFilePathRef.current;

    // Store current data snapshot (for saving when switching files)
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

    // Clear previous timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Auto-save after 500ms delay
    saveTimeoutRef.current = setTimeout(async () => {
      // Check again if saving is allowed and if file matches
      if (!canSaveRef.current || currentFilePathRef.current !== savedFilePath) {
        console.log("Skip auto-save: not allowed or file changed");
        return;
      }

      try {
        setSaveStatus("saving");

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
        // Clear pending after successful save
        if (pendingSaveDataRef.current?.filePath === savedFilePath) {
          pendingSaveDataRef.current = null;
        }

        
        // Update save status
        setSaveStatus("saved");
        setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);
      } catch (error) {
        console.error("Failed to auto-save metadata:", error);
        setSaveStatus("idle");
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
      // Use setTimeout to ensure React state update is complete, then allow auto-save
      setTimeout(() => {
        if (currentFilePathRef.current === filePath) {
          canSaveRef.current = true;
        }
      }, 100);
    }
  };

  const loadProviders = async () => {
    try {
      const providerList = await invoke<Array<{ name: string }>>("list_llm_providers");
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


  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">{t("metadata.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Auto-save status indicator */}
      <AutoSaveIndicator status={saveStatus} />
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Tags with autocomplete */}
        <TagInput
          workspacePath={workspace?.path}
          tags={tags}
          onTagsChange={setTags}
        />

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
    </div>
  );
}

