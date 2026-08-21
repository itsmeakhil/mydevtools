"use client";

import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import type { editor } from 'monaco-editor';
import { defineMdtThemes, mdtThemeName } from '@/lib/monaco-theme';

// Dynamically import Monaco — ~3 MB, only loads when a code editor is first rendered
const Editor = dynamic(
    () => import('@monaco-editor/react').then((m) => m.Editor),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground bg-muted/10">
                Loading editor...
            </div>
        ),
    }
);

interface CodeEditorProps {
    value: string;
    onChange?: (value: string) => void;
    language?: string;
    readOnly?: boolean;
    minimap?: boolean;
    onMount?: (editor: editor.IStandaloneCodeEditor) => void;
    beforeMount?: (monaco: typeof import('monaco-editor')) => void;
}

export default function CodeEditor({
    value,
    onChange,
    language = "json",
    readOnly = false,
    minimap = false,
    onMount,
    beforeMount,
}: CodeEditorProps) {
    const { resolvedTheme } = useTheme();

    return (
        <div className="h-full w-full border rounded-md overflow-hidden bg-card">
            <Editor
                height="100%"
                defaultLanguage={language}
                language={language}
                value={value}
                onChange={(newValue) => onChange?.(newValue || '')}
                beforeMount={(monaco) => {
                    defineMdtThemes(monaco);
                    beforeMount?.(monaco);
                }}
                onMount={onMount}
                theme={mdtThemeName(resolvedTheme)}
                options={{
                    minimap: { enabled: minimap },
                    fontSize: 13,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    readOnly,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    folding: true,
                    formatOnPaste: true,
                    formatOnType: true,
                    padding: { top: 10, bottom: 10 },
                }}
            />
        </div>
    );
}
