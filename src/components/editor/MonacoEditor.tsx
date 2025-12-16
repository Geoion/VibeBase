import { useEffect, useRef } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import { useThemeStore } from "../../stores/themeStore";
import { editor, languages } from "monaco-editor";
import { invoke } from "@tauri-apps/api/tauri";

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

  // Determine Monaco theme based on app theme
  const getMonacoTheme = () => {
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      return systemTheme === "dark" ? "vs-dark" : "vs";
    }
    return theme === "dark" ? "vs-dark" : "vs";
  };

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      // Highlight variables {{variable_name}}
      highlightVariables(editorRef.current, monacoRef.current);
    }
  }, [value]);

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

    // Register completion provider for global variables
    registerVariableCompletionProvider(monaco, language);

    // 监听内容变化，在 {{ }} 内部时自动触发补全
    let triggerTimeout: NodeJS.Timeout | null = null;
    editor.onDidChangeModelContent((e) => {
      // 清除之前的定时器
      if (triggerTimeout) {
        clearTimeout(triggerTimeout);
      }

      // 只在用户输入（非程序化修改）时触发
      if (!e.isFlush && e.changes.length > 0) {
        const position = editor.getPosition();
        if (!position) return;

        const model = editor.getModel();
        if (!model) return;

        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);
        const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
        const lastCloseBrace = textBeforeCursor.lastIndexOf('}}');

        // 如果光标在 {{ }} 内部，延迟触发补全（防抖）
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
        // 扩展触发字符，包括所有字母和数字
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

          // 检查光标是否在 {{ }} 内部
          // 查找最后一个 {{ 的位置
          const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
          const lastCloseBrace = textBeforeCursor.lastIndexOf('}}');

          // 如果最后一个 {{ 在最后一个 }} 之后（或没有 }}），说明我们在 {{ 内部
          if (lastOpenBrace === -1 || (lastCloseBrace !== -1 && lastCloseBrace > lastOpenBrace)) {
            return { suggestions: [] };
          }

          // 提取 {{ 和光标之间的内容
          const partialInput = textBeforeCursor.substring(lastOpenBrace + 2);

          // 检查光标后面是否有 }}
          const hasClosingBraces = textAfterCursor.match(/^\s*\}\}/);

          // 查找光标后面到 }} 之间的内容（用于计算替换范围）
          const afterMatch = textAfterCursor.match(/^([a-zA-Z0-9_]*)/);
          const textToReplace = afterMatch ? afterMatch[1] : '';

          try {
            // 获取全局变量
            const variables = await invoke<Array<{ id: string; key: string; value: string }>>(
              "list_global_variables"
            );

            // 根据输入过滤变量
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

    editor.createDecorationsCollection(decorations);
  };

  return (
    <div className="h-full">
      <style>{`
        .variable-highlight {
          background-color: ${theme === "dark" ? "rgba(167, 139, 250, 0.2)" : "rgba(139, 92, 246, 0.15)"
        };
          border-radius: 3px;
          font-weight: 600;
          color: ${theme === "dark" ? "#a78bfa" : "#8b5cf6"};
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






