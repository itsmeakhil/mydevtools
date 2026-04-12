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
    const theme = resolvedTheme === "dark" ? "vs-dark" : "light";
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
          fontSize: 13,
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
          formatOnPaste: !readOnly,
          formatOnType: !readOnly,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: readOnly ? "none" : "line",
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          domReadOnly: readOnly,
        }) satisfies MEditor.IStandaloneEditorConstructionOptions,
      [ariaLabel, readOnly]
    );

    return (
      <div className="relative h-full min-h-[240px] w-full overflow-hidden rounded-lg border border-border/60">
        <MonacoEditor
          loading={<SnippetMonacoLoading />}
          height="100%"
          className="absolute inset-0 min-h-[240px]"
          language={language}
          theme={theme}
          value={value}
          onChange={(v) => onChange?.(v ?? "")}
          onMount={onMount}
          options={options}
        />
      </div>
    );
  }
);
SnippetMonaco.displayName = "SnippetMonaco";
