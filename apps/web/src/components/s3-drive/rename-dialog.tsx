"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function RenameDialog({
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
