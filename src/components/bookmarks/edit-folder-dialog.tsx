"use client"

import { useState, useCallback, useEffect } from "react"
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
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface EditFolderDialogProps {
    folder: BookmarkFolder | null
    onOpenChange: (open: boolean) => void
}

export default function EditFolderDialog({ folder, onOpenChange }: EditFolderDialogProps) {
    const t = useTranslations("Bookmarks.editFolder")
    const { updateFolder } = useBookmarkStore()

    const [name, setName] = useState("")

    useEffect(() => {
        if (folder) {
            setName(folder.name)
        }
    }, [folder])

    const handleSubmit = useCallback(() => {
        if (!folder) return

        if (!name.trim()) {
            toast.error(t("nameRequired"))
            return
        }

        updateFolder({
            ...folder,
            name: name.trim()
        })

        toast.success(t("toastRenamed"))
        onOpenChange(false)
    }, [folder, name, updateFolder, onOpenChange, t])

    return (
        <Dialog open={folder !== null} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="editFolderName">{t("nameLabel")}</Label>
                        <div className="relative">
                            <IconFolder className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="editFolderName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                placeholder={t("namePlaceholder")}
                                className="pl-9"
                                autoFocus
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("cancel")}
                    </Button>
                    <Button onClick={handleSubmit}>
                        {t("save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
