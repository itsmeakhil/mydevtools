"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Eye, EyeOff } from "lucide-react"
import {
    useEnvironmentManagerStore,
    type EnvVariableRow,
} from "@/store/environment-manager-store"
import { useMasterKeyStore } from "@/store/master-key-store"
import { Badge } from "@/components/ui/badge"
import { EnvPasteCollapsible } from "@/components/environment-manager/env-paste-collapsible"
import { encryptData } from "@/lib/encryption"
import { auth } from "@/database/firebase"
import { createEnvSetEntry } from "@/lib/environment-manager-api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

type VarRow = EnvVariableRow & { _uid: string }

function emptyVariable(): VarRow {
    return { key: "", value: "", _uid: crypto.randomUUID() }
}

export function AddEnvironmentSetDialog({ children }: { children?: React.ReactNode }) {
    const t = useTranslations("EnvironmentManager.form")
    const { encryptionKey } = useMasterKeyStore()
    const { addSet } = useEnvironmentManagerStore()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showValues, setShowValues] = useState(false)
    const [project, setProject] = useState("")
    const [environment, setEnvironment] = useState("")
    const [variables, setVariables] = useState<VarRow[]>([emptyVariable()])
    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState("")
    const [notes, setNotes] = useState("")
    const [pasteOpen, setPasteOpen] = useState(false)
    const [pasteText, setPasteText] = useState("")
    const [pendingCommented, setPendingCommented] = useState<EnvVariableRow[]>([])
    const [plainCommentLines, setPlainCommentLines] = useState(0)

    const resetForm = () => {
        setProject("")
        setEnvironment("")
        setVariables([emptyVariable()])
        setTags([])
        setTagInput("")
        setNotes("")
        setPasteText("")
        setPasteOpen(false)
        setPendingCommented([])
        setPlainCommentLines(0)
        setShowValues(false)
    }

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            const tag = tagInput.trim()
            if (tag && !tags.includes(tag)) {
                setTags((prev) => [...prev, tag])
            }
            setTagInput("")
        }
    }

    const removeTag = (tag: string) => {
        setTags((prev) => prev.filter((x) => x !== tag))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!encryptionKey || !auth.currentUser) return
        const proj = project.trim()
        const env = environment.trim()
        if (!proj || !env) {
            toast.error(t("toastProjectEnvRequired"))
            return
        }

        const cleanedVars = variables
            .filter((r) => r.key.trim())
            .map(({ key, value }) => ({ key, value }))
        const payload = { project: proj, environment: env, variables: cleanedVars, tags, notes }

        setLoading(true)
        try {
            const dataToEncrypt = JSON.stringify(payload)
            const { encrypted, iv } = await encryptData(encryptionKey, dataToEncrypt)
            const timestamp = Date.now()
            const created = await createEnvSetEntry({
                encryptedData: encrypted,
                iv,
                createdAt: timestamp,
                updatedAt: timestamp,
            })
            addSet({
                id: created.id,
                ...payload,
                createdAt: timestamp,
                updatedAt: timestamp,
            })
            setOpen(false)
            resetForm()
            toast.success(t("toastSaved"))
        } catch (err) {
            console.error(err)
            toast.error(t("toastSaveFailed"))
        } finally {
            setLoading(false)
        }
    }

    const isMobile = useIsMobile()

    const FormContent = (
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="em-project">{t("project")}</Label>
                    <Input
                        id="em-project"
                        placeholder={t("placeholderProject")}
                        value={project}
                        onChange={(e) => setProject(e.target.value)}
                        required
                        autoFocus={!isMobile}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="em-env">{t("environment")}</Label>
                    <Input
                        id="em-env"
                        placeholder={t("placeholderEnvironment")}
                        value={environment}
                        onChange={(e) => setEnvironment(e.target.value)}
                        required
                    />
                </div>
            </div>

            <EnvPasteCollapsible
                pasteOpen={pasteOpen}
                onPasteOpenChange={setPasteOpen}
                pasteText={pasteText}
                onPasteTextChange={setPasteText}
                pendingCommented={pendingCommented}
                plainCommentLines={plainCommentLines}
                onPendingCommentedChange={setPendingCommented}
                onPlainCommentLinesChange={setPlainCommentLines}
                onMergeVariables={(incoming) =>
                    setVariables((prev) => {
                        const base = prev.filter((r) => r.key.trim() || r.value.trim())
                        const keyIndex = new Map(base.map((r, i) => [r.key, i]))
                        const result = [...base]
                        for (const row of incoming) {
                            const idx = keyIndex.get(row.key)
                            if (idx !== undefined) {
                                result[idx] = { ...row, _uid: result[idx]._uid }
                            } else {
                                keyIndex.set(row.key, result.length)
                                result.push({ ...row, _uid: crypto.randomUUID() })
                            }
                        }
                        return result.length > 0 ? result : [emptyVariable()]
                    })
                }
                t={t as (key: string, values?: Record<string, string | number | boolean | Date>) => string}
            />

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label>{t("variables")}</Label>
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => setShowValues((v) => !v)}
                        >
                            {showValues ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            {showValues ? t("hideValues") : t("showValues")}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => setVariables((v) => [...v, emptyVariable()])}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            {t("addRow")}
                        </Button>
                    </div>
                </div>
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {variables.map((row, i) => (
                        <div key={row._uid} className="flex gap-2 items-start">
                            <Input
                                placeholder={t("keyPlaceholder")}
                                value={row.key}
                                className="font-mono text-sm flex-1 min-w-0"
                                onChange={(e) => {
                                    const next = [...variables]
                                    next[i] = { ...next[i], key: e.target.value }
                                    setVariables(next)
                                }}
                            />
                            <Input
                                placeholder={t("valuePlaceholder")}
                                value={row.value}
                                type={showValues ? "text" : "password"}
                                className="font-mono text-sm flex-1 min-w-0"
                                onChange={(e) => {
                                    const next = [...variables]
                                    next[i] = { ...next[i], value: e.target.value }
                                    setVariables(next)
                                }}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0"
                                disabled={variables.length <= 1}
                                onClick={() => setVariables((v) => v.filter((_, j) => j !== i))}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="em-notes">{t("notesOptional")}</Label>
                <Textarea
                    id="em-notes"
                    placeholder={t("placeholderNotes")}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[72px]"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="em-tags">{t("tags")}</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                            {tag}
                            <span
                                role="button"
                                tabIndex={0}
                                className="cursor-pointer hover:text-destructive"
                                onClick={() => removeTag(tag)}
                                onKeyDown={(e) => e.key === "Enter" && removeTag(tag)}
                            >
                                ×
                            </span>
                        </Badge>
                    ))}
                </div>
                <Input
                    id="em-tags"
                    placeholder={t("placeholderTags")}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                {!isMobile && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setOpen(false)
                            resetForm()
                        }}
                    >
                        {t("cancel")}
                    </Button>
                )}
                <Button type="submit" disabled={loading} className={cn(isMobile && "w-full h-12 rounded-xl text-base")}>
                    {loading ? t("saving") : t("save")}
                </Button>
            </div>
        </form>
    )

    if (isMobile) {
        return (
            <Drawer
                open={open}
                onOpenChange={(o) => {
                    setOpen(o)
                    if (!o) resetForm()
                }}
            >
                <DrawerTrigger asChild>
                    {children ? (
                        children
                    ) : (
                        <Button
                            className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-2xl z-50 p-0 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                            size="icon"
                        >
                            <Plus className="h-7 w-7" />
                            <span className="sr-only">{t("addSrOnly")}</span>
                        </Button>
                    )}
                </DrawerTrigger>
                <DrawerContent className="max-h-[95vh]">
                    <div className="flex flex-col h-full max-h-[95vh]">
                        <DrawerHeader className="shrink-0 border-b pb-4">
                            <DrawerTitle className="text-xl">{t("addTitle")}</DrawerTitle>
                        </DrawerHeader>
                        <div className="flex-1 overflow-y-auto px-4 pb-8">{FormContent}</div>
                    </div>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                setOpen(o)
                if (!o) resetForm()
            }}
        >
            <DialogTrigger asChild>
                {children ? (
                    children
                ) : (
                    <Button className="shadow-lg hover:shadow-xl transition-all">
                        <Plus className="mr-2 h-4 w-4" /> {t("triggerAdd")}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">{t("addTitle")}</DialogTitle>
                </DialogHeader>
                {FormContent}
            </DialogContent>
        </Dialog>
    )
}
