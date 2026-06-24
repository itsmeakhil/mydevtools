"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { IconCopy, IconLink, IconLoader2 } from "@tabler/icons-react"
import { getPresignedDownloadUrl, type S3Credentials } from "@/lib/s3-drive-api"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"

export function ShareLinkDialog({
    open, fileKey, credentials, onClose,
}: {
    open: boolean
    fileKey: string | null
    credentials: S3Credentials
    onClose: () => void
}) {
    const { copyToClipboard } = useCopyToClipboard()
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
                                    onClick={() => void copyToClipboard(url, "Copied!")}
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
