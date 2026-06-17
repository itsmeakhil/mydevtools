"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { highlightDotEnvSource } from "@/lib/hljs-dotenv"
import "./dotenv-modal-highlighter.css"
import { useEnvironmentManagerStore, type EnvSetEntry } from "@/store/environment-manager-store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Copy, Pencil, Trash2, FileCode2, Eye, ArrowUpDown } from "lucide-react"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { EditEnvironmentSetDialog } from "./edit-environment-set-dialog"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Drawer,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"

type SortOrder = "updatedDesc" | "updatedAsc" | "nameAsc"

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setDebounced(value), delay)
        return () => { if (timer.current) clearTimeout(timer.current) }
    }, [value, delay])
    return debounced
}

export function EnvironmentSetList() {
    const t = useTranslations("EnvironmentManager.list")
    const tToast = useTranslations("EnvironmentManager.toasts")
    const { sets, isLoading, deleteSet } = useEnvironmentManagerStore()
    const { copyToClipboard } = useCopyToClipboard()
    const [search, setSearch] = useState("")
    const [tagFilter, setTagFilter] = useState("")
    const [sortOrder, setSortOrder] = useState<SortOrder>("updatedDesc")
    const [editing, setEditing] = useState<EnvSetEntry | null>(null)
    const [editOpen, setEditOpen] = useState(false)
    const [deleteEntry, setDeleteEntry] = useState<EnvSetEntry | null>(null)
    const [viewingEntry, setViewingEntry] = useState<EnvSetEntry | null>(null)
    const isMobile = useIsMobile()
    const debouncedSearch = useDebounce(search, 200)

    const allTags = useMemo(() => {
        const s = new Set<string>()
        sets.forEach((e) => e.tags.forEach((x) => s.add(x)))
        return [...s].sort()
    }, [sets])

    const filtered = useMemo(() => {
        const q = debouncedSearch.toLowerCase().trim()
        const tf = tagFilter.toLowerCase().trim()
        const result = sets.filter((e) => {
            const matchTag =
                !tf || e.tags.some((x) => x.toLowerCase().includes(tf)) || tf === e.project.toLowerCase()
            if (!q) return matchTag
            const blob = `${e.project} ${e.environment} ${e.tags.join(" ")}`.toLowerCase()
            const notesMatch = e.notes.toLowerCase().includes(q)
            return matchTag && (blob.includes(q) || notesMatch)
        })
        return result.sort((a, b) => {
            if (sortOrder === "updatedDesc") return b.updatedAt - a.updatedAt
            if (sortOrder === "updatedAsc") return a.updatedAt - b.updatedAt
            return `${a.project}/${a.environment}`.localeCompare(`${b.project}/${b.environment}`)
        })
    }, [sets, debouncedSearch, tagFilter, sortOrder])

    const viewDotEnvRaw = useMemo(
        () => (viewingEntry ? formatDotEnv(viewingEntry.variables).trim() : ""),
        [viewingEntry]
    )
    const viewDotEnvHtml = useMemo(
        () => (viewDotEnvRaw ? highlightDotEnvSource(viewDotEnvRaw) : ""),
        [viewDotEnvRaw]
    )

    const confirmDelete = async () => {
        if (!deleteEntry) return
        try {
            await deleteEnvSetEntry(deleteEntry.id)
            deleteSet(deleteEntry.id)
            toast.success(tToast("deleted"))
        } catch {
            toast.error(tToast("deleteFailed"))
        } finally {
            setDeleteEntry(null)
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
                        className="sm:max-w-[180px]"
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 shrink-0 h-9">
                                <ArrowUpDown className="h-3.5 w-3.5" />
                                {t(`sort.${sortOrder}`)}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSortOrder("updatedDesc")}>{t("sort.updatedDesc")}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOrder("updatedAsc")}>{t("sort.updatedAsc")}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOrder("nameAsc")}>{t("sort.nameAsc")}</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {isLoading ? (
                    <p className="text-muted-foreground text-sm">{t("loading")}</p>
                ) : sets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                        <FileCode2 className="h-12 w-12 mb-3 opacity-40" />
                        <p className="font-medium text-foreground">{t("emptyTitle")}</p>
                        <p className="text-sm mt-1 max-w-sm">{t("emptyHint")}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                        <Search className="h-12 w-12 mb-3 opacity-40" />
                        <p className="font-medium text-foreground">{t("noResultsTitle")}</p>
                        <p className="text-sm mt-1 max-w-sm">{t("noResultsHint")}</p>
                    </div>
                ) : (
                    <TooltipProvider>
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
                                                    <Badge
                                                        key={tag}
                                                        variant="secondary"
                                                        className="text-xs cursor-pointer hover:bg-primary/10"
                                                        onClick={() => setTagFilter(tag)}
                                                    >
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
                                        <div className="flex gap-1 mt-auto pt-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                formatDotEnv(entry.variables),
                                                                tToast("copiedDotEnv")
                                                            )
                                                        }
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t("copyDotEnv")}</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => setViewingEntry(entry)}
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t("view")}</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => {
                                                            setEditing(entry)
                                                            setEditOpen(true)
                                                        }}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t("edit")}</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive ml-auto"
                                                        onClick={() => setDeleteEntry(entry)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t("delete")}</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TooltipProvider>
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

            {isMobile ? (
                <Drawer open={!!viewingEntry} onOpenChange={(o) => !o && setViewingEntry(null)}>
                    <DrawerContent className="max-h-[96vh] flex flex-col overflow-hidden p-0">
                        {viewingEntry && (
                            <>
                                <DrawerHeader className="shrink-0 space-y-1 px-4 pb-2 pt-4 text-left">
                                    <DrawerTitle className="text-xl leading-tight">
                                        {viewingEntry.project}
                                        <span className="text-muted-foreground font-normal"> / </span>
                                        <span className="font-semibold">{viewingEntry.environment}</span>
                                    </DrawerTitle>
                                    <p className="text-sm text-muted-foreground">{t("viewDialogSubtitle")}</p>
                                </DrawerHeader>
                                <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden px-4 pb-2">
                                    {viewingEntry.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {viewingEntry.tags.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="text-xs">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    {viewingEntry.notes.trim() && (
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                {t("viewNotesHeading")}
                                            </p>
                                            <p className="text-sm text-foreground whitespace-pre-wrap">{viewingEntry.notes}</p>
                                        </div>
                                    )}
                                    <ScrollArea className="dotenv-modal-hl min-h-[min(55vh,520px)] flex-1 basis-0 rounded-md border bg-muted/30">
                                        {viewDotEnvRaw ? (
                                            <pre className="m-0 break-all whitespace-pre-wrap p-4 text-left font-mono text-sm leading-relaxed">
                                                <code
                                                    className="hljs language-properties !bg-transparent"
                                                    dangerouslySetInnerHTML={{ __html: viewDotEnvHtml }}
                                                />
                                            </pre>
                                        ) : (
                                            <p className="p-4 text-sm text-muted-foreground">{t("viewNoVariables")}</p>
                                        )}
                                    </ScrollArea>
                                </div>
                                <DrawerFooter className="px-4 py-4 border-t bg-muted/20 shrink-0 gap-3 flex-col justify-end">
                                    <Button
                                        type="button"
                                        className="gap-1.5 w-full h-12 rounded-xl text-base font-semibold"
                                        onClick={() =>
                                            copyToClipboard(
                                                formatDotEnv(viewingEntry.variables),
                                                tToast("copiedDotEnv")
                                            )
                                        }
                                    >
                                        <Copy className="h-5 w-5" />
                                        {t("copyDotEnv")}
                                    </Button>
                                    <Button type="button" variant="outline" className="w-full h-12 rounded-xl text-base" onClick={() => setViewingEntry(null)}>
                                        {t("closeView")}
                                    </Button>
                                </DrawerFooter>
                            </>
                        )}
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={!!viewingEntry} onOpenChange={(o) => !o && setViewingEntry(null)}>
                    <DialogContent className="flex h-[min(92vh,800px)] w-[min(95vw,780px)] max-w-[min(95vw,780px)] max-h-[min(92vh,800px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(95vw,780px)]">
                        {viewingEntry && (
                            <>
                                <DialogHeader className="shrink-0 space-y-1 px-6 pb-2 pt-6 text-left">
                                    <DialogTitle className="text-xl leading-tight">
                                        {viewingEntry.project}
                                        <span className="text-muted-foreground font-normal"> / </span>
                                        <span className="font-semibold">{viewingEntry.environment}</span>
                                    </DialogTitle>
                                    <p className="text-sm text-muted-foreground">{t("viewDialogSubtitle")}</p>
                                </DialogHeader>
                                <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden px-6 pb-2">
                                    {viewingEntry.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {viewingEntry.tags.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="text-xs">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    {viewingEntry.notes.trim() && (
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                {t("viewNotesHeading")}
                                            </p>
                                            <p className="text-sm text-foreground whitespace-pre-wrap">{viewingEntry.notes}</p>
                                        </div>
                                    )}
                                    <ScrollArea className="dotenv-modal-hl min-h-[min(48vh,520px)] flex-1 basis-0 rounded-md border bg-muted/30 sm:min-h-[min(58vh,680px)]">
                                        {viewDotEnvRaw ? (
                                            <pre className="m-0 break-all whitespace-pre-wrap p-4 text-left font-mono text-sm leading-relaxed">
                                                <code
                                                    className="hljs language-properties !bg-transparent"
                                                    dangerouslySetInnerHTML={{ __html: viewDotEnvHtml }}
                                                />
                                            </pre>
                                        ) : (
                                            <p className="p-4 text-sm text-muted-foreground">{t("viewNoVariables")}</p>
                                        )}
                                    </ScrollArea>
                                </div>
                                <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0 gap-2 sm:gap-2 flex-row flex-wrap justify-end">
                                    <Button type="button" variant="outline" onClick={() => setViewingEntry(null)}>
                                        {t("closeView")}
                                    </Button>
                                    <Button
                                        type="button"
                                        className="gap-1.5"
                                        onClick={() =>
                                            copyToClipboard(
                                                formatDotEnv(viewingEntry.variables),
                                                tToast("copiedDotEnv")
                                            )
                                        }
                                    >
                                        <Copy className="h-4 w-4" />
                                        {t("copyDotEnv")}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            )}

            <AlertDialog open={!!deleteEntry} onOpenChange={(o) => !o && setDeleteEntry(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteDialogTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteEntry && (
                                <span>
                                    <strong>{deleteEntry.project} / {deleteEntry.environment}</strong>
                                    {" — "}
                                </span>
                            )}
                            {t("deleteDialogDescription")}
                        </AlertDialogDescription>
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
