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
import { Save } from "lucide-react"
import { useTranslations } from "next-intl"

interface SaveRequestDialogProps {
    collections: Collection[]
    onSave: (parentId: string, name: string) => void
    defaultName?: string
}

export function SaveRequestDialog({ collections, onSave, defaultName }: SaveRequestDialogProps) {
    const t = useTranslations("ApiClient.saveRequest")
    const [open, setOpen] = React.useState(false)
    const [name, setName] = React.useState(defaultName || "")
    const [selectedFolderId, setSelectedFolderId] = React.useState<string>("")

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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Save className="h-4 w-4" />
                    {t("trigger")}
                </Button>
            </DialogTrigger>
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
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave}>{t("save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
