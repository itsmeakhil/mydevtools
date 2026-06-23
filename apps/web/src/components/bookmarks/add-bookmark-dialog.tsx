"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { IconLink, IconTag, IconFolder, IconX, IconLoader2 } from "@tabler/icons-react"
import { useBookmarkStore, Bookmark, useAllTags } from "@/store/bookmark-store"
import { normalizeUrl, isValidUrl } from "@/lib/favicon-utils"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface AddBookmarkDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editingId?: string | null
}

export default function AddBookmarkDialog({ open, onOpenChange, editingId }: AddBookmarkDialogProps) {
    const t = useTranslations("Bookmarks.addBookmark")
    const { bookmarks, folders, addBookmark, updateBookmark } = useBookmarkStore()
    const allTags = useAllTags()

    const [url, setUrl] = useState("")
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [folderId, setFolderId] = useState<string>("none")
    const [tags, setTags] = useState<string[]>([])
    const [tagInput, setTagInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [urlError, setUrlError] = useState("")

    // Load bookmark data when editing
    useEffect(() => {
        if (editingId && open) {
            const bookmark = bookmarks.find(b => b.id === editingId)
            if (bookmark) {
                setUrl(bookmark.url)
                setTitle(bookmark.title)
                setDescription(bookmark.description || "")
                setFolderId(bookmark.folderId || "none")
                setTags(bookmark.tags)
            }
        } else if (!open) {
            // Reset form when closing
            setUrl("")
            setTitle("")
            setDescription("")
            setFolderId("none")
            setTags([])
            setTagInput("")
            setUrlError("")
        }
    }, [editingId, open, bookmarks])

    const handleUrlBlur = useCallback(async () => {
        if (!url) return

        const normalizedUrl = normalizeUrl(url)
        if (!isValidUrl(normalizedUrl)) {
            setUrlError(t("urlInvalid"))
            return
        }

        setUrlError("")
        setUrl(normalizedUrl)

        // Leave title empty — domain fallback produces low-quality titles
    }, [url, title, t])

    const handleAddTag = useCallback(() => {
        const tag = tagInput.trim().toLowerCase()
        if (tag && !tags.includes(tag)) {
            setTags([...tags, tag])
        }
        setTagInput("")
    }, [tagInput, tags])

    const handleRemoveTag = useCallback((tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove))
    }, [tags])

    const handleTagInputKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            handleAddTag()
        }
    }, [handleAddTag])

    const handleSubmit = useCallback(() => {
        const normalizedUrl = normalizeUrl(url)

        if (!isValidUrl(normalizedUrl)) {
            setUrlError(t("urlInvalid"))
            return
        }

        if (!title.trim()) {
            toast.error(t("titleRequired"))
            return
        }

        if (!editingId) {
            const duplicate = bookmarks.find(b => b.url === normalizedUrl)
            if (duplicate) {
                toast.error(`Already saved as "${duplicate.title}"`)
                return
            }
        }

        setIsLoading(true)

        const bookmarkData: Bookmark = {
            id: editingId || `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            url: normalizedUrl,
            title: title.trim(),
            description: description.trim() || undefined,
            folderId: folderId === "none" ? null : folderId,
            tags,
            createdAt: editingId ? bookmarks.find(b => b.id === editingId)?.createdAt || Date.now() : Date.now(),
            updatedAt: Date.now()
        }

        if (editingId) {
            updateBookmark(bookmarkData)
            toast.success(t("toastUpdated"))
        } else {
            addBookmark(bookmarkData)
            toast.success(t("toastAdded"))
        }

        setIsLoading(false)
        onOpenChange(false)
    }, [url, title, description, folderId, tags, editingId, bookmarks, addBookmark, updateBookmark, onOpenChange, t])

    const folderOptions = useMemo(() => {
        const options: { id: string; name: string; depth: number }[] = []
        const addFolder = (parentId: string | null, depth: number) => {
            for (const folder of folders.filter(f => f.parentId === parentId)) {
                options.push({ id: folder.id, name: folder.name, depth })
                addFolder(folder.id, depth + 1)
            }
        }
        addFolder(null, 0)
        return options
    }, [folders])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {editingId ? t("titleEdit") : t("titleAdd")}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* URL */}
                    <div className="space-y-2">
                        <Label htmlFor="url">{t("urlLabel")}</Label>
                        <div className="relative">
                            <IconLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onBlur={handleUrlBlur}
                                placeholder={t("urlPlaceholder")}
                                className="pl-9"
                            />
                        </div>
                        {urlError && (
                            <p className="text-xs text-destructive">{urlError}</p>
                        )}
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">{t("titleLabel")}</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t("titlePlaceholder")}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">{t("descriptionLabel")}</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t("descriptionPlaceholder")}
                            rows={2}
                        />
                    </div>

                    {/* Folder */}
                    <div className="space-y-2">
                        <Label>{t("folderLabel")}</Label>
                        <Select value={folderId} onValueChange={setFolderId}>
                            <SelectTrigger>
                                <IconFolder className="h-4 w-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder={t("folderPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent className="max-h-60 overflow-y-auto">
                                <SelectItem value="none">
                                    {t("noFolder")}
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

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label>{t("tagsLabel")}</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="gap-1">
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTag(tag)}
                                        className="hover:text-destructive"
                                    >
                                        <IconX className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <div className="relative">
                            <IconTag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagInputKeyDown}
                                onBlur={handleAddTag}
                                placeholder={t("tagsPlaceholder")}
                                className="pl-9"
                                list="tag-suggestions"
                            />
                            <datalist id="tag-suggestions">
                                {allTags.filter(t => !tags.includes(t)).map(tag => (
                                    <option key={tag} value={tag} />
                                ))}
                            </datalist>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading && <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {editingId ? t("submitUpdate") : t("submitAdd")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
