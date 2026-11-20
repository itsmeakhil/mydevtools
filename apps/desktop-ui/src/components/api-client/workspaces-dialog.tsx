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
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { useWorkspacesContext } from "./context/workspaces-context"

interface WorkspacesDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function WorkspacesDialog({ open, onOpenChange }: WorkspacesDialogProps) {
    const t = useTranslations("ApiClient.workspaces")
    const { workspaces, activeId, setActiveId, createWorkspace, renameWorkspace, deleteWorkspace } = useWorkspacesContext()
    const [newName, setNewName] = React.useState("")
    /** Row being renamed inline, and its draft name. */
    const [renaming, setRenaming] = React.useState<{ id: string; name: string } | null>(null)
    /** Row showing the inline delete confirmation. */
    const [confirmingDelete, setConfirmingDelete] = React.useState<string | null>(null)

    const create = async () => {
        const name = newName.trim()
        if (!name) return
        const created = await createWorkspace(name)
        if (created) { setNewName(""); setActiveId(created.id) }
    }

    const commitRename = async () => {
        if (!renaming) return
        const { id, name } = renaming
        setRenaming(null)
        const current = workspaces.find((w) => w.id === id)?.name
        if (name.trim() && name.trim() !== current) await renameWorkspace(id, name.trim())
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-1">
                    <Label htmlFor="new-workspace" className="text-xs">{t("createLabel")}</Label>
                    <div className="flex gap-2">
                        <Input
                            id="new-workspace"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder={t("createPlaceholder")}
                            className="h-9"
                            onKeyDown={(e) => { if (e.key === "Enter") void create() }}
                        />
                        <Button disabled={!newName.trim()} onClick={() => void create()}>
                            <Plus className="h-4 w-4 mr-1" /> {t("add")}
                        </Button>
                    </div>
                </div>
                <ScrollArea className="flex-1 min-h-[200px] border rounded-lg">
                    <div className="p-2 space-y-1">
                        <button
                            className={cn(
                                "w-full flex items-center justify-between rounded-md p-2 text-sm text-left",
                                activeId === null ? "bg-muted/60" : "hover:bg-muted/40",
                            )}
                            onClick={() => setActiveId(null)}
                        >
                            <span className="font-semibold">{t("all")}</span>
                            <span className="text-[10px] text-muted-foreground">{t("allHint")}</span>
                        </button>
                        {workspaces.map((w) => {
                            if (renaming?.id === w.id) {
                                return (
                                    <div key={w.id} className="flex items-center gap-2 rounded-md p-1.5">
                                        <Input
                                            autoFocus
                                            aria-label={t("rename")}
                                            value={renaming.name}
                                            onChange={(e) => setRenaming({ id: w.id, name: e.target.value })}
                                            onBlur={() => void commitRename()}
                                            onKeyDown={(e) => {
                                                // Keep Esc from closing the whole dialog.
                                                e.stopPropagation()
                                                if (e.key === "Enter") void commitRename()
                                                if (e.key === "Escape") setRenaming(null)
                                            }}
                                            className="h-8"
                                        />
                                    </div>
                                )
                            }
                            if (confirmingDelete === w.id) {
                                return (
                                    <div key={w.id} className="flex items-center gap-2 rounded-md p-2 text-sm bg-destructive/[0.06]">
                                        <div className="flex-1 min-w-0">
                                            <p className="truncate font-medium">{t("confirmDelete", { name: w.name })}</p>
                                            <p className="text-xs text-muted-foreground">{t("confirmDeleteHint")}</p>
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(null)}>
                                            {t("cancel")}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={async () => {
                                                setConfirmingDelete(null)
                                                await deleteWorkspace(w.id)
                                            }}
                                        >
                                            {t("delete")}
                                        </Button>
                                    </div>
                                )
                            }
                            return (
                                <div
                                    key={w.id}
                                    className={cn(
                                        "group flex items-center gap-2 rounded-md p-2 text-sm",
                                        activeId === w.id ? "bg-muted/60" : "hover:bg-muted/40",
                                    )}
                                >
                                    <button className="flex-1 truncate text-left" onClick={() => setActiveId(w.id)}>
                                        {w.name}
                                    </button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        aria-label={t("rename")}
                                        title={t("rename")}
                                        onClick={() => { setConfirmingDelete(null); setRenaming({ id: w.id, name: w.name }) }}
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        aria-label={t("delete")}
                                        title={t("delete")}
                                        onClick={() => { setRenaming(null); setConfirmingDelete(w.id) }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
