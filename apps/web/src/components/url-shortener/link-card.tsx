'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
    BarChart2,
    Check,
    Copy,
    ExternalLink,
    Link2,
    Loader2,
    MoreHorizontal,
    Pencil,
    QrCode,
    ToggleLeft,
    ToggleRight,
    Trash2,
    TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
    deleteShortLink,
    updateShortLink,
    type ShortLink,
} from '@/lib/url-shortener-api'
import { formatClicks, formatDate } from './utils'
import { useCopy } from './hooks/use-copy'
import { QrDialog } from './qr-dialog'
import { AnalyticsDialog } from './analytics-dialog'

interface LinkCardProps {
    link: ShortLink
    shortBase: string
    onDelete: (code: string) => void
    onToggle: (code: string, active: boolean) => void
    onUpdateTitle: (code: string, title: string) => void
}

export function LinkCard({ link, shortBase, onDelete, onToggle, onUpdateTitle }: LinkCardProps) {
    const { copied, copy } = useCopy()
    const [qrOpen, setQrOpen] = useState(false)
    const [analyticsOpen, setAnalyticsOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [toggling, setToggling] = useState(false)
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

    // Inline edit state
    const [editing, setEditing] = useState(false)
    const [editTitle, setEditTitle] = useState(link.title)
    const [saving, setSaving] = useState(false)

    const shortUrl = `${shortBase}/s/${link.code}`

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await deleteShortLink(link.code)
            onDelete(link.code)
            toast.success('Link deleted')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to delete')
        } finally {
            setDeleting(false)
            setConfirmDeleteOpen(false)
        }
    }

    const handleToggle = async () => {
        setToggling(true)
        try {
            await updateShortLink(link.code, { active: !link.active })
            onToggle(link.code, !link.active)
            toast.success(link.active ? 'Link disabled' : 'Link enabled')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to update')
        } finally {
            setToggling(false)
        }
    }

    const handleSaveTitle = async () => {
        const trimmed = editTitle.trim()
        if (!trimmed || trimmed === link.title) {
            setEditing(false)
            setEditTitle(link.title)
            return
        }
        setSaving(true)
        try {
            await updateShortLink(link.code, { title: trimmed })
            onUpdateTitle(link.code, trimmed)
            setEditing(false)
            toast.success('Title updated')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to update title')
        } finally {
            setSaving(false)
        }
    }

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSaveTitle()
        } else if (e.key === 'Escape') {
            setEditing(false)
            setEditTitle(link.title)
        }
    }

    return (
        <>
            <div
                className={cn(
                    'group relative flex flex-col gap-2 rounded-xl border bg-card/60 p-3.5 transition-all duration-200 hover:shadow-md sm:flex-row sm:items-center sm:gap-3',
                    link.active
                        ? 'border-border/50 hover:border-primary/30'
                        : 'border-border/30 opacity-60',
                )}
            >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/10 text-primary ring-1 ring-primary/20">
                    <Link2 className="h-4 w-4" strokeWidth={2} />
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                        {editing ? (
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onKeyDown={handleEditKeyDown}
                                    onBlur={handleSaveTitle}
                                    className="h-7 text-sm font-semibold px-2 py-0"
                                    maxLength={200}
                                    autoFocus
                                    disabled={saving}
                                />
                                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
                            </div>
                        ) : (
                            <button
                                onClick={() => { setEditing(true); setEditTitle(link.title) }}
                                className="group/title flex items-center gap-1.5 truncate text-sm font-semibold leading-tight text-foreground hover:text-primary transition-colors"
                                title="Click to edit title"
                            >
                                <span className="truncate">{link.title}</span>
                                <Pencil className="h-3 w-3 shrink-0 opacity-0 group-hover/title:opacity-60 transition-opacity" />
                            </button>
                        )}
                        {!link.active && (
                            <Badge variant="secondary" className="shrink-0 text-[10px]">Disabled</Badge>
                        )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{link.original_url}</p>
                    <div className="flex items-center gap-2 pt-0.5">
                        <button
                            onClick={() => copy(shortUrl, link.code)}
                            className="flex items-center gap-1 rounded text-xs font-medium text-primary transition-colors hover:text-primary/80"
                        >
                            {copied === link.code ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                                <Copy className="h-3 w-3" />
                            )}
                            /s/{link.code}
                        </button>
                        <span className="text-border">·</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            {formatClicks(link.clicks)} click{link.clicks !== 1 ? 's' : ''}
                        </span>
                        <span className="text-border">·</span>
                        <span className="text-xs text-muted-foreground">{formatDate(link.created_at)}</span>
                    </div>
                </div>

                {/* Desktop action buttons */}
                <div className="hidden sm:flex shrink-0 items-center gap-1">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Analytics"
                        onClick={() => setAnalyticsOpen(true)}
                    >
                        <BarChart2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Open link"
                        asChild
                    >
                        <a href={shortUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Show QR code"
                        onClick={() => setQrOpen(true)}
                    >
                        <QrCode className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className={cn('h-8 w-8', link.active ? 'text-emerald-500 hover:text-emerald-600' : 'text-muted-foreground hover:text-foreground')}
                        title={link.active ? 'Disable link' : 'Enable link'}
                        onClick={handleToggle}
                        disabled={toggling}
                    >
                        {toggling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : link.active ? (
                            <ToggleRight className="h-4 w-4" />
                        ) : (
                            <ToggleLeft className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Delete link"
                        onClick={() => setConfirmDeleteOpen(true)}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                        )}
                    </Button>
                </div>

                {/* Mobile overflow menu */}
                <div className="flex sm:hidden shrink-0 items-center gap-1 self-end -mt-1">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => copy(shortUrl, link.code)}
                    >
                        {copied === link.code ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                            <Copy className="h-3.5 w-3.5" />
                        )}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setAnalyticsOpen(true)}>
                                <BarChart2 className="h-4 w-4" />
                                Analytics
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <a href={shortUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                    Open link
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setQrOpen(true)}>
                                <QrCode className="h-4 w-4" />
                                QR code
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleToggle} disabled={toggling}>
                                {link.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                {link.active ? 'Disable' : 'Enable'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setConfirmDeleteOpen(true)}
                                className="text-destructive focus:text-destructive"
                                disabled={deleting}
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <QrDialog url={shortUrl} open={qrOpen} onClose={() => setQrOpen(false)} />
            <AnalyticsDialog link={link} open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />

            {/* Delete confirmation */}
            <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete short link?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <span className="font-semibold text-foreground">/s/{link.code}</span> ({link.title}).
                            Anyone with this link will get a 404 error. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
