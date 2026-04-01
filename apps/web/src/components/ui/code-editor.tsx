"use client";

import { Editor } from '@monaco-editor/react';
import { useTheme } from 'next-themes';

interface CodeEditorProps {
    value: string;
    onChange?: (value: string) => void;
    language?: string;
    readOnly?: boolean;
    minimap?: boolean;
}

export default function CodeEditor({
    value,
    onChange,
    language = "json",
    readOnly = false,
    minimap = false
}: CodeEditorProps) {
    const { theme } = useTheme();

    return (
        <div className="h-full w-full border rounded-md overflow-hidden bg-background">
            <Editor
                height="100%"
                defaultLanguage={language}
                language={language}
                value={value}
                onChange={(newValue) => onChange?.(newValue || '')}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
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
                loading={
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground bg-muted/10">
                        Loading editor...
                    </div>
                }
            />
        </div>
    );
}
