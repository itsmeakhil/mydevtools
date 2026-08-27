"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { IconDownload, IconLoader2, IconX } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { FileIconComp } from "./file-icon"
import { TYPE_BG_CLASS } from "./file-types"

export type PreviewState = {
    key: string
    url: string | null
    loading: boolean
    fileType: string
    textContent?: string
    /** Extracted grid for spreadsheet previews (see lib/office-preview). */
    rows?: string[][]
}

export function FilePreviewDialog({
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
        if (preview.fileType === "sheet") {
            if (!preview.rows?.length) {
                return <p className="text-sm text-muted-foreground p-8 text-center">This spreadsheet format can&apos;t be previewed — download it to open in an app.</p>
            }
            const [head, ...body] = preview.rows
            return (
                <div className="flex-1 overflow-auto" style={{ maxHeight: "72vh" }}>
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                            <tr>
                                {head.map((cell, i) => (
                                    <th key={i} className="border-b border-r px-2.5 py-1.5 text-left font-medium">{cell}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {body.map((row, r) => (
                                <tr key={r} className="even:bg-muted/20">
                                    {row.map((cell, c) => (
                                        <td key={c} className="border-b border-r px-2.5 py-1.5 align-top tabular-nums">{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
        // Everything below renders the blob/presigned URL; extracted text and
        // grids above don't need one.
        if (!preview.url) {
            return <p className="text-sm text-muted-foreground p-8 text-center">Failed to load preview</p>
        }
        if (preview.fileType === "image") {
            return (
                <div className="flex items-center justify-center bg-muted/50 min-h-72 max-h-[80vh] overflow-auto p-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview.url} alt={name} loading="lazy" decoding="async" className="max-w-full max-h-full object-contain rounded-md shadow" />
                </div>
            )
        }
        if (preview.fileType === "pdf") {
            return (
                // flex-1 only fills when the dialog itself has a height — see
                // the h-[85vh] below; a min-height here just made it scroll.
                <iframe src={preview.url} title={name} className="w-full flex-1 min-h-0 border-0" />
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
        return null
    })()

    return (
        // Provider lives here so every consumer of this dialog gets working
        // tooltips — Radix Tooltip throws without an ancestor provider.
        <TooltipProvider delayDuration={300}>
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent
                showCloseButton={false}
                className={cn(
                    "max-w-5xl w-full p-0 overflow-hidden gap-0 flex flex-col",
                    // PDFs render in an iframe that has to be told how tall to be.
                    preview.fileType === "pdf" && "h-[85vh]",
                )}
            >
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
        </TooltipProvider>
    )
}
