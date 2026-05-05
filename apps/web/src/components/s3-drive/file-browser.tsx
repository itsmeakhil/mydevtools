"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    IconFolder,
    IconFile,
    IconFileTypePdf,
    IconFileTypeZip,
    IconFileTypeCsv,
    IconFileTypeDoc,
    IconFileCode,
    IconPhoto,
    IconVideo,
    IconMusic,
    IconTrash,
    IconDownload,
    IconUpload,
    IconFolderPlus,
    IconRefresh,
    IconChevronRight,
    IconArrowLeft,
    IconArrowUp,
    IconArrowDown,
    IconDots,
    IconSearch,
    IconCheck,
    IconLayoutGrid,
    IconLayoutList,
    IconEye,
    IconX,
    IconLoader2,
    IconHome,
    IconCloudUpload,
    IconPencil,
    IconCopy,
    IconLink,
    IconPackage,
    IconArrowsMove,
    IconShare,
    IconAlertCircle,
    IconPlus,
    IconMinus,
    IconChevronDown,
} from "@tabler/icons-react"
import { listObjects, deleteObjects, getPresignedDownloadUrl, getPresignedUploadUrl, moveObject, configureBucketCors } from "@/lib/s3-drive-api"
import type { S3Credentials, S3ObjectItem } from "@/lib/s3-drive-api"
import { useS3DriveStore } from "@/store/s3-drive-store"
import { CreateFolderDialog } from "./create-folder-dialog"
import { formatBytes } from "./utils"

type ViewMode = "list" | "grid"
type SortCol = "name" | "size" | "modified"
type SortDir = "asc" | "desc"
type PreviewState = {
    key: string
    url: string | null
    loading: boolean
    fileType: string
    textContent?: string
}
type RenameTarget = { key: string; isFolder: boolean; displayName: string }

// ── File type helpers ─────────────────────────────────────────────────────────

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "svg", "webp", "avif", "bmp", "ico"]
const VIDEO_EXTS = ["mp4", "mov", "avi", "mkv", "webm", "m4v"]
const AUDIO_EXTS = ["mp3", "wav", "ogg", "flac", "aac", "m4a"]
const ARCHIVE_EXTS = ["zip", "tar", "gz", "bz2", "7z", "rar", "xz"]
const CODE_EXTS = ["js", "ts", "tsx", "jsx", "py", "go", "rs", "rb", "java", "c", "cpp", "h", "cs", "php", "sh", "yaml", "yml", "toml", "json", "xml", "html", "css", "scss", "sql"]
const DOC_EXTS = ["doc", "docx", "txt", "md", "rtf", "odt"]
const SHEET_EXTS = ["xls", "xlsx", "csv", "ods"]

function getFileType(name: string) {
    const ext = name.split(".").pop()?.toLowerCase() ?? ""
    if (IMAGE_EXTS.includes(ext)) return "image"
    if (VIDEO_EXTS.includes(ext)) return "video"
    if (AUDIO_EXTS.includes(ext)) return "audio"
    if (ext === "pdf") return "pdf"
    if (ARCHIVE_EXTS.includes(ext)) return "archive"
    if (CODE_EXTS.includes(ext)) return "code"
    if (DOC_EXTS.includes(ext)) return "doc"
    if (SHEET_EXTS.includes(ext)) return "sheet"
    return "file"
}

function isPreviewable(type: string): boolean {
    return ["image", "pdf", "code", "doc", "video", "audio"].includes(type)
}

const TYPE_ICON_COLOR: Record<string, string> = {
    image: "text-emerald-500", video: "text-purple-500", audio: "text-blue-500",
    pdf: "text-red-500", archive: "text-orange-500", code: "text-sky-500",
    doc: "text-indigo-400", sheet: "text-green-600", file: "text-slate-400",
}
const TYPE_BG_CLASS: Record<string, string> = {
    image:   "bg-emerald-500/10",
    video:   "bg-purple-500/10",
    audio:   "bg-blue-500/10",
    pdf:     "bg-red-500/10",
    archive: "bg-orange-500/10",
    code:    "bg-sky-500/10",
    doc:     "bg-indigo-400/10",
    sheet:   "bg-green-600/10",
    file:    "bg-slate-100 dark:bg-slate-800",
}
const TYPE_LABEL: Record<string, string> = {
    image: "Image", video: "Video", audio: "Audio", pdf: "PDF",
    archive: "Archive", code: "Code", doc: "Document", sheet: "Spreadsheet", file: "File",
}

function FileIconComp({ type, className }: { type: string; className?: string }) {
    const c = cn(TYPE_ICON_COLOR[type] ?? "text-slate-400", className)
    switch (type) {
        case "image":   return <IconPhoto className={c} />
        case "video":   return <IconVideo className={c} />
        case "audio":   return <IconMusic className={c} />
        case "pdf":     return <IconFileTypePdf className={c} />
        case "archive": return <IconFileTypeZip className={c} />
        case "code":    return <IconFileCode className={c} />
        case "doc":     return <IconFileTypeDoc className={c} />
        case "sheet":   return <IconFileTypeCsv className={c} />
        default:        return <IconFile className={c} />
    }
}

// ── Checkbox ──────────────────────────────────────────────────────────────────

function Checkbox({
    checked, indeterminate, onToggle, className,
}: {
    checked: boolean; indeterminate?: boolean; onToggle: () => void; className?: string
}) {
    return (
        <div
            data-sel-cb
            role="checkbox"
            aria-checked={checked}
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            className={cn(
                "size-[18px] rounded-[4px] border-2 flex items-center justify-center cursor-pointer shrink-0 transition-all duration-100",
                checked || indeterminate
                    ? "bg-blue-600 border-blue-600"
                    : "border-slate-400/60 bg-white/70 dark:bg-black/30 hover:border-blue-500",
                className,
            )}
        >
            {indeterminate && !checked
                ? <div className="w-2.5 h-[2px] bg-white rounded-full" />
                : checked
                    ? <IconCheck className="size-[11px] text-white stroke-[3]" />
                    : null
            }
        </div>
    )
}

function isCheckboxClick(e: React.MouseEvent) {
    return !!(e.target as HTMLElement).closest("[data-sel-cb]")
}

// ── File preview dialog ───────────────────────────────────────────────────────

function FilePreviewDialog({
    preview, onClose, onDownload,
}: {
    preview: PreviewState | null
    onClose: () => void
    onDownload: (key: string) => void
}) {
    if (!preview) return null
    const name = preview.key.split("/").pop() ?? preview.key

    const body = (() => {
        if (preview.loading) {
            return (
                <div className="flex items-center justify-center min-h-72">
                    <IconLoader2 className="size-9 animate-spin text-muted-foreground" />
                </div>
            )
        }
        if (!preview.url) {
            return <p className="text-sm text-muted-foreground p-8 text-center">Failed to load preview</p>
        }
        if (preview.fileType === "image") {
            return (
                <div className="flex items-center justify-center bg-muted/50 min-h-72 max-h-[80vh] overflow-auto p-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview.url} alt={name} className="max-w-full max-h-full object-contain rounded-md shadow" />
                </div>
            )
        }
        if (preview.fileType === "pdf") {
            return (
                <iframe
                    src={preview.url}
                    title={name}
                    className="w-full flex-1 border-0"
                    style={{ minHeight: "70vh" }}
                />
            )
        }
        if (preview.fileType === "video") {
            return (
                <div className="flex items-center justify-center bg-black min-h-72 max-h-[80vh]">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video controls src={preview.url} className="max-w-full max-h-[75vh] outline-none" />
                </div>
            )
        }
        if (preview.fileType === "audio") {
            return (
                <div className="flex items-center justify-center bg-muted/30 min-h-40 p-8">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio controls src={preview.url} className="w-full" />
                </div>
            )
        }
        if (preview.fileType === "code" || preview.fileType === "doc") {
            if (preview.textContent !== undefined) {
                return (
                    <div className="flex-1 overflow-auto bg-muted/30 p-4" style={{ maxHeight: "72vh" }}>
                        <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words text-foreground">
                            {preview.textContent}
                        </pre>
                    </div>
                )
            }
            return <p className="text-sm text-muted-foreground p-8 text-center">Failed to load preview</p>
        }
        return null
    })()

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-5xl w-full p-0 overflow-hidden gap-0 flex flex-col">
                <DialogHeader className="flex flex-row items-center justify-between px-5 py-3 border-b shrink-0 bg-muted/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn("size-7 rounded-lg flex items-center justify-center shrink-0", TYPE_BG_CLASS[preview.fileType] ?? "bg-muted")}>
                            <FileIconComp type={preview.fileType} className="size-4" />
                        </div>
                        <DialogTitle className="text-sm font-medium truncate max-w-lg">{name}</DialogTitle>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="size-8 rounded-lg" onClick={() => onDownload(preview.key)}>
                                    <IconDownload className="size-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download</TooltipContent>
                        </Tooltip>
                        <Button size="icon" variant="ghost" className="size-8 rounded-lg" onClick={onClose}>
                            <IconX className="size-4" />
                        </Button>
                    </div>
                </DialogHeader>
                {body}
            </DialogContent>
        </Dialog>
    )
}

