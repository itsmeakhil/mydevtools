"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { IconDownload, IconLoader2, IconX } from "@tabler/icons-react"
import { FileIconComp } from "./file-icon"

export type PreviewState = {
    key: string
    url: string | null
    loading: boolean
    fileType: string
    textContent?: string
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
        if (!preview.url) {
            return <p className="text-sm text-muted-foreground p-8 text-center">Failed to load preview</p>
        }
        if (preview.fileType === "image") {
            return (
                <div className="flex items-center justify-center bg-muted/50 min-h-72 max-h-[80vh] overflow-auto p-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview.url} alt={name} loading="lazy" decoding="async" className="max-w-full max-h-full object-contain rounded-md shadow-elev-2" />
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
                    <div className="flex-1 overflow-auto bg-muted/40 p-4" style={{ maxHeight: "72vh" }}>
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
        // Provider lives here so every consumer of this dialog gets working
        // tooltips — Radix Tooltip throws without an ancestor provider.
        <TooltipProvider delayDuration={300}>
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-5xl w-full p-0 overflow-hidden gap-0 flex flex-col">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 h-12 px-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <FileIconComp type={preview.fileType} className="size-4 shrink-0" />
                        <DialogTitle className="text-[13px] font-semibold truncate max-w-lg">{name}</DialogTitle>
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
