"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Pencil, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { renderMarkdown } from "@/lib/api-client/markdown"

/** Rendered-markdown typography — tokens only, no plugin. */
const MD_CLASS =
    "text-sm leading-relaxed text-foreground break-words " +
    "[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 " +
    "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 " +
    "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 " +
    "[&_code]:font-mono [&_code]:text-[0.9em] [&_code]:rounded [&_code]:bg-foreground/[0.06] [&_code]:px-1 " +
    "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-foreground/[0.04] [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
    "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground " +
    "[&_table]:my-2 [&_table]:text-xs [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left " +
    "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_hr]:my-4 [&_hr]:border-border"

interface DocsEditorProps {
    value: string | undefined
    onChange: (next: string) => void
}

/**
 * Markdown docs: read-only preview by default, explicit Edit to change. Rendered
 * HTML comes from `renderMarkdown` (raw HTML escaped, unsafe links dropped).
 */
export function DocsEditor({ value, onChange }: DocsEditorProps) {
    const t = useTranslations("ApiClient.docs")
    const [editing, setEditing] = React.useState(false)
    const html = React.useMemo(() => (editing ? "" : renderMarkdown(value)), [editing, value])

    if (editing) {
        return (
            <div className="flex h-full min-h-[200px] flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{t("markdownHint")}</span>
                    <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => setEditing(false)}>
                        <Check className="h-3.5 w-3.5" />
                        {t("done")}
                    </Button>
                </div>
                <Textarea
                    autoFocus
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setEditing(false) } }}
                    placeholder={t("placeholder")}
                    aria-label={t("editLabel")}
                    spellCheck
                    className="min-h-[200px] flex-1 resize-none font-mono text-[13px]"
                />
            </div>
        )
    }

    if (!html) {
        return (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-3 text-center">
                <p className="max-w-sm text-sm text-muted-foreground">{t("empty")}</p>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                    {t("add")}
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-end">
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                    {t("edit")}
                </Button>
            </div>
            {/* renderMarkdown escapes raw HTML and filters link schemes. */}
            <div className={MD_CLASS} dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    )
}
