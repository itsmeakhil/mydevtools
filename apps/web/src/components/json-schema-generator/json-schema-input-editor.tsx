'use client';

import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';

function MonacoLoading() {
  const t = useTranslations('JsonSchemaGenerator');
  return (
    <div className="flex h-full min-h-[180px] items-center justify-center text-sm text-muted-foreground">
      {t('editorLoading')}
    </div>
  );
}

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.Editor),
  { ssr: false, loading: MonacoLoading }
);

interface JsonSchemaInputEditorProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}

export function JsonSchemaInputEditor({
  value,
  onChange,
  ariaLabel,
}: JsonSchemaInputEditorProps) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === 'dark' ? 'vs-dark' : 'light';

  return (
    <div className="relative h-full min-h-[200px]">
      <MonacoEditor
        height="100%"
        className="absolute inset-0 min-h-[200px]"
        defaultLanguage="json"
        language="json"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        theme={theme}
        options={{
          ariaLabel,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          glyphMargin: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: false,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          folding: true,
          formatOnPaste: true,
          formatOnType: true,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'line',
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
        }}
      />
    </div>
  );
}