// ── Rename dialog ─────────────────────────────────────────────────────────────

function RenameDialog({
    open, initialName, onClose, onRename,
}: {
    open: boolean; initialName: string; onClose: () => void; onRename: (name: string) => Promise<void>
}) {
    const [name, setName] = useState(initialName)
    const [saving, setSaving] = useState(false)

    useEffect(() => { if (open) setName(initialName) }, [open, initialName])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed || trimmed === initialName) { onClose(); return }
        setSaving(true)
        try { await onRename(trimmed); onClose() } finally { setSaving(false) }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Rename</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                        disabled={saving}
                    />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                        <Button type="submit" disabled={saving || !name.trim()}>
                            {saving ? "Renaming…" : "Rename"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// ── Module-level helpers ──────────────────────────────────────────────────────

async function moveFolderRecursive(credentials: S3Credentials, oldPrefix: string, newPrefix: string) {
    let token: string | undefined
    do {
        const res = await listObjects(credentials, oldPrefix, token, "")
        await Promise.all(
            res.objects.map((obj) =>
                moveObject(credentials, obj.key, newPrefix + obj.key.slice(oldPrefix.length)),
            ),
        )
        token = res.nextContinuationToken
    } while (token)
}

function uploadFileXHR(url: string, file: File, onProgress: (p: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total) }
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)))
        xhr.onerror = () => reject(new Error("Network error"))
        xhr.open("PUT", url)
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
        xhr.send(file)
    })
}

// ── Upload progress panel ─────────────────────────────────────────────────────

type FileUploadStatus = {
    name: string
    status: "queued" | "uploading" | "done" | "error"
    progress: number
}

