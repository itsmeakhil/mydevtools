"use client"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
import type { EnvVariableRow } from "@/store/environment-manager-store"
import {
    isValidEnvPasteText,
    mergeEnvVariableRows,
    parseDotEnvDetailed,
} from "@/lib/environment-manager-utils"
import { toast } from "sonner"

type EnvPasteCollapsibleProps = {
    pasteOpen: boolean
    onPasteOpenChange: (open: boolean) => void
    pasteText: string
    onPasteTextChange: (value: string) => void
    pendingCommented: EnvVariableRow[]
    plainCommentLines: number
    onPendingCommentedChange: (rows: EnvVariableRow[]) => void
    onPlainCommentLinesChange: (n: number) => void
    onMergeVariables: (incoming: EnvVariableRow[]) => void
    t: (key: string, values?: Record<string, string | number | boolean | Date>) => string
}

export function EnvPasteCollapsible({
    pasteOpen,
    onPasteOpenChange,
    pasteText,
    onPasteTextChange,
    pendingCommented,
    plainCommentLines,
    onPendingCommentedChange,
    onPlainCommentLinesChange,
    onMergeVariables,
    t,
}: EnvPasteCollapsibleProps) {
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const text = e.clipboardData.getData("text/plain")
        if (!isValidEnvPasteText(text)) {
            return
        }
        e.preventDefault()
        const d = parseDotEnvDetailed(text)
        onPendingCommentedChange(d.commentedEnv)
        onPlainCommentLinesChange(d.plainCommentLines)
        onPasteTextChange("")

        if (d.active.length > 0) {
            onMergeVariables(d.active)
            toast.success(t("toastPasteAutoMerged", { count: d.active.length }))
        } else {
            toast.info(t("toastPasteCommentedOnly"))
        }
    }

    const addCommentedVariables = () => {
        if (pendingCommented.length === 0) return
        onMergeVariables(pendingCommented)
        toast.success(t("toastCommentedAdded", { count: pendingCommented.length }))
        onPendingCommentedChange([])
    }

    const showWarning = pendingCommented.length > 0 || plainCommentLines > 0

    return (
        <Collapsible open={pasteOpen} onOpenChange={onPasteOpenChange}>
            <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="w-full justify-between">
                    <span>{t("pasteEnvLabel")}</span>
                    {pasteOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground">{t("pasteEnvHint")}</p>
                <Textarea
                    placeholder={t("pasteEnvPlaceholder")}
                    value={pasteText}
                    onChange={(e) => onPasteTextChange(e.target.value)}
                    onPaste={handlePaste}
                    className="min-h-[120px] font-mono text-sm"
                />
                {showWarning && (
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <div>
                            <AlertTitle>{t("pasteSkippedTitle")}</AlertTitle>
                            <AlertDescription className="space-y-2">
                                {pendingCommented.length > 0 && (
                                    <p>{t("pasteCommentedSkipped", { count: pendingCommented.length })}</p>
                                )}
                                {plainCommentLines > 0 && (
                                    <p>{t("pastePlainCommentsSkipped", { count: plainCommentLines })}</p>
                                )}
                                {pendingCommented.length > 0 && (
                                    <Button type="button" variant="secondary" size="sm" onClick={addCommentedVariables}>
                                        {t("addCommentedVariables")}
                                    </Button>
                                )}
                            </AlertDescription>
                        </div>
                    </Alert>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}
