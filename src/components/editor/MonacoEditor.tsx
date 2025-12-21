import { useEffect, useRef, useState } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import { useThemeStore } from "../../stores/themeStore";
import { editor, languages } from "monaco-editor";
import { invoke } from "@tauri-apps/api/tauri";

// Module-level flag to ensure completion provider is registered only once
let completionProviderRegistered = false;

interface MonacoEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  readOnly?: boolean;
}

export default function MonacoEditor({
  value,
  onChange,
  language = "yaml",
  readOnly = false,
}: MonacoEditorProps) {
  const { theme } = useThemeStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);

  // Get effective theme (resolve "system" to actual light/dark)
  const getEffectiveTheme = (): "light" | "dark" => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme as "light" | "dark";
  };

  // Use state to store current effective theme for reactive updates
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(getEffectiveTheme);

  // Determine Monaco theme based on effective theme
  const getMonacoTheme = () => {
    return effectiveTheme === "dark" ? "vs-dark" : "vs";
  };

  // Listen for theme changes and update effective theme state
  useEffect(() => {
    const newEffectiveTheme = getEffectiveTheme();
    setEffectiveTheme(newEffectiveTheme);
  }, [theme]);

  // Listen for system theme changes (when app theme is set to "system")
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      const newEffectiveTheme = getEffectiveTheme();
      setEffectiveTheme(newEffectiveTheme);
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [theme]);

  // Update Monaco editor when effective theme changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const monacoTheme = getMonacoTheme();
      editorRef.current.updateOptions({ theme: monacoTheme });
    }
  }, [effectiveTheme]);

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      // Highlight variables {{variable_name}}
      highlightVariables(editorRef.current, monacoRef.current);
    }
  }, [value]);

  // Clean up decorations when component unmounts
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          model.deltaDecorations(decorationsRef.current, []);
        }
      }
    };
  }, []);

  const handleEditorDidMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure custom theme for variable highlighting
    monaco.editor.defineTheme("vibebase-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "variable", foreground: "8b5cf6", fontStyle: "bold" },
      ],
      colors: {},
    });

    monaco.editor.defineTheme("vibebase-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "variable", foreground: "a78bfa", fontStyle: "bold" },
      ],
      colors: {},
    });

    // Apply correct theme immediately (fixes theme desync on first load)
    const monacoTheme = getMonacoTheme();
    editor.updateOptions({ theme: monacoTheme });

    // Register completion provider for global variables (only once globally)
    if (!completionProviderRegistered) {
      registerVariableCompletionProvider(monaco, language);
      completionProviderRegistered = true;
    }

    // Listen for content changes and auto-trigger completion when inside {{ }}
    let triggerTimeout: NodeJS.Timeout | null = null;
    editor.onDidChangeModelContent((e) => {
      // Clear previous timer
      if (triggerTimeout) {
        clearTimeout(triggerTimeout);
      }

      // Only trigger on user input (non-programmatic changes)
      if (!e.isFlush && e.changes.length > 0) {
        const position = editor.getPosition();
        if (!position) return;

        const model = editor.getModel();
        if (!model) return;

        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);
        const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
        const lastCloseBrace = textBeforeCursor.lastIndexOf('}}');

        // If cursor is inside {{ }}, trigger completion with delay (debounce)
        if (lastOpenBrace !== -1 && (lastCloseBrace === -1 || lastCloseBrace < lastOpenBrace)) {
          triggerTimeout = setTimeout(() => {
            editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
          }, 100);
        }
      }
    });

    highlightVariables(editor, monaco);
  };

  const registerVariableCompletionProvider = (monaco: Monaco, lang: string) => {
    // Register for both yaml and markdown
    const languages = ["yaml", "markdown"];

    languages.forEach((language) => {
      monaco.languages.registerCompletionItemProvider(language, {
        // Extended trigger characters including all letters and numbers
        triggerCharacters: [
          "{", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
          "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "_",
          "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
          "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
          "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"
        ],
        provideCompletionItems: async (model, position) => {
          const lineContent = model.getLineContent(position.lineNumber);
          const textBeforeCursor = lineContent.substring(0, position.column - 1);
          const textAfterCursor = lineContent.substring(position.column - 1);

          // Check if cursor is inside {{ }}
          // Find the position of the last {{
          const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
          const lastCloseBrace = textBeforeCursor.lastIndexOf('}}');

          // If the last {{ is after the last }} (or there's no }}), we're inside {{
          if (lastOpenBrace === -1 || (lastCloseBrace !== -1 && lastCloseBrace > lastOpenBrace)) {
            return { suggestions: [] };
          }

          // Extract content between {{ and cursor
          const partialInput = textBeforeCursor.substring(lastOpenBrace + 2);

          // Check if there's }} after cursor
          const hasClosingBraces = textAfterCursor.match(/^\s*\}\}/);

          // Find content from cursor to }} (for calculating replacement range)
          const afterMatch = textAfterCursor.match(/^([a-zA-Z0-9_]*)/);
          const textToReplace = afterMatch ? afterMatch[1] : '';

          try {
            // Get global variables
            const variables = await invoke<Array<{ id: string; key: string; value: string }>>(
              "list_global_variables"
            );

            // Filter variables based on input
            const filteredVariables = variables.filter((v) =>
              v.key.toLowerCase().includes(partialInput.toLowerCase())
            );

            const suggestions: languages.CompletionItem[] = filteredVariables.map((variable) => ({
              label: variable.key,
              kind: monaco.languages.CompletionItemKind.Variable,
              detail: `默认值: ${variable.value}`,
              documentation: `全局变量: ${variable.key}\n默认值: ${variable.value}`,
              insertText: hasClosingBraces ? variable.key : `${variable.key}}}`,
              filterText: variable.key,
              sortText: variable.key,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column - partialInput.length,
                endLineNumber: position.lineNumber,
                endColumn: position.column + textToReplace.length,
              },
            }));

            return { suggestions };
          } catch (error) {
            console.error("Failed to load global variables for completion:", error);
            return { suggestions: [] };
          }
        },
      });
    });
  };

  const highlightVariables = (
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) => {
    const model = editor.getModel();
    if (!model) return;

    const text = model.getValue();
    const regex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
    const decorations: editor.IModelDeltaDecoration[] = [];

    let match;
    while ((match = regex.exec(text)) !== null) {
      const startPos = model.getPositionAt(match.index);
      const endPos = model.getPositionAt(match.index + match[0].length);

      decorations.push({
        range: new monaco.Range(
          startPos.lineNumber,
          startPos.column,
          endPos.lineNumber,
          endPos.column
        ),
        options: {
          inlineClassName: "variable-highlight",
          hoverMessage: { value: `Variable: ${match[1]}` },
        },
      });
    }

    // 清除旧的装饰器并应用新的
    decorationsRef.current = model.deltaDecorations(decorationsRef.current, decorations);
  };

  return (
    <div className="h-full">
      <style>{`
        .variable-highlight {
          background-color: ${effectiveTheme === "dark" ? "rgba(167, 139, 250, 0.2)" : "rgba(139, 92, 246, 0.15)"
        };
          border-radius: 3px;
          font-weight: 600;
          color: ${effectiveTheme === "dark" ? "#a78bfa" : "#8b5cf6"};
        }
      `}</style>
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={onChange}
        theme={getMonacoTheme()}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          // 完全禁用自动触发的建议，只通过触发字符显示
          quickSuggestions: false,
          // 只在触发字符时显示建议
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnCommitCharacter: true,
          acceptSuggestionOnEnter: "on",
          // 禁用所有默认的自动补全
          wordBasedSuggestions: false,
          // 禁用代码片段
          snippetSuggestions: "none",
          // 手动触发建议时使用 Ctrl+Space
          suggest: {
            showWords: false,
            showSnippets: false,
          },
        }}
      />
    </div>
  );
}