function UploadProgressPanel({
    queue, onClearCompleted, onDismiss,
}: {
    queue: FileUploadStatus[]
    onClearCompleted: () => void
    onDismiss: () => void
}) {
    const [collapsed, setCollapsed] = useState(false)
    const activeCount = queue.filter((f) => f.status === "uploading").length
    const doneCount = queue.filter((f) => f.status === "done" || f.status === "error").length
    const allDone = doneCount === queue.length

    if (queue.length === 0) return null

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
            <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b bg-muted/30">
                <IconCloudUpload className="size-4 text-blue-500 shrink-0" />
                <span className="text-xs font-semibold flex-1 truncate">
                    {allDone ? `${doneCount}/${queue.length} complete` : `Uploading ${activeCount} file${activeCount !== 1 ? "s" : ""}…`}
                </span>
                {allDone && (
                    <Button size="icon" variant="ghost" className="size-6 shrink-0 rounded-lg" onClick={onClearCompleted}>
                        <IconCheck className="size-3 text-emerald-500" />
                    </Button>
                )}
                <Button size="icon" variant="ghost" className="size-6 shrink-0 rounded-lg" onClick={() => setCollapsed((c) => !c)}>
                    {collapsed
                        ? <IconChevronDown className="size-3 text-muted-foreground" />
                        : <IconMinus className="size-3 text-muted-foreground" />
                    }
                </Button>
                <Button size="icon" variant="ghost" className="size-6 shrink-0 rounded-lg" onClick={onDismiss}>
                    <IconX className="size-3 text-muted-foreground" />
                </Button>
            </div>
            {!collapsed && (
                <div className="max-h-60 overflow-y-auto">
                    {queue.map((f, i) => (
                        <div key={i} className="px-3.5 py-2 border-b border-border/30 last:border-0">
                            <div className="flex items-center gap-2">
                                {f.status === "done" && <IconCheck className="size-3.5 text-emerald-500 shrink-0" />}
                                {f.status === "error" && <IconAlertCircle className="size-3.5 text-destructive shrink-0" />}
                                {f.status === "uploading" && <IconLoader2 className="size-3.5 animate-spin text-blue-500 shrink-0" />}
                                {f.status === "queued" && <div className="size-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                                <span className="text-xs truncate flex-1">{f.name}</span>
                                {f.status === "uploading" && (
                                    <span className="text-[10px] text-muted-foreground shrink-0">{Math.round(f.progress * 100)}%</span>
                                )}
                                {f.status === "done" && <span className="text-[10px] text-emerald-500 shrink-0">Done</span>}
                                {f.status === "error" && <span className="text-[10px] text-destructive shrink-0">Failed</span>}
                            </div>
                            {f.status === "uploading" && (
                                <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-[width] duration-200 rounded-full"
                                        style={{ width: `${f.progress * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {/* Overall progress */}
            {!allDone && (
                <div className="h-0.5 bg-muted">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-[width] duration-300" style={{ width: `${(doneCount / queue.length) * 100}%` }} />
                </div>
            )}
        </div>
    )
}

// ── Move to folder dialog ─────────────────────────────────────────────────────

function MoveToDialog({
    open, items, credentials, currentPrefix, onClose, onMoved,
}: {
    open: boolean
    items: { key: string; isFolder: boolean }[]
    credentials: S3Credentials
    currentPrefix: string
    onClose: () => void
    onMoved: () => void
}) {
    const [targetPrefix, setTargetPrefix] = useState("")
    const [folders, setFolders] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [moving, setMoving] = useState(false)

    useEffect(() => { if (open) setTargetPrefix("") }, [open])

    useEffect(() => {
        if (!open) return
        setLoading(true)
        listObjects(credentials, targetPrefix)
            .then((res) => setFolders(res.prefixes))
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [open, credentials, targetPrefix])

    function canMove() {
        if (targetPrefix === currentPrefix) return false
        return !items.some((item) => item.isFolder && targetPrefix.startsWith(item.key))
    }

    async function handleMove() {
        setMoving(true)
        try {
            for (const item of items) {
                const basename = item.key.replace(/\/$/, "").split("/").pop()!
                if (item.isFolder) {
                    await moveFolderRecursive(credentials, item.key, targetPrefix + basename + "/")
                } else {
                    await moveObject(credentials, item.key, targetPrefix + basename)
                }
            }
            toast.success(`Moved ${items.length} item${items.length > 1 ? "s" : ""}`)
            onMoved()
            onClose()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Move failed")
        } finally {
            setMoving(false)
        }
    }

    const breadcrumbs = targetPrefix ? targetPrefix.replace(/\/$/, "").split("/") : []

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Move {items.length} item{items.length > 1 ? "s" : ""} to…</DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground min-h-5">
                    <button className="hover:text-foreground hover:underline" onClick={() => setTargetPrefix("")}>
                        Root
                    </button>
                    {breadcrumbs.map((part, i) => {
                        const prefix = breadcrumbs.slice(0, i + 1).join("/") + "/"
                        return (
                            <span key={prefix} className="flex items-center gap-1">
                                <IconChevronRight className="size-3" />
                                <button className="hover:text-foreground hover:underline" onClick={() => setTargetPrefix(prefix)}>
                                    {part}
                                </button>
                            </span>
                        )
                    })}
                </div>
                <div className="border rounded-lg overflow-hidden" style={{ minHeight: "8rem" }}>
                    <ScrollArea className="max-h-56">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : folders.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                                No subfolders here
                            </div>
                        ) : (
                            <div className="p-1">
                                {folders.map((f) => {
                                    const name = f.slice(targetPrefix.length).replace(/\/$/, "")
                                    const disabled = items.some((item) => item.isFolder && f.startsWith(item.key))
                                    return (
                                        <button
                                            key={f}
                                            disabled={disabled}
                                            className={cn(
                                                "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-left transition-colors",
                                                disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-muted",
                                            )}
                                            onClick={() => setTargetPrefix(f)}
                                        >
                                            <IconFolder className="size-4 text-amber-500 shrink-0" />
                                            <span className="truncate flex-1">{name}</span>
                                            <IconChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>
                <p className="text-xs text-muted-foreground">
                    Destination: <span className="font-mono text-foreground">{targetPrefix || "/"}</span>
                </p>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={moving}>Cancel</Button>
                    <Button onClick={handleMove} disabled={!canMove() || moving}>
                        {moving ? "Moving…" : "Move here"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── Share link dialog ─────────────────────────────────────────────────────────

function ShareLinkDialog({
    open, fileKey, credentials, onClose,
}: {
    open: boolean
    fileKey: string | null
    credentials: S3Credentials
    onClose: () => void
}) {
    const [expiresIn, setExpiresIn] = useState(3600)
    const [url, setUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const fileName = fileKey?.split("/").pop() ?? ""

    useEffect(() => { if (!open) { setUrl(null); setExpiresIn(3600) } }, [open])

    async function generate() {
        if (!fileKey) return
        setLoading(true)
        try {
            const res = await getPresignedDownloadUrl(credentials, fileKey, expiresIn)
            setUrl(res.url)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to generate link")
        } finally {
            setLoading(false)
        }
    }

    const presets = [
        { label: "1 hour", value: 3600 },
        { label: "6 hours", value: 21600 },
        { label: "12 hours", value: 43200 },
        { label: "24 hours", value: 86400 },
    ]

    return (
        <Dialog open={open && !!fileKey} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Share link</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground truncate">{fileName}</p>
                <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Expires in</p>
                    <div className="flex gap-2 flex-wrap">
                        {presets.map((p) => (
                            <Button
                                key={p.value}
                                size="sm"
                                variant={expiresIn === p.value ? "default" : "outline"}
                                className="h-7 text-xs"
                                onClick={() => { setExpiresIn(p.value); setUrl(null) }}
                            >
                                {p.label}
                            </Button>
                        ))}
                    </div>
                    {url ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 p-2.5 bg-muted rounded-lg border">
                                <span className="text-xs font-mono truncate flex-1 select-all">{url}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    className="flex-1 gap-1.5"
                                    onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied!") }}
                                >
                                    <IconCopy className="size-3.5" /> Copy
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 gap-1.5"
                                    onClick={() => window.open(url, "_blank")}
                                >
                                    <IconLink className="size-3.5" /> Open
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button onClick={generate} disabled={loading} className="w-full gap-1.5">
                            {loading && <IconLoader2 className="size-4 animate-spin" />}
                            Generate link
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── Sort header ───────────────────────────────────────────────────────────────

function SortHeader({
    col, label, current, dir, onSort, className,
}: {
    col: SortCol; label: string; current: SortCol; dir: SortDir
    onSort: (col: SortCol) => void; className?: string
}) {
    const active = current === col
    return (
        <th
            className={cn(
                "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider border-b cursor-pointer select-none transition-colors group/th",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                className,
            )}
            onClick={() => onSort(col)}
        >
            <span className="flex items-center gap-1">
                {label}
                {active
                    ? dir === "asc"
                        ? <IconArrowUp className="size-3 shrink-0" />
                        : <IconArrowDown className="size-3 shrink-0" />
                    : <IconArrowUp className="size-3 shrink-0 opacity-0 group-hover/th:opacity-30" />
                }
            </span>
        </th>
    )
}

// ── Context menu wrapper ──────────────────────────────────────────────────────

type ItemActionProps = {
    isFolder: boolean
    isPreviewable: boolean
    onNavigate: (() => void) | null
    onPreview?: () => void
    onDownload: () => void
    onDelete: () => void
    onRename: () => void
    onMoveOpen: () => void
    onCopyPath: () => void
    onCopyLink: (() => void) | null
    onShareLink: (() => void) | null
}

function WithContextMenu({ children, ...actions }: { children: React.ReactNode } & ItemActionProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent className="w-44">
                {actions.isFolder && actions.onNavigate && (
                    <ContextMenuItem onClick={actions.onNavigate}>
                        <IconChevronRight className="size-4 mr-2" /> Open
                    </ContextMenuItem>
                )}
                {actions.isPreviewable && actions.onPreview && (
                    <ContextMenuItem onClick={actions.onPreview}>
                        <IconEye className="size-4 mr-2" /> Preview
                    </ContextMenuItem>
                )}
                {!actions.isFolder && (
                    <ContextMenuItem onClick={actions.onDownload}>
                        <IconDownload className="size-4 mr-2" /> Download
                    </ContextMenuItem>
                )}
                <ContextMenuItem onClick={actions.onRename}>
                    <IconPencil className="size-4 mr-2" /> Rename
                </ContextMenuItem>
                <ContextMenuItem onClick={actions.onMoveOpen}>
                    <IconArrowsMove className="size-4 mr-2" /> Move to…
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={actions.onCopyPath}>
                    <IconCopy className="size-4 mr-2" /> Copy S3 path
                </ContextMenuItem>
                {actions.onCopyLink && (
                    <ContextMenuItem onClick={actions.onCopyLink}>
                        <IconLink className="size-4 mr-2" /> Copy link
                    </ContextMenuItem>
                )}
                {actions.onShareLink && (
                    <ContextMenuItem onClick={actions.onShareLink}>
                        <IconShare className="size-4 mr-2" /> Share link…
                    </ContextMenuItem>
                )}
                <ContextMenuSeparator />
                <ContextMenuItem className="text-destructive focus:text-destructive" onClick={actions.onDelete}>
                    <IconTrash className="size-4 mr-2" /> Delete
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

// ── FileBrowser ───────────────────────────────────────────────────────────────

type Props = { credentials: S3Credentials; connectionName: string }

export function FileBrowser({ credentials, connectionName }: Props) {
    const {
        currentPrefix, objects, prefixes, isLoading, isTruncated, nextContinuationToken,
        selectedKeys, setCurrentPrefix, setObjects, setLoading,
        toggleSelectKey, clearSelection, selectAll,
    } = useS3DriveStore()

    const [viewMode, setViewMode] = useState<ViewMode>("list")
    const [search, setSearch] = useState("")
    const [sortCol, setSortCol] = useState<SortCol>("name")
    const [sortDir, setSortDir] = useState<SortDir>("asc")
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
    const [createFolderOpen, setCreateFolderOpen] = useState(false)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [uploadQueue, setUploadQueue] = useState<FileUploadStatus[]>([])
    const [uploadPanelOpen, setUploadPanelOpen] = useState(false)
    const [zipProgress, setZipProgress] = useState<{ done: number; total: number } | null>(null)
    const [preview, setPreview] = useState<PreviewState | null>(null)
    const [isDragOver, setIsDragOver] = useState(false)
    const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null)
    const [moveItems, setMoveItems] = useState<{ key: string; isFolder: boolean }[] | null>(null)
    const [shareLinkTarget, setShareLinkTarget] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dropZoneRef = useRef<HTMLDivElement>(null)
    const corsConfiguredRef = useRef(false)

    const loadObjects = useCallback(async (prefix: string, token?: string) => {
        setLoading(true)
        try {
            const res = await listObjects(credentials, prefix, token)
            if (token) {
                const s = useS3DriveStore.getState()
                setObjects([...s.objects, ...res.objects], [...s.prefixes, ...res.prefixes], res.isTruncated, res.nextContinuationToken)
            } else {
                setObjects(res.objects, res.prefixes, res.isTruncated, res.nextContinuationToken)
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to list objects")
        } finally {
            setLoading(false)
        }
    }, [credentials, setLoading, setObjects])

    useEffect(() => { loadObjects(currentPrefix) }, [currentPrefix]) // eslint-disable-line react-hooks/exhaustive-deps

    // Reset focus when navigating
    useEffect(() => { setFocusedIndex(null) }, [currentPrefix, search])

    // Sorted + filtered lists (defined early so keyboard handler can use them)
    const filteredPrefixes = prefixes.filter((p) => !search || p.toLowerCase().includes(search.toLowerCase()))
    const filteredObjects = objects.filter((o) => !search || o.key.toLowerCase().includes(search.toLowerCase()))

    const sortedPrefixes = [...filteredPrefixes].sort((a, b) => {
        const an = a.replace(currentPrefix, "").replace(/\/$/, "").toLowerCase()
        const bn = b.replace(currentPrefix, "").replace(/\/$/, "").toLowerCase()
        return sortDir === "asc" ? an.localeCompare(bn) : bn.localeCompare(an)
    })
    const sortedObjects = [...filteredObjects].sort((a, b) => {
        let cmp = 0
        if (sortCol === "name") {
            cmp = a.key.replace(currentPrefix, "").toLowerCase()
                .localeCompare(b.key.replace(currentPrefix, "").toLowerCase())
        } else if (sortCol === "size") {
            cmp = (a.size ?? 0) - (b.size ?? 0)
        } else if (sortCol === "modified") {
            cmp = (a.lastModified ?? "").localeCompare(b.lastModified ?? "")
        }
        return sortDir === "asc" ? cmp : -cmp
    })

    const allItems = [...sortedPrefixes, ...sortedObjects.map((o) => o.key)]

    // Keyboard shortcuts
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const tag = (e.target as HTMLElement).tagName
            if (tag === "INPUT" || tag === "TEXTAREA") return

            const total = allItems.length

            if (e.key === "ArrowDown") {
                e.preventDefault()
                setFocusedIndex((i) => i === null ? 0 : Math.min(i + 1, total - 1))
            } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setFocusedIndex((i) => i === null ? total - 1 : Math.max(i - 1, 0))
            } else if (e.key === "Enter" && focusedIndex !== null) {
                const key = allItems[focusedIndex]
                if (!key) return
                if (key.endsWith("/")) { clearSelection(); setCurrentPrefix(key) }
                else {
                    const type = getFileType(key.replace(currentPrefix, ""))
                    if (isPreviewable(type)) openPreview(key)
                    else onDownload(key)
                }
            } else if (e.key === " " && focusedIndex !== null) {
                e.preventDefault()
                const key = allItems[focusedIndex]
                if (key) toggleSelectKey(key)
            } else if (e.key === "Escape") {
                if (selectedKeys.size > 0) clearSelection()
                else setFocusedIndex(null)
            } else if ((e.key === "Delete" || e.key === "Backspace") && selectedKeys.size > 0 && !deleteConfirmOpen) {
                e.preventDefault()
                setDeleteConfirmOpen(true)
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allItems, focusedIndex, selectedKeys.size, deleteConfirmOpen, currentPrefix])

    // Scroll focused row into view
    useEffect(() => {
        if (focusedIndex === null) return
        document.querySelector("[data-focused-row]")?.scrollIntoView({ block: "nearest" })
    }, [focusedIndex])

    function navigateInto(prefix: string) { clearSelection(); setCurrentPrefix(prefix) }
    function navigateUp() {
        if (!currentPrefix) return
        const parts = currentPrefix.replace(/\/$/, "").split("/")
        parts.pop()
        setCurrentPrefix(parts.length ? parts.join("/") + "/" : "")
    }

    function toggleSort(col: SortCol) {
        if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc")
        else { setSortCol(col); setSortDir("asc") }
    }

    async function onDownload(key: string) {
        try {
            const { url } = await getPresignedDownloadUrl(credentials, key)
            const a = document.createElement("a")
            a.href = url; a.download = key.split("/").pop() ?? key; a.click()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to get download URL")
        }
    }

    async function openPreview(key: string) {
        const name = key.split("/").pop() ?? key
        const fileType = getFileType(name)
        setPreview({ key, url: null, loading: true, fileType })
        try {
            const { url } = await getPresignedDownloadUrl(credentials, key)
            if (fileType === "code" || fileType === "doc") {
                const res = await fetch(url)
                const text = res.ok ? await res.text() : undefined
                setPreview({ key, url, loading: false, fileType, textContent: text?.slice(0, 200_000) })
            } else {
                setPreview({ key, url, loading: false, fileType })
            }
        } catch {
            setPreview({ key, url: null, loading: false, fileType })
        }
    }

    async function onDelete() {
        if (selectedKeys.size === 0) return
        setDeleting(true)
        try {
            const keys = Array.from(selectedKeys)
            await deleteObjects(credentials, keys)
            toast.success(`Deleted ${keys.length} item${keys.length > 1 ? "s" : ""}`)
            clearSelection()
            loadObjects(currentPrefix)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete")
        } finally {
            setDeleting(false)
            setDeleteConfirmOpen(false)
        }
    }

    async function onUploadFiles(files: FileList | File[]) {
        const arr = Array.from(files)
        if (!arr.length) return

        const initial: FileUploadStatus[] = arr.map((f) => ({ name: f.name, status: "queued", progress: 0 }))
        setUploadQueue(initial)
        setUploadPanelOpen(true)

        if (!corsConfiguredRef.current) {
            try {
                await configureBucketCors(credentials, [window.location.origin])
                corsConfiguredRef.current = true
            } catch {
                // Non-fatal: CORS may already be configured or user may lack permission
            }
        }

        const CONCURRENCY = 4
        let successCount = 0

        const updateFile = (idx: number, update: Partial<FileUploadStatus>) =>
            setUploadQueue((prev) => prev.map((f, j) => (j === idx ? { ...f, ...update } : f)))

        async function uploadOne(idx: number, file: File) {
            updateFile(idx, { status: "uploading", progress: 0 })
            try {
                const key = `${currentPrefix}${file.name}`
                const { url } = await getPresignedUploadUrl(credentials, key, file.type || "application/octet-stream")
                await uploadFileXHR(url, file, (p) => updateFile(idx, { progress: p }))
                updateFile(idx, { status: "done", progress: 1 })
                successCount++
            } catch {
                updateFile(idx, { status: "error" })
            }
        }

        for (let i = 0; i < arr.length; i += CONCURRENCY) {
            const batch = arr.slice(i, i + CONCURRENCY)
            await Promise.allSettled(batch.map((file, j) => uploadOne(i + j, file)))
        }

        if (successCount > 0) {
            toast.success(`Uploaded ${successCount} file${successCount > 1 ? "s" : ""}`)
            loadObjects(currentPrefix)
        }
        if (successCount < arr.length) {
            toast.error(`${arr.length - successCount} file${arr.length - successCount > 1 ? "s" : ""} failed`)
        }
    }

    async function onDownloadZip() {
        const fileKeys = Array.from(selectedKeys).filter((k) => !k.endsWith("/"))
        if (!fileKeys.length) { toast.error("No files selected (folders are skipped)"); return }
        setZipProgress({ done: 0, total: fileKeys.length })
        const [{ default: JSZip }, { saveAs }] = await Promise.all([
            import("jszip"),
            import("file-saver"),
        ])
        const zip = new JSZip()
        let ok = 0
        for (const key of fileKeys) {
            try {
                const { url } = await getPresignedDownloadUrl(credentials, key)
                const res = await fetch(url)
                const blob = await res.blob()
                zip.file(key.split("/").pop() ?? key, blob)
                ok++
                setZipProgress({ done: ok, total: fileKeys.length })
            } catch {
                toast.error(`Failed to fetch ${key.split("/").pop()}`)
            }
        }
        if (ok > 0) {
            const blob = await zip.generateAsync({ type: "blob" })
            saveAs(blob, `download-${Date.now()}.zip`)
        }
        setZipProgress(null)
    }

    function onCopyS3Path(key: string) {
        navigator.clipboard.writeText(`s3://${credentials.bucket}/${key}`)
        toast.success("Copied S3 path")
    }

    async function onCopyLink(key: string) {
        try {
            const { url } = await getPresignedDownloadUrl(credentials, key)
            await navigator.clipboard.writeText(url)
            toast.success("Copied link")
        } catch {
            toast.error("Failed to copy link")
        }
    }

    async function onRename(newName: string) {
        if (!renameTarget) return
        try {
            if (renameTarget.isFolder) {
                const newPrefix = currentPrefix + newName + "/"
                await renameFolderRecursive(renameTarget.key, newPrefix)
            } else {
                await moveObject(credentials, renameTarget.key, currentPrefix + newName)
            }
            toast.success("Renamed")
            loadObjects(currentPrefix)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Rename failed")
            throw err
        }
    }

    async function renameFolderRecursive(oldPrefix: string, newPrefix: string) {
        await moveFolderRecursive(credentials, oldPrefix, newPrefix)
    }

    // Drag-and-drop
    function onDragOver(e: React.DragEvent) {
        e.preventDefault(); e.stopPropagation()
        if (e.dataTransfer.types.includes("Files")) setIsDragOver(true)
    }
    function onDragLeave(e: React.DragEvent) {
        if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) setIsDragOver(false)
    }
    function onDrop(e: React.DragEvent) {
        e.preventDefault(); e.stopPropagation()
        setIsDragOver(false)
        if (e.dataTransfer.files.length) onUploadFiles(e.dataTransfer.files)
    }

    // Breadcrumb
    const breadcrumbs = currentPrefix ? currentPrefix.replace(/\/$/, "").split("/") : []
    const COLLAPSE_AT = 4

    function renderCrumb(part: string, index: number, prefixOverride?: string) {
        const prefix = prefixOverride ?? (breadcrumbs.slice(0, index + 1).join("/") + "/")
        const isLast = index === breadcrumbs.length - 1
        return (
            <span key={prefix} className="flex items-center min-w-0 shrink-0">
                <IconChevronRight className="size-3.5 text-muted-foreground/40 mx-0.5 shrink-0" />
                <button
                    onClick={() => { clearSelection(); setCurrentPrefix(prefix) }}
                    className={cn(
                        "px-2 py-1 rounded-md hover:bg-muted transition-colors truncate text-xs",
                        isLast ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    {part}
                </button>
            </span>
        )
    }

    const allCount = filteredPrefixes.length + filteredObjects.length
    const allSelected = allCount > 0 && selectedKeys.size >= allCount
    const someSelected = selectedKeys.size > 0 && !allSelected
    const hasSelection = selectedKeys.size > 0
    const selectedFileCount = Array.from(selectedKeys).filter((k) => !k.endsWith("/")).length

    const sharedProps: SharedProps = {
        filteredPrefixes: sortedPrefixes,
        filteredObjects: sortedObjects,
        currentPrefix, selectedKeys, hasSelection,
        onToggleKey: toggleSelectKey,
        onNavigateInto: navigateInto,
        onDownload,
        onOpenPreview: openPreview,
        onDeleteSingle: (key: string) => {
            if (!selectedKeys.has(key)) toggleSelectKey(key)
            setDeleteConfirmOpen(true)
        },
        onCopyS3Path,
        onCopyLink,
        onRenameOpen: (key, isFolder, displayName) => setRenameTarget({ key, isFolder, displayName }),
        onMoveOpen: (items) => setMoveItems(items),
        onShareLinkOpen: (key) => setShareLinkTarget(key),
    }

    return (
        <div
            ref={dropZoneRef}
            className="flex flex-col h-full bg-background relative"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {isDragOver && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-blue-50/80 dark:bg-blue-950/70 backdrop-blur-md border-2 border-dashed border-blue-400/60 dark:border-blue-500/50 pointer-events-none">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
                        <div className="relative size-20 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-300/30 dark:border-blue-600/30">
                            <IconCloudUpload className="size-10 text-blue-500 animate-bounce" />
                        </div>
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-base font-semibold text-blue-700 dark:text-blue-300">Drop files to upload</p>
                        <p className="text-sm text-blue-500/70">Files will be uploaded to the current folder</p>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-1.5 px-3 py-2.5 border-b shrink-0 relative bg-background/80 backdrop-blur-sm">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground shrink-0" onClick={navigateUp} disabled={!currentPrefix || isLoading}>
                            <IconArrowLeft className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Go up</TooltipContent>
                </Tooltip>

                {/* Breadcrumb with overflow */}
                <nav className="flex items-center min-w-0 flex-1 overflow-hidden">
                    <button
                        onClick={() => { clearSelection(); setCurrentPrefix("") }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 text-sm"
                    >
                        <IconHome className="size-3.5" />
                        <span className="font-medium text-xs">{connectionName}</span>
                    </button>

                    {breadcrumbs.length > 0 && (
                        breadcrumbs.length < COLLAPSE_AT
                            ? breadcrumbs.map((part, i) => renderCrumb(part, i))
                            : (
                                <>
                                    {renderCrumb(breadcrumbs[0], 0)}
                                    <span className="flex items-center shrink-0">
                                        <IconChevronRight className="size-3.5 text-muted-foreground/40 mx-0.5 shrink-0" />
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button className="px-1.5 py-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                                    <IconDots className="size-3.5" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent align="start" className="w-auto p-1" sideOffset={6}>
                                                {breadcrumbs.slice(1, -2).map((part, i) => {
                                                    const prefix = breadcrumbs.slice(0, i + 2).join("/") + "/"
                                                    return (
                                                        <button
                                                            key={prefix}
                                                            onClick={() => { clearSelection(); setCurrentPrefix(prefix) }}
                                                            className="flex w-full items-center gap-2 px-3 py-1.5 rounded-sm hover:bg-muted text-xs text-left"
                                                        >
                                                            <IconFolder className="size-3.5 text-muted-foreground shrink-0" />
                                                            {part}
                                                        </button>
                                                    )
                                                })}
                                            </PopoverContent>
                                        </Popover>
                                    </span>
                                    {breadcrumbs.slice(-2).map((part, idx) => {
                                        const i = breadcrumbs.length - 2 + idx
                                        return renderCrumb(part, i)
                                    })}
                                </>
                            )
                    )}
                </nav>

                {/* Search */}
                <div className="relative shrink-0">
                    <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                        className="h-8 pl-8 pr-7 w-44 text-xs bg-muted/60 border-0 focus-visible:ring-1 rounded-lg"
                        placeholder="Search in folder…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                            <IconX className="size-3.5" />
                        </button>
                    )}
                </div>

                <Separator orientation="vertical" className="h-5 mx-1" />

                <div className="flex items-center bg-muted rounded-lg p-0.5 shrink-0">
                    <Button size="icon" variant="ghost" className={cn("size-7 rounded-md transition-all", viewMode === "list" && "bg-background shadow-sm text-foreground")} onClick={() => setViewMode("list")}>
                        <IconLayoutList className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className={cn("size-7 rounded-md transition-all", viewMode === "grid" && "bg-background shadow-sm text-foreground")} onClick={() => setViewMode("grid")}>
                        <IconLayoutGrid className="size-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="h-5 mx-1" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground shrink-0" onClick={() => loadObjects(currentPrefix)} disabled={isLoading}>
                            <IconRefresh className={cn("size-4", isLoading && "animate-spin")} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground shrink-0" onClick={() => setCreateFolderOpen(true)}>
                            <IconFolderPlus className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>New folder</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground shrink-0" onClick={() => fileInputRef.current?.click()}>
                            <IconUpload className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Upload files</TooltipContent>
                </Tooltip>

                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && onUploadFiles(e.target.files)} />

                {/* Zip progress bar */}
                {zipProgress && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
                        <div
                            className="h-full bg-blue-500 transition-[width] duration-300 ease-out"
                            style={{ width: `${(zipProgress.done / zipProgress.total) * 100}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                {isLoading && allCount === 0 ? (
                    <div className="flex flex-col items-center justify-center h-56 gap-3 text-muted-foreground">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-primary/10 blur-lg animate-pulse" />
                            <IconLoader2 className="relative size-7 animate-spin" />
                        </div>
                        <p className="text-sm">Loading…</p>
                    </div>
                ) : allCount === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center h-full min-h-64 gap-4 text-muted-foreground cursor-pointer select-none group/empty"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="relative">
                            <div className="size-24 rounded-3xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center border border-border/30 transition-transform duration-300 group-hover/empty:scale-105">
                                <IconCloudUpload className="size-11 opacity-30 transition-opacity group-hover/empty:opacity-50" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 size-8 rounded-xl bg-primary/10 flex items-center justify-center ring-3 ring-background">
                                <IconPlus className="size-3.5 text-primary/60" />
                            </div>
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-sm font-medium text-foreground/60">This folder is empty</p>
                            <p className="text-xs opacity-50">Drop files or click to upload</p>
                        </div>
                    </div>
                ) : viewMode === "list" ? (
                    <ListView
                        {...sharedProps}
                        allSelected={allSelected}
                        someSelected={someSelected}
                        onSelectAll={allSelected ? clearSelection : selectAll}
                        sortCol={sortCol}
                        sortDir={sortDir}
                        onSort={toggleSort}
                        focusedIndex={focusedIndex}
                        onFocusRow={(i) => setFocusedIndex(i)}
                    />
                ) : (
                    <GridView {...sharedProps} />
                )}

                {isTruncated && (
                    <div className="flex justify-center py-5">
                        <Button variant="outline" size="sm" className="rounded-full px-5" onClick={() => loadObjects(currentPrefix, nextContinuationToken)} disabled={isLoading}>
                            {isLoading && <IconLoader2 className="size-4 animate-spin mr-2" />}
                            Load more
                        </Button>
                    </div>
                )}
            </ScrollArea>

            {/* Selection bar */}
            {hasSelection && (
                <div className="flex items-center gap-3 px-4 py-2.5 border-t border-blue-200/50 dark:border-blue-800/50 bg-blue-50/90 dark:bg-blue-950/40 backdrop-blur-sm shrink-0 animate-in slide-in-from-bottom-2 duration-200">
                    <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onToggle={() => allSelected ? clearSelection() : selectAll()}
                    />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300 flex-1">
                        {selectedKeys.size} selected
                        <span className="ml-2 text-blue-500/60 font-normal text-[11px] hidden sm:inline">Esc to deselect · Del to delete</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                        {selectedFileCount > 1 ? (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 border-blue-200/60 dark:border-blue-800/60 bg-white/50 dark:bg-white/5 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"
                                onClick={onDownloadZip}
                                disabled={!!zipProgress}
                            >
                                <IconPackage className="size-3.5" />
                                {zipProgress ? `${zipProgress.done}/${zipProgress.total}` : "Download ZIP"}
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 border-blue-200/60 dark:border-blue-800/60 bg-white/50 dark:bg-white/5 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"
                                onClick={() => Array.from(selectedKeys).filter((k) => !k.endsWith("/")).forEach((k) => onDownload(k))}
                            >
                                <IconDownload className="size-3.5" /> Download
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5 border-blue-200/60 dark:border-blue-800/60 bg-white/50 dark:bg-white/5 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"
                            onClick={() => setMoveItems(Array.from(selectedKeys).map((k) => ({ key: k, isFolder: k.endsWith("/") })))}
                        >
                            <IconArrowsMove className="size-3.5" /> Move
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs gap-1.5 rounded-lg shadow-sm" onClick={() => setDeleteConfirmOpen(true)} disabled={deleting}>
                            <IconTrash className="size-3.5" /> Delete
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7 text-blue-500/60 hover:text-blue-600 rounded-lg" onClick={clearSelection}>
                            <IconX className="size-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Status bar */}
            {!hasSelection && allCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-1.5 border-t text-[11px] text-muted-foreground/60 shrink-0 bg-muted/20">
                    <span>{filteredPrefixes.length + filteredObjects.length} items</span>
                    {filteredPrefixes.length > 0 && <span>· {filteredPrefixes.length} folder{filteredPrefixes.length !== 1 ? "s" : ""}</span>}
                    {filteredObjects.length > 0 && <span>· {filteredObjects.length} file{filteredObjects.length !== 1 ? "s" : ""}</span>}
                    {currentPrefix && <span className="ml-auto font-mono text-[10px] truncate max-w-xs">/{currentPrefix.replace(/\/$/, "")}</span>}
                </div>
            )}

            {/* Dialogs */}
            <CreateFolderDialog
                open={createFolderOpen}
                onClose={() => setCreateFolderOpen(false)}
                credentials={credentials}
                currentPrefix={currentPrefix}
                onCreated={() => loadObjects(currentPrefix)}
            />
            <AlertDialog open={deleteConfirmOpen} onOpenChange={(o) => !o && setDeleteConfirmOpen(false)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedKeys.size} item{selectedKeys.size > 1 ? "s" : ""}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Permanently deletes the selected files and folders from S3. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {deleting ? "Deleting…" : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <FilePreviewDialog preview={preview} onClose={() => setPreview(null)} onDownload={onDownload} />
            <RenameDialog
                open={!!renameTarget}
                initialName={renameTarget?.displayName ?? ""}
                onClose={() => setRenameTarget(null)}
                onRename={onRename}
            />
            <MoveToDialog
                open={!!moveItems}
                items={moveItems ?? []}
                credentials={credentials}
                currentPrefix={currentPrefix}
                onClose={() => setMoveItems(null)}
                onMoved={() => { clearSelection(); loadObjects(currentPrefix) }}
            />
            <ShareLinkDialog
                open={!!shareLinkTarget}
                fileKey={shareLinkTarget}
                credentials={credentials}
                onClose={() => setShareLinkTarget(null)}
            />
            {uploadPanelOpen && (
                <UploadProgressPanel
                    queue={uploadQueue}
                    onClearCompleted={() => setUploadQueue([])}
                    onDismiss={() => setUploadPanelOpen(false)}
                />
            )}
        </div>
    )
}

// ── Shared props ──────────────────────────────────────────────────────────────

type SharedProps = {
    filteredPrefixes: string[]
    filteredObjects: S3ObjectItem[]
    currentPrefix: string
    selectedKeys: Set<string>
    hasSelection: boolean
    onToggleKey: (key: string) => void
    onNavigateInto: (prefix: string) => void
    onDownload: (key: string) => void
    onOpenPreview: (key: string) => void
    onDeleteSingle: (key: string) => void
    onCopyS3Path: (key: string) => void
    onCopyLink: (key: string) => void
    onRenameOpen: (key: string, isFolder: boolean, displayName: string) => void
    onMoveOpen: (items: { key: string; isFolder: boolean }[]) => void
    onShareLinkOpen: (key: string) => void
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({
    filteredPrefixes, filteredObjects, currentPrefix, selectedKeys, hasSelection,
    allSelected, someSelected, onSelectAll, onToggleKey, onNavigateInto, onDownload, onOpenPreview, onDeleteSingle,
    onCopyS3Path, onCopyLink, onRenameOpen, onMoveOpen, onShareLinkOpen,
    sortCol, sortDir, onSort,
    focusedIndex, onFocusRow,
}: SharedProps & {
    allSelected: boolean; someSelected: boolean; onSelectAll: () => void
    sortCol: SortCol; sortDir: SortDir; onSort: (col: SortCol) => void
    focusedIndex: number | null; onFocusRow: (i: number) => void
}) {
    return (
        <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
                <tr className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                    <th className="w-12 pl-4 pr-2 py-2.5 border-b text-left">
                        <Checkbox checked={allSelected} indeterminate={someSelected} onToggle={onSelectAll} />
                    </th>
                    <SortHeader col="name" label="Name" current={sortCol} dir={sortDir} onSort={onSort} />
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b w-24 hidden md:table-cell">Type</th>
                    <SortHeader col="size" label="Size" current={sortCol} dir={sortDir} onSort={onSort} className="w-24 hidden sm:table-cell" />
                    <SortHeader col="modified" label="Modified" current={sortCol} dir={sortDir} onSort={onSort} className="w-36 hidden lg:table-cell" />
                    <th className="w-12 border-b" />
                </tr>
            </thead>
            <tbody>
                {filteredPrefixes.map((prefix, rowIdx) => {
                    const name = prefix.replace(currentPrefix, "").replace(/\/$/, "")
                    const selected = selectedKeys.has(prefix)
                    const focused = focusedIndex === rowIdx
                    const actions: ItemActionProps = {
                        isFolder: true, isPreviewable: false,
                        onNavigate: () => onNavigateInto(prefix),
                        onDownload: () => {},
                        onDelete: () => onDeleteSingle(prefix),
                        onRename: () => onRenameOpen(prefix, true, name),
                        onMoveOpen: () => onMoveOpen([{ key: prefix, isFolder: true }]),
                        onCopyPath: () => onCopyS3Path(prefix),
                        onCopyLink: null,
                        onShareLink: null,
                    }
                    return (
                        <WithContextMenu key={prefix} {...actions}>
                            <tr
                                {...(focused ? { "data-focused-row": "" } : {})}
                                className={cn(
                                    "group cursor-pointer transition-colors duration-75",
                                    selected ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-muted/40",
                                    focused && "outline outline-2 outline-blue-400/60 dark:outline-blue-600/60 outline-offset-[-2px]",
                                )}
                                onClick={(e) => { if (isCheckboxClick(e)) return; onFocusRow(rowIdx); onNavigateInto(prefix) }}
                            >
                                <td className="pl-4 pr-2 py-2.5 border-b border-border/40">
                                    <Checkbox checked={selected} onToggle={() => onToggleKey(prefix)} />
                                </td>
                                <td className="px-3 py-2.5 border-b border-border/40">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded-lg bg-amber-400/15 flex items-center justify-center shrink-0">
                                            <IconFolder className="size-[18px] text-amber-500" />
                                        </div>
                                        <span className="font-medium truncate">{name}</span>
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 border-b border-border/40 text-xs text-muted-foreground hidden md:table-cell">Folder</td>
                                <td className="px-3 py-2.5 border-b border-border/40 text-xs text-muted-foreground hidden sm:table-cell">—</td>
                                <td className="px-3 py-2.5 border-b border-border/40 text-xs text-muted-foreground hidden lg:table-cell">—</td>
                                <td className="px-3 py-2.5 border-b border-border/40">
                                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <RowActions {...actions} />
                                    </div>
                                </td>
                            </tr>
                        </WithContextMenu>
                    )
                })}
                {filteredObjects.map((obj, idx) => {
                    const name = obj.key.replace(currentPrefix, "")
                    if (!name) return null
                    const rowIdx = filteredPrefixes.length + idx
                    const selected = selectedKeys.has(obj.key)
                    const focused = focusedIndex === rowIdx
                    const type = getFileType(name)
                    const prevable = isPreviewable(type)
                    const actions: ItemActionProps = {
                        isFolder: false, isPreviewable: prevable,
                        onNavigate: null,
                        onPreview: prevable ? () => onOpenPreview(obj.key) : undefined,
                        onDownload: () => onDownload(obj.key),
                        onDelete: () => onDeleteSingle(obj.key),
                        onRename: () => onRenameOpen(obj.key, false, name),
                        onMoveOpen: () => onMoveOpen([{ key: obj.key, isFolder: false }]),
                        onCopyPath: () => onCopyS3Path(obj.key),
                        onCopyLink: () => onCopyLink(obj.key),
                        onShareLink: () => onShareLinkOpen(obj.key),
                    }
                    return (
                        <WithContextMenu key={obj.key} {...actions}>
                            <tr
                                {...(focused ? { "data-focused-row": "" } : {})}
                                className={cn(
                                    "group cursor-pointer transition-colors duration-75",
                                    selected ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-muted/40",
                                    focused && "outline outline-2 outline-blue-400/60 dark:outline-blue-600/60 outline-offset-[-2px]",
                                )}
                                onClick={(e) => { if (!isCheckboxClick(e)) { onFocusRow(rowIdx); onToggleKey(obj.key) } }}
                                onDoubleClick={() => prevable ? onOpenPreview(obj.key) : onDownload(obj.key)}
                            >
                                <td className="pl-4 pr-2 py-2.5 border-b border-border/40">
                                    <div className={cn("transition-opacity duration-100", !hasSelection && !selected ? "opacity-0 group-hover:opacity-100" : "opacity-100")}>
                                        <Checkbox checked={selected} onToggle={() => onToggleKey(obj.key)} />
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 border-b border-border/40">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0", TYPE_BG_CLASS[type])}>
                                            <FileIconComp type={type} className="size-[18px]" />
                                        </div>
                                        <span className="font-medium truncate">{name}</span>
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 border-b border-border/40 text-xs text-muted-foreground hidden md:table-cell">{TYPE_LABEL[type]}</td>
                                <td className="px-3 py-2.5 border-b border-border/40 text-xs text-muted-foreground hidden sm:table-cell">
                                    {obj.size != null ? formatBytes(obj.size) : "—"}
                                </td>
                                <td className="px-3 py-2.5 border-b border-border/40 text-xs text-muted-foreground hidden lg:table-cell">
                                    {obj.lastModified ? new Date(obj.lastModified).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}
                                </td>
                                <td className="px-3 py-2.5 border-b border-border/40">
                                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <RowActions {...actions} />
                                    </div>
                                </td>
                            </tr>
                        </WithContextMenu>
                    )
                })}
            </tbody>
        </table>
    )
}

// ── Grid view ─────────────────────────────────────────────────────────────────

function GridView({
    filteredPrefixes, filteredObjects, currentPrefix, selectedKeys, hasSelection,
    onToggleKey, onNavigateInto, onDownload, onOpenPreview, onDeleteSingle,
    onCopyS3Path, onCopyLink, onRenameOpen, onMoveOpen, onShareLinkOpen,
}: SharedProps) {
    return (
        <div className="p-5 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {filteredPrefixes.map((prefix) => {
                const name = prefix.replace(currentPrefix, "").replace(/\/$/, "")
                const selected = selectedKeys.has(prefix)
                const actions: ItemActionProps = {
                    isFolder: true, isPreviewable: false,
                    onNavigate: () => onNavigateInto(prefix),
                    onDownload: () => {},
                    onDelete: () => onDeleteSingle(prefix),
                    onRename: () => onRenameOpen(prefix, true, name),
                    onMoveOpen: () => onMoveOpen([{ key: prefix, isFolder: true }]),
                    onCopyPath: () => onCopyS3Path(prefix),
                    onCopyLink: null,
                    onShareLink: null,
                }
                return (
                    <WithContextMenu key={prefix} {...actions}>
                        <div
                            className={cn(
                                "group relative flex flex-col rounded-xl border overflow-hidden cursor-pointer select-none transition-all duration-200",
                                selected
                                    ? "border-blue-400 dark:border-blue-600 ring-2 ring-blue-200 dark:ring-blue-900 shadow-sm"
                                    : "border-border/60 hover:border-border hover:shadow-lg hover:-translate-y-0.5",
                            )}
                            onClick={(e) => { if (!isCheckboxClick(e)) onNavigateInto(prefix) }}
                        >
                            <div className={cn(
                                "relative flex items-center justify-center h-28",
                                selected ? "bg-blue-50 dark:bg-blue-950/30" : "bg-amber-400/10 group-hover:bg-amber-400/15 transition-colors",
                            )}>
                                <IconFolder className="size-14 text-amber-500 drop-shadow-sm" />
                                <div className={cn("absolute top-2 left-2 transition-opacity duration-100", hasSelection || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                                    <Checkbox checked={selected} onToggle={() => onToggleKey(prefix)} />
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-1 rounded-md bg-white/70 dark:bg-black/50 backdrop-blur-sm hover:bg-white dark:hover:bg-black/70" onClick={(e) => { e.stopPropagation(); onRenameOpen(prefix, true, name) }}>
                                        <IconPencil className="size-3.5 text-muted-foreground" />
                                    </button>
                                    <button className="p-1 rounded-md bg-white/70 dark:bg-black/50 backdrop-blur-sm hover:bg-white dark:hover:bg-black/70" onClick={(e) => { e.stopPropagation(); onNavigateInto(prefix) }}>
                                        <IconChevronRight className="size-3.5 text-muted-foreground" />
                                    </button>
                                </div>
                            </div>
                            <div className={cn("px-3 py-2.5 border-t", selected ? "bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" : "bg-background border-border/40")}>
                                <p className="text-xs font-semibold truncate leading-snug" title={name}>{name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Folder</p>
                            </div>
                        </div>
                    </WithContextMenu>
                )
            })}

            {filteredObjects.map((obj) => {
                const name = obj.key.replace(currentPrefix, "")
                if (!name) return null
                const selected = selectedKeys.has(obj.key)
                const type = getFileType(name)
                const prevable = isPreviewable(type)
                const actions: ItemActionProps = {
                    isFolder: false, isPreviewable: prevable,
                    onNavigate: null,
                    onPreview: prevable ? () => onOpenPreview(obj.key) : undefined,
                    onDownload: () => onDownload(obj.key),
                    onDelete: () => onDeleteSingle(obj.key),
                    onRename: () => onRenameOpen(obj.key, false, name),
                    onMoveOpen: () => onMoveOpen([{ key: obj.key, isFolder: false }]),
                    onCopyPath: () => onCopyS3Path(obj.key),
                    onCopyLink: () => onCopyLink(obj.key),
                    onShareLink: () => onShareLinkOpen(obj.key),
                }
                return (
                    <WithContextMenu key={obj.key} {...actions}>
                        <div
                            className={cn(
                                "group relative flex flex-col rounded-xl border overflow-hidden cursor-pointer select-none transition-all duration-200",
                                selected
                                    ? "border-blue-400 dark:border-blue-600 ring-2 ring-blue-200 dark:ring-blue-900 shadow-sm"
                                    : "border-border/60 hover:border-border hover:shadow-lg hover:-translate-y-0.5",
                            )}
                            onClick={(e) => { if (!isCheckboxClick(e)) onToggleKey(obj.key) }}
                            onDoubleClick={() => prevable ? onOpenPreview(obj.key) : onDownload(obj.key)}
                        >
                            <div className={cn(
                                "relative flex items-center justify-center h-28",
                                selected ? "bg-blue-50 dark:bg-blue-950/30" : TYPE_BG_CLASS[type],
                            )}>
                                <FileIconComp type={type} className="size-14 drop-shadow-sm" />
                                <div className={cn("absolute top-2 left-2 transition-opacity duration-100", hasSelection || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                                    <Checkbox checked={selected} onToggle={() => onToggleKey(obj.key)} />
                                </div>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-1 rounded-md bg-white/70 dark:bg-black/50 backdrop-blur-sm hover:bg-white dark:hover:bg-black/70" onClick={(e) => { e.stopPropagation(); onRenameOpen(obj.key, false, name) }}>
                                        <IconPencil className="size-3.5 text-muted-foreground" />
                                    </button>
                                    {prevable && (
                                        <button className="p-1 rounded-md bg-white/70 dark:bg-black/50 backdrop-blur-sm hover:bg-white dark:hover:bg-black/70" onClick={(e) => { e.stopPropagation(); onOpenPreview(obj.key) }}>
                                            <IconEye className="size-3.5 text-muted-foreground" />
                                        </button>
                                    )}
                                    <button className="p-1 rounded-md bg-white/70 dark:bg-black/50 backdrop-blur-sm hover:bg-white dark:hover:bg-black/70" onClick={(e) => { e.stopPropagation(); onDownload(obj.key) }}>
                                        <IconDownload className="size-3.5 text-muted-foreground" />
                                    </button>
                                    <button className="p-1 rounded-md bg-white/70 dark:bg-black/50 backdrop-blur-sm hover:bg-white dark:hover:bg-black/70" onClick={(e) => { e.stopPropagation(); onDeleteSingle(obj.key) }}>
                                        <IconTrash className="size-3.5 text-destructive/80" />
                                    </button>
                                </div>
                            </div>
                            <div className={cn("px-3 py-2.5 border-t", selected ? "bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" : "bg-background border-border/40")}>
                                <p className="text-xs font-semibold truncate leading-snug" title={name}>{name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {obj.size != null ? formatBytes(obj.size) : TYPE_LABEL[type]}
                                </p>
                            </div>
                        </div>
                    </WithContextMenu>
                )
            })}
        </div>
    )
}

// ── Row actions (dropdown) ────────────────────────────────────────────────────

function RowActions({
    isFolder, isPreviewable: prevable, onNavigate, onPreview, onDownload, onDelete, onRename, onMoveOpen, onCopyPath, onCopyLink, onShareLink,
}: ItemActionProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7" onClick={(e) => e.stopPropagation()}>
                    <IconDots className="size-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                {isFolder && onNavigate && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onNavigate() }}>
                        <IconChevronRight className="size-4 mr-2" /> Open
                    </DropdownMenuItem>
                )}
                {prevable && onPreview && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview() }}>
                        <IconEye className="size-4 mr-2" /> Preview
                    </DropdownMenuItem>
                )}
                {!isFolder && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload() }}>
                        <IconDownload className="size-4 mr-2" /> Download
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename() }}>
                    <IconPencil className="size-4 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveOpen() }}>
                    <IconArrowsMove className="size-4 mr-2" /> Move to…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyPath() }}>
                    <IconCopy className="size-4 mr-2" /> Copy S3 path
                </DropdownMenuItem>
                {onCopyLink && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyLink() }}>
                        <IconLink className="size-4 mr-2" /> Copy link
                    </DropdownMenuItem>
                )}
                {onShareLink && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShareLink() }}>
                        <IconShare className="size-4 mr-2" /> Share link…
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete() }}>
                    <IconTrash className="size-4 mr-2" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
