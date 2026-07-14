"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2, Plus, Pencil } from "lucide-react"
import { useWorkspacesContext } from "./context/workspaces-context"

interface WorkspacesDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function WorkspacesDialog({ open, onOpenChange }: WorkspacesDialogProps) {
    const { workspaces, activeId, setActiveId, createWorkspace, renameWorkspace, deleteWorkspace } = useWorkspacesContext()
    const [newName, setNewName] = React.useState("")

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Workspaces</DialogTitle>
                    <DialogDescription>
                        Group collections by team / project / env. The active workspace filters
                        what shows in the sidebar.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-1">
                    <Label className="text-xs">Create workspace</Label>
                    <div className="flex gap-2">
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="e.g. Acme Prod"
                            className="h-9"
                            onKeyDown={async (e) => {
                                if (e.key === "Enter" && newName.trim()) {
                                    const created = await createWorkspace(newName.trim())
                                    if (created) { setNewName(""); setActiveId(created.id) }
                                }
                            }}
                        />
                        <Button
                            disabled={!newName.trim()}
                            onClick={async () => {
                                const created = await createWorkspace(newName.trim())
                                if (created) { setNewName(""); setActiveId(created.id) }
                            }}
                        >
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>
                </div>
                <ScrollArea className="flex-1 min-h-[200px] border rounded-lg">
                    <div className="p-2 space-y-1">
                        <div
                            className={`flex items-center justify-between rounded-md p-2 text-sm cursor-pointer ${activeId === null ? "bg-muted/60" : "hover:bg-muted/40"}`}
                            onClick={() => setActiveId(null)}
                        >
                            <span className="font-semibold">All collections (default)</span>
                            <span className="text-[10px] text-muted-foreground">no workspace filter</span>
                        </div>
                        {workspaces.map((w) => (
                            <div
                                key={w.id}
                                className={`flex items-center gap-2 rounded-md p-2 text-sm cursor-pointer ${activeId === w.id ? "bg-muted/60" : "hover:bg-muted/40"}`}
                                onClick={() => setActiveId(w.id)}
                            >
                                <span className="flex-1 truncate">{w.name}</span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={async (e) => {
                                        e.stopPropagation()
                                        const next = window.prompt("Rename workspace:", w.name)
                                        if (next && next.trim() && next.trim() !== w.name) await renameWorkspace(w.id, next.trim())
                                    }}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={async (e) => {
                                        e.stopPropagation()
                                        if (!window.confirm(`Delete workspace "${w.name}"? Collections reset to default.`)) return
                                        await deleteWorkspace(w.id)
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
