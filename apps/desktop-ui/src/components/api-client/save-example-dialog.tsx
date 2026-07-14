"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SaveExampleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultName: string
    onSave: (name: string) => void
}

export function SaveExampleDialog({ open, onOpenChange, defaultName, onSave }: SaveExampleDialogProps) {
    const [name, setName] = React.useState(defaultName)
    React.useEffect(() => { if (open) setName(defaultName) }, [open, defaultName])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Save response as example</DialogTitle>
                    <DialogDescription>
                        Snapshots the current request shape + response body. Examples are useful for
                        docs, regression checks, and (soon) mock-server responses.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                    <Label>Example name</Label>
                    <Input
                        value={name}
                        autoFocus
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && name.trim()) {
                                onSave(name.trim())
                                onOpenChange(false)
                            }
                        }}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button disabled={!name.trim()} onClick={() => { onSave(name.trim()); onOpenChange(false) }}>
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
