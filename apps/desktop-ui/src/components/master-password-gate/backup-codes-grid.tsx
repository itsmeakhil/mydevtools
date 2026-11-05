"use client"

import { useState } from "react"
import { CheckCircle2, Copy } from "lucide-react"

/**
 * Click-to-copy grid of freshly generated backup codes. Shared by the setup
 * gate and the settings regenerate card so both render codes identically.
 */
export function BackupCodesGrid({ codes }: { codes: string[] }) {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

    const copyCode = async (code: string, index: number) => {
        await navigator.clipboard.writeText(code)
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 1500)
    }

    return (
        <div className="grid grid-cols-2 gap-2">
            {codes.map((code, i) => (
                <button
                    key={i}
                    type="button"
                    onClick={() => copyCode(code, i)}
                    className="group flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 transition-colors duration-150 hover:bg-foreground/[0.05]"
                >
                    <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground/70">{i + 1}</span>
                    <span className="flex-1 text-left font-mono text-xs tracking-wide text-foreground">
                        {code}
                    </span>
                    {copiedIndex === i ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                    ) : (
                        <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                    )}
                </button>
            ))}
        </div>
    )
}
