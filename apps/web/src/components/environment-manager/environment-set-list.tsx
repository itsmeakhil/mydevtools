"use client"

import { useMemo, useState } from "react"
import { useEnvironmentManagerStore, type EnvSetEntry } from "@/store/environment-manager-store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Copy, Pencil, Trash2, FileCode2 } from "lucide-react"
import { toast } from "sonner"
import { deleteEnvSetEntry } from "@/lib/environment-manager-api"
import { formatDotEnv } from "@/lib/environment-manager-utils"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { useTranslations } from "next-intl"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EditEnvironmentSetDialog } from "./edit-environment-set-dialog"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function EnvironmentSetList() {
    const t = useTranslations("EnvironmentManager.list")
    const tToast = useTranslations("EnvironmentManager.toasts")
    const { sets, isLoading, deleteSet } = useEnvironmentManagerStore()
    const { copyToClipboard } = useCopyToClipboard()
    const [search, setSearch] = useState("")
    const [tagFilter, setTagFilter] = useState("")
    const [editing, setEditing] = useState<EnvSetEntry | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const isMobile = useIsMobile()

    const allTags = useMemo(() => {
        const s = new Set<string>()
        sets.forEach((e) => e.tags.forEach((x) => s.add(x)))
        return [...s].sort()
    }, [sets])

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim()
        const tf = tagFilter.toLowerCase().trim()
        return sets.filter((e) => {
            const matchTag =
                !tf || e.tags.some((x) => x.toLowerCase().includes(tf)) || tf === e.project.toLowerCase()
            if (!q) return matchTag
            const blob = `${e.project} ${e.environment} ${e.tags.join(" ")} ${e.notes}`.toLowerCase()
            return matchTag && blob.includes(q)
        })
    }, [sets, search, tagFilter])

    const confirmDelete = async () => {
        if (!deleteId) return
        try {
            await deleteEnvSetEntry(deleteId)
            deleteSet(deleteId)
            toast.success(tToast("deleted"))
        } catch {
            toast.error(tToast("deleteFailed"))
        } finally {
            setDeleteId(null)
        }
    }

    return (
        <>
            <div
                className={cn(
                    "flex flex-col gap-4 flex-1 min-h-0",
                    isMobile ? "px-3 pt-3 pb-24" : "py-4"
                )}
            >
                {isMobile && (
                    <div className="flex items-center gap-2 shrink-0">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-xl font-bold tracking-tight flex-1">{t("title")}</h1>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder={t("searchPlaceholder")}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Input
                        className="sm:max-w-[200px]"
                        placeholder={t("tagFilterPlaceholder")}
                        value={tagFilter}
                        onChange={(e) => setTagFilter(e.target.value)}
                        list="env-manager-tag-suggestions"
                    />
                    <datalist id="env-manager-tag-suggestions">
                        {allTags.map((tag) => (
                            <option key={tag} value={tag} />
                        ))}
                    </datalist>
                </div>

                {isLoading ? (
                    <p className="text-muted-foreground text-sm">{t("loading")}</p>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                        <FileCode2 className="h-12 w-12 mb-3 opacity-40" />
                        <p className="font-medium text-foreground">{t("emptyTitle")}</p>
                        <p className="text-sm mt-1 max-w-sm">{t("emptyHint")}</p>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 overflow-y-auto pb-4">
                        {filtered.map((entry) => (
                            <Card key={entry.id} className="flex flex-col">
                                <CardHeader className="pb-2 space-y-1">
                                    <CardTitle className="text-base leading-tight">
                                        {entry.project}
                                        <span className="text-muted-foreground font-normal"> / </span>
                                        <span className="font-semibold">{entry.environment}</span>
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground">
                                        {t("updatedAgo", {
                                            time: formatDistanceToNow(entry.updatedAt, { addSuffix: true }),
                                        })}
                                    </p>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                                    {entry.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {entry.tags.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="text-xs">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        {t("variableCount", {
                                            count: entry.variables.filter((v) => v.key.trim()).length,
                                        })}
                                    </p>
                                    {entry.notes.trim() && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">{entry.notes}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2 mt-auto pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="gap-1"
                                            onClick={() =>
                                                copyToClipboard(
                                                    formatDotEnv(entry.variables),
                                                    tToast("copiedDotEnv")
                                                )
                                            }
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                            {t("copyDotEnv")}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="gap-1"
                                            onClick={() => {
                                                setEditing(entry)
                                                setEditOpen(true)
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            {t("edit")}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="gap-1 text-destructive hover:text-destructive"
                                            onClick={() => setDeleteId(entry.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            {t("delete")}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <EditEnvironmentSetDialog
                entry={editing}
                open={editOpen}
                onOpenChange={(o) => {
                    setEditOpen(o)
                    if (!o) setEditing(null)
                }}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteDialogTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("deleteDialogDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>{t("confirmDelete")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
