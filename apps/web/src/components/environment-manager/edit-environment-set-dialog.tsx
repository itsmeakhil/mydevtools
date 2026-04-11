"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import {
    useEnvironmentManagerStore,
    type EnvSetEntry,
    type EnvVariableRow,
} from "@/store/environment-manager-store"
import { useMasterKeyStore } from "@/store/master-key-store"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { encryptData } from "@/lib/encryption"
import { auth } from "@/database/firebase"
import { updateEnvSetEntry } from "@/lib/environment-manager-api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { parseDotEnvBlock } from "@/lib/environment-manager-utils"

function emptyVariable(): EnvVariableRow {
    return { key: "", value: "" }
}

type EditEnvironmentSetDialogProps = {
    entry: EnvSetEntry | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditEnvironmentSetDialog({ entry, open, onOpenChange }: EditEnvironmentSetDialogProps) {
    const t = useTranslations("EnvironmentManager.form")
    const { encryptionKey } = useMasterKeyStore()
    const { updateSet } = useEnvironmentManagerStore()
    const [loading, setLoading] = useState(false)
    const [project, setProject] = useState("")
    const [environment, setEnvironment] = useState("")
    const [variables, setVariables] = useState<EnvVariableRow[]>([emptyVariable()])
    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState("")
    const [notes, setNotes] = useState("")
    const [pasteOpen, setPasteOpen] = useState(false)
    const [pasteText, setPasteText] = useState("")

    useEffect(() => {
        if (!entry || !open) return
        setProject(entry.project)
        setEnvironment(entry.environment)
        setVariables(entry.variables.length ? [...entry.variables] : [emptyVariable()])
        setTags([...entry.tags])
        setNotes(entry.notes)
        setTagInput("")
        setPasteText("")
        setPasteOpen(false)
    }, [entry, open])

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

    const applyPaste = () => {
        const parsed = parseDotEnvBlock(pasteText)
        if (parsed.length === 0) {
            toast.error(t("toastPasteEmpty"))
            return
        }
        setVariables((prev) => {
            const base = prev.filter((r) => r.key.trim() || r.value.trim())
            const merged = [...base, ...parsed]
            return merged.length ? merged : [emptyVariable()]
        })
        setPasteText("")
        toast.success(t("toastPasteApplied", { count: parsed.length }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!encryptionKey || !auth.currentUser || !entry) return
        const proj = project.trim()
        const env = environment.trim()
        if (!proj || !env) {
            toast.error(t("toastProjectEnvRequired"))
            return
        }

        const cleanedVars = variables.filter((r) => r.key.trim())
        const payload = { project: proj, environment: env, variables: cleanedVars, tags, notes }

        setLoading(true)
        try {
            const dataToEncrypt = JSON.stringify(payload)
            const { encrypted, iv } = await encryptData(encryptionKey, dataToEncrypt)
            const timestamp = Date.now()
            await updateEnvSetEntry(entry.id, {
                encryptedData: encrypted,
                iv,
                updatedAt: timestamp,
            })
            updateSet({
                id: entry.id,
                ...payload,
                createdAt: entry.createdAt,
                updatedAt: timestamp,
            })
            onOpenChange(false)
            toast.success(t("toastUpdated"))
        } catch (err) {
            console.error(err)
            toast.error(t("toastUpdateFailed"))
        } finally {
            setLoading(false)
        }
    }

    const isMobile = useIsMobile()

    const FormContent = (
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="em-edit-project">{t("project")}</Label>
                    <Input
                        id="em-edit-project"
                        value={project}
                        onChange={(e) => setProject(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="em-edit-env">{t("environment")}</Label>
                    <Input
                        id="em-edit-env"
                        value={environment}
                        onChange={(e) => setEnvironment(e.target.value)}
                        required
                    />
                </div>
            </div>

            <Collapsible open={pasteOpen} onOpenChange={setPasteOpen}>
                <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="w-full justify-between">
                        <span>{t("pasteEnvLabel")}</span>
                        {pasteOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                    <Textarea
                        placeholder={t("pasteEnvPlaceholder")}
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        className="min-h-[120px] font-mono text-sm"
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={applyPaste}>
                        {t("applyPaste")}
                    </Button>
                </CollapsibleContent>
            </Collapsible>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label>{t("variables")}</Label>
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
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {variables.map((row, i) => (
                        <div key={i} className="flex gap-2 items-start">
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
                                type="password"
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
                <Label htmlFor="em-edit-notes">{t("notesOptional")}</Label>
                <Textarea
                    id="em-edit-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[72px]"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="em-edit-tags">{t("tags")}</Label>
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
                    id="em-edit-tags"
                    placeholder={t("placeholderTags")}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                {!isMobile && (
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        {t("cancel")}
                    </Button>
                )}
                <Button type="submit" disabled={loading} className={cn(isMobile && "w-full h-12 rounded-xl text-base")}>
                    {loading ? t("updating") : t("update")}
                </Button>
            </div>
        </form>
    )

    if (!entry) return null

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="max-h-[95vh]">
                    <div className="flex flex-col h-full max-h-[95vh]">
                        <DrawerHeader className="shrink-0 border-b pb-4">
                            <DrawerTitle className="text-xl">{t("editTitle")}</DrawerTitle>
                        </DrawerHeader>
                        <div className="flex-1 overflow-y-auto px-4 pb-8">{FormContent}</div>
                    </div>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">{t("editTitle")}</DialogTitle>
                </DialogHeader>
                {FormContent}
            </DialogContent>
        </Dialog>
    )
}
