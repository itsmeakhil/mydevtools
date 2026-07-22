"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { IconCopy } from "@tabler/icons-react";
import Editor from "@/components/lazy/LazyMonaco";
import { useTheme } from "next-themes";
import { CODEGEN_LANGS, CodegenLang, generateCode } from "@/lib/nosql-codegen";

// Monaco language id per target (shell/node are JS).
const MONACO_LANG: Record<CodegenLang, string> = {
    shell: "javascript",
    node: "javascript",
    python: "python",
    java: "java",
    csharp: "csharp",
    php: "php",
    ruby: "ruby",
    go: "go",
};

export function CodegenDialog({
    db,
    collection,
    kind,
    body,
    open,
    onClose,
}: {
    db: string;
    collection: string;
    kind: "find" | "aggregate";
    body: string;
    open: boolean;
    onClose: () => void;
}) {
    const [lang, setLang] = useState<CodegenLang>("node");
    const { theme } = useTheme();
    const { copyToClipboard } = useCopyToClipboard();

    const code = useMemo(() => {
        try {
            return generateCode(lang, { db, collection, kind, body });
        } catch (e: any) {
            return `// ${e.message || "Invalid query"}`;
        }
    }, [lang, db, collection, kind, body]);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-3xl h-[75vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm font-medium">Generate query code</DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/20 overflow-x-auto no-scrollbar">
                    {CODEGEN_LANGS.map((l) => (
                        <button
                            key={l.id}
                            onClick={() => setLang(l.id)}
                            className={cn(
                                "px-2.5 py-1 rounded-sm text-xs font-medium whitespace-nowrap transition-colors",
                                lang === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted",
                            )}
                        >
                            {l.label}
                        </button>
                    ))}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs ml-auto shrink-0"
                        onClick={() => void copyToClipboard(code, "Code copied")}
                    >
                        <IconCopy className="h-3.5 w-3.5 mr-1.5" />
                        Copy
                    </Button>
                </div>
                <div className="flex-1 min-h-0">
                    <Editor
                        height="100%"
                        language={MONACO_LANG[lang]}
                        value={code}
                        theme={theme === "dark" ? "vs-dark" : "light"}
                        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, automaticLayout: true, wordWrap: "on" }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
