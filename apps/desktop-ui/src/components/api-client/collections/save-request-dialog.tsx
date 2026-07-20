"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Collection, CollectionFolder, CollectionRequest } from "../types"
import { FolderPlus, Save } from "lucide-react"
import { useTranslations } from "next-intl"

interface SaveRequestDialogProps {
    collections: Collection[]
    onSave: (parentId: string, name: string) => void
    /** Create a folder inside parentId; resolves with the new folder's id. */
    onCreateFolder?: (parentId: string, name: string) => Promise<string | void>
    /** Create a root collection; resolves with the created collection. */
    onCreateCollection?: (name: string) => Promise<Collection | void>
    defaultName?: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function SaveRequestDialog({ collections, onSave, onCreateFolder, onCreateCollection, defaultName, open: openProp, onOpenChange }: SaveRequestDialogProps) {
    const t = useTranslations("ApiClient.saveRequest")
    const [openInternal, setOpenInternal] = React.useState(false)
    const open = openProp !== undefined ? openProp : openInternal
    const setOpen = onOpenChange ?? setOpenInternal
    const [name, setName] = React.useState(defaultName || "")
    const [selectedFolderId, setSelectedFolderId] = React.useState<string>("")
    const [creatingFolder, setCreatingFolder] = React.useState(false)
    const [newFolderName, setNewFolderName] = React.useState("")
    const [isCreating, setIsCreating] = React.useState(false)

    // Flatten folders for selection
    const getFolders = (items: (CollectionFolder | CollectionRequest)[], prefix = ""): { id: string, name: string }[] => {
        let folders: { id: string, name: string }[] = []
        items.forEach(item => {
            if ("type" in item && item.type === "folder") {
                folders.push({ id: item.id, name: prefix + item.name })
                folders = [...folders, ...getFolders(item.items, prefix + item.name + " / ")]
            }
        })
        return folders
    }

    const allFolders = React.useMemo(() => {
        let folders: { id: string, name: string }[] = []
        collections.forEach(col => {
            folders.push({ id: col.id, name: col.name })
            folders = [...folders, ...getFolders(col.items, col.name + " / ")]
        })
        return folders
    }, [collections])

    React.useEffect(() => {
        if (open && allFolders.length > 0 && !selectedFolderId) {
            setSelectedFolderId(allFolders[0].id)
        }
        if (open && defaultName) {
            setName(defaultName)
        }
    }, [open, allFolders, defaultName, selectedFolderId])

    const handleSave = () => {
        if (name && selectedFolderId) {
            onSave(selectedFolderId, name)
            setOpen(false)
        }
    }

    const handleCreateFolder = async () => {
        const folderName = newFolderName.trim()
        if (!folderName || isCreating) return
        setIsCreating(true)
        try {
            // No folder selected (e.g. nothing exists yet) → create a root
            // collection; otherwise nest a folder inside the selection.
            if (selectedFolderId && onCreateFolder) {
                const id = await onCreateFolder(selectedFolderId, folderName)
                if (id) setSelectedFolderId(id)
            } else if (onCreateCollection) {
                const created = await onCreateCollection(folderName)
                if (created) setSelectedFolderId(created.id)
            }
            setNewFolderName("")
            setCreatingFolder(false)
        } finally {
            setIsCreating(false)
        }
    }

    const isControlled = openProp !== undefined

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Save className="h-4 w-4" />
                        {t("trigger")}
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("dialogTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("dialogDescription")}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t("labelName")}</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("placeholderName")}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="folder">{t("labelFolder")}</Label>
                        <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("placeholderFolder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {allFolders.map((folder) => (
                                    <SelectItem key={folder.id} value={folder.id}>
                                        {folder.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {(onCreateFolder || onCreateCollection) && (
                            creatingFolder ? (
                                <div className="flex gap-2">
                                    <Input
                                        autoFocus
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder={t("newFolderPlaceholder")}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault()
                                                void handleCreateFolder()
                                            }
                                            if (e.key === "Escape") {
                                                setCreatingFolder(false)
                                                setNewFolderName("")
                                            }
                                        }}
                                    />
                                    <Button
                                        variant="secondary"
                                        onClick={() => void handleCreateFolder()}
                                        disabled={!newFolderName.trim() || isCreating}
                                    >
                                        {t("create")}
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-fit gap-2 px-2 text-muted-foreground"
                                    onClick={() => setCreatingFolder(true)}
                                >
                                    <FolderPlus className="h-4 w-4" />
                                    {t("newFolder")}
                                </Button>
                            )
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave}>{t("save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
