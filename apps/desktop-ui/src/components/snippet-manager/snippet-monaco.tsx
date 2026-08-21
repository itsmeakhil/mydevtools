"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useMemo,
} from "react";
import type { editor as MEditor } from "monaco-editor";
import { useTranslations } from "next-intl";
import { defineMdtThemes, mdtThemeName } from "@/lib/monaco-theme";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.Editor),
  { ssr: false }
);

export type SnippetMonacoHandle = {
  formatDocument: () => Promise<void>;
};

type Props = {
  value: string;
  onChange?: (value: string) => void;
  language: string;
  readOnly?: boolean;
  "aria-label": string;
};

function SnippetMonacoLoading() {
  const t = useTranslations("SnippetManager");
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
      {t("editorLoading")}
    </div>
  );
}

export const SnippetMonaco = forwardRef<SnippetMonacoHandle, Props>(
  function SnippetMonacoInner(
    { value, onChange, language, readOnly = false, "aria-label": ariaLabel },
    ref
  ) {
    const { resolvedTheme } = useTheme();
    const theme = mdtThemeName(resolvedTheme);
    const editorRef = useRef<MEditor.IStandaloneCodeEditor | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        formatDocument: async () => {
          const ed = editorRef.current;
          if (!ed) return;
          const action = ed.getAction("editor.action.formatDocument");
          if (action?.isSupported?.()) {
            await action.run();
            return;
          }
        },
      }),
      []
    );

    const onMount = useCallback((ed: MEditor.IStandaloneCodeEditor) => {
      editorRef.current = ed;
    }, []);

    const options = useMemo(
      () =>
        ({
          ariaLabel,
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineHeight: 22,
          lineNumbers: "on",
          glyphMargin: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,
          wordWrap: "on",
          wrappingIndent: "indent",
          folding: true,
          foldingHighlight: true,
          formatOnPaste: !readOnly,
          formatOnType: !readOnly,
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: readOnly ? "none" : "line",
          bracketPairColorization: { enabled: true },
          renderWhitespace: readOnly ? "none" : "selection",
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            useShadows: false,
          },
          domReadOnly: readOnly,
          overviewRulerLanes: 0,
        }) satisfies MEditor.IStandaloneEditorConstructionOptions,
      [ariaLabel, readOnly]
    );

    return (
      <div className="relative h-full min-h-[320px] w-full overflow-hidden bg-card">
        <MonacoEditor
          loading={<SnippetMonacoLoading />}
          height="100%"
          className="absolute inset-0 min-h-[320px]"
          language={language}
          theme={theme}
          value={value}
          onChange={(v) => onChange?.(v ?? "")}
          beforeMount={(monaco) => defineMdtThemes(monaco)}
          onMount={onMount}
          options={options}
        />
      </div>
    );
  }
);
SnippetMonaco.displayName = "SnippetMonaco";
