"use client"

import { useState, useCallback } from "react"
import { IconFolder } from "@tabler/icons-react"
import { useBookmarkStore, BookmarkFolder } from "@/store/bookmark-store"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface AddFolderDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    parentFolderId?: string
}

export default function AddFolderDialog({ open, onOpenChange, parentFolderId }: AddFolderDialogProps) {
    const t = useTranslations("Bookmarks.addFolder")
    const { folders, addFolder } = useBookmarkStore()

    const [name, setName] = useState("")
    const [selectedParentId, setSelectedParentId] = useState<string>(parentFolderId || "none")

    const handleSubmit = useCallback(() => {
        if (!name.trim()) {
            toast.error(t("nameRequired"))
            return
        }

        const newFolder: BookmarkFolder = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            parentId: selectedParentId === "none" ? null : selectedParentId,
            createdAt: Date.now(),
            isExpanded: false
        }

        addFolder(newFolder)
        toast.success(t("toastCreated"))
        onOpenChange(false)
        setName("")
        setSelectedParentId("none")
    }, [name, selectedParentId, addFolder, onOpenChange, t])

    // Build folder options with hierarchy
    const buildFolderOptions = useCallback(() => {
        const options: { id: string; name: string; depth: number }[] = []

        const addFolderToOptions = (parentId: string | null, depth: number) => {
            const children = folders.filter(f => f.parentId === parentId)
            for (const folder of children) {
                options.push({ id: folder.id, name: folder.name, depth })
                addFolderToOptions(folder.id, depth + 1)
            }
        }

        addFolderToOptions(null, 0)
        return options
    }, [folders])

    const folderOptions = buildFolderOptions()

    const handleOpenChange = useCallback((open: boolean) => {
        if (!open) {
            setName("")
            setSelectedParentId(parentFolderId || "none")
        } else if (parentFolderId) {
            setSelectedParentId(parentFolderId)
        }
        onOpenChange(open)
    }, [onOpenChange, parentFolderId])

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Folder Name */}
                    <div className="space-y-2">
                        <Label htmlFor="folderName">{t("nameLabel")}</Label>
                        <div className="relative">
                            <IconFolder className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="folderName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                placeholder={t("namePlaceholder")}
                                className="pl-9"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Parent Folder */}
                    <div className="space-y-2">
                        <Label>{t("parentLabel")}</Label>
                        <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("parentPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    {t("rootParent")}
                                </SelectItem>
                                {folderOptions.map(option => (
                                    <SelectItem key={option.id} value={option.id}>
                                        <span style={{ paddingLeft: `${option.depth * 12}px` }}>
                                            {option.name}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        {t("cancel")}
                    </Button>
                    <Button onClick={handleSubmit}>
                        {t("submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
