"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { createFolder } from "@/lib/s3-drive-api"
import type { S3Credentials } from "@/lib/s3-drive-api"

type Props = {
    open: boolean
    onClose: () => void
    credentials: S3Credentials
    currentPrefix: string
    onCreated: () => void
}

export function CreateFolderDialog({ open, onClose, credentials, currentPrefix, onCreated }: Props) {
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)

    async function onSubmit() {
        const trimmed = name.trim().replace(/\//g, "")
        if (!trimmed) { toast.error("Folder name required"); return }
        setLoading(true)
        try {
            await createFolder(credentials, `${currentPrefix}${trimmed}`)
            toast.success("Folder created")
            setName("")
            onCreated()
            onClose()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create folder")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>New folder</DialogTitle>
                </DialogHeader>
                <div className="py-2 space-y-1.5">
                    <Label>Folder name</Label>
                    <Input
                        placeholder="my-folder"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={onSubmit} disabled={loading}>
                        {loading ? "Creating…" : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
