'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
    Check,
    Copy,
    ExternalLink,
    Link2,
    Loader2,
    Plus,
    QrCode,
    ToggleLeft,
    ToggleRight,
    Trash2,
    TrendingUp,
    Zap,
} from 'lucide-react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
    createShortLink,
    deleteShortLink,
    listShortLinks,
    updateShortLink,
    type ShortLink,
} from '@/lib/url-shortener-api'
import useAuth from '@/utils/useAuth'

function formatDate(ms: number): string {
    return new Date(ms).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
}

function formatClicks(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
    return String(n)
}

function useCopy() {
    const [copied, setCopied] = useState<string | null>(null)
    const copy = useCallback((text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(key)
            setTimeout(() => setCopied(null), 2000)
        })
    }, [])
    return { copied, copy }
}

interface QrDialogProps {
    url: string
    open: boolean
    onClose: () => void
}

function QrDialog({ url, open, onClose }: QrDialogProps) {
    const [dataUrl, setDataUrl] = useState<string | null>(null)
    const { copied, copy } = useCopy()

    useEffect(() => {
        if (!open) return
        QRCode.toDataURL(url, {
            width: 280,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'M',
        }).then(setDataUrl).catch(() => {})
    }, [open, url])

    const download = () => {
        if (!dataUrl) return
        const a = document.createElement('a')
        a.download = 'qr-code.png'
        a.href = dataUrl
        a.click()
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm p-0 overflow-hidden">
                <div className="flex flex-col">
                    {/* Header */}
                    <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-4">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <QrCode className="h-4 w-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-sm font-semibold leading-none">QR Code</DialogTitle>
                            <p className="mt-0.5 text-xs text-muted-foreground">Scan to open the short link</p>
                        </div>
                    </div>

                    {/* QR image */}
                    <div className="flex flex-col items-center gap-4 px-5 py-6">
                        <div className="relative flex items-center justify-center rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
                            {dataUrl ? (
                                <img
                                    src={dataUrl}
                                    alt="QR code"
                                    width={240}
                                    height={240}
                                    className="block rounded-lg"
                                />
                            ) : (
                                <div className="flex h-[240px] w-[240px] items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>

                        {/* URL chip */}
                        <button
                            onClick={() => copy(url, 'qr-url')}
                            className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted/70"
                        >
                            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{url}</span>
                            {copied === 'qr-url' ? (
                                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            ) : (
                                <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                        </button>
                    </div>

                    {/* Footer actions */}
                    <div className="flex gap-2 border-t border-border/50 px-5 py-4">
                        <Button
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => copy(url, 'qr-url')}
                        >
                            {copied === 'qr-url' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            Copy URL
                        </Button>
                        <Button
                            className="flex-1 gap-2 bg-gradient-to-r from-primary to-violet-600 text-primary-foreground hover:opacity-90"
                            onClick={download}
                            disabled={!dataUrl}
                        >
                            <QrCode className="h-4 w-4" />
                            Download
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

interface LinkRowProps {
    link: ShortLink
    shortBase: string
    onDelete: (code: string) => void
    onToggle: (code: string, active: boolean) => void
}

function LinkRow({ link, shortBase, onDelete, onToggle }: LinkRowProps) {
    const { copied, copy } = useCopy()
    const [qrOpen, setQrOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [toggling, setToggling] = useState(false)
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
                {/* Left: icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/10 text-primary ring-1 ring-primary/20">
                    <Link2 className="h-4 w-4" strokeWidth={2} />
                </div>

                {/* Center: info */}
                <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold leading-tight text-foreground">
                            {link.title}
                        </p>
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

                {/* Right: actions */}
                <div className="flex shrink-0 items-center gap-1">
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
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                        )}
                    </Button>
                </div>
            </div>

            <QrDialog url={shortUrl} open={qrOpen} onClose={() => setQrOpen(false)} />
        </>
    )
}

export function UrlShortenerTool() {
    const { user } = useAuth(false)
    const [links, setLinks] = useState<ShortLink[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)

    const [url, setUrl] = useState('')
    const [title, setTitle] = useState('')
    const [customCode, setCustomCode] = useState('')
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [justCreated, setJustCreated] = useState<ShortLink | null>(null)

    const { copied, copy } = useCopy()

    const shortBase =
        typeof window !== 'undefined' ? window.location.origin : ''

    const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0)
    const activeCount = links.filter((l) => l.active).length

    useEffect(() => {
        if (!user) { setLoading(false); return }
        listShortLinks()
            .then(setLinks)
            .catch(() => toast.error('Failed to load links'))
            .finally(() => setLoading(false))
    }, [user])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!url.trim()) return
        setCreating(true)
        try {
            const link = await createShortLink({
                original_url: url.trim(),
                title: title.trim() || undefined,
                custom_code: customCode.trim() || undefined,
            })
            setLinks((prev) => [link, ...prev])
            setJustCreated(link)
            setUrl('')
            setTitle('')
            setCustomCode('')
            setShowAdvanced(false)
            toast.success('Short link created!')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to create link')
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = (code: string) =>
        setLinks((prev) => prev.filter((l) => l.code !== code))

    const handleToggle = (code: string, active: boolean) =>
        setLinks((prev) => prev.map((l) => (l.code === code ? { ...l, active } : l)))

    const justCreatedUrl = justCreated ? `${shortBase}/s/${justCreated.code}` : ''

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-2 py-4 md:px-0">

            {/* ── Hero / Shorten form ────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-violet-500/5 to-background p-6 shadow-sm">
                <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15)_0%,transparent_60%)]" />
                <div className="relative space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-primary-foreground shadow-lg shadow-primary/30">
                            <Zap className="h-5 w-5" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold leading-none">URL Shortener</h1>
                            <p className="text-xs text-muted-foreground">Shrink links. Track clicks.</p>
                        </div>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-3">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://example.com/very/long/url"
                                    className="pl-9 h-11 bg-background/80 backdrop-blur border-border/60 focus-visible:border-primary/50"
                                    required
                                    type="url"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={creating || !user}
                                className="h-11 gap-2 px-5 bg-gradient-to-r from-primary to-violet-600 text-primary-foreground shadow-md shadow-primary/20 hover:shadow-primary/30 hover:opacity-90 transition-all"
                            >
                                {creating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                                Shorten
                            </Button>
                        </div>

                        {/* Advanced options toggle */}
                        <button
                            type="button"
                            onClick={() => setShowAdvanced((v) => !v)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showAdvanced ? '− Hide' : '+ Show'} advanced options
                        </button>

                        {showAdvanced && (
                            <div className="grid gap-3 sm:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Custom alias (optional)</Label>
                                    <Input
                                        value={customCode}
                                        onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                                        placeholder="my-link"
                                        className="h-9 bg-background/80 text-sm"
                                        maxLength={20}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Title (optional)</Label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="My awesome link"
                                        className="h-9 bg-background/80 text-sm"
                                        maxLength={200}
                                    />
                                </div>
                            </div>
                        )}
                    </form>

                    {!user && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            Sign in to create and manage your short links.
                        </p>
                    )}
                </div>
            </div>

            {/* ── Just created banner ────────────────────────────────────────── */}
            {justCreated && (
                <div className="animate-in fade-in slide-in-from-top-3 duration-300 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Link created!</p>
                        <p className="truncate text-sm font-mono font-semibold text-foreground">{justCreatedUrl}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => copy(justCreatedUrl, 'just-created')}
                        >
                            {copied === 'just-created' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            Copy
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setJustCreated(null)}
                        >
                            ✕
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Stats strip ───────────────────────────────────────────────── */}
            {links.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Total Links', value: links.length, color: 'text-primary' },
                        { label: 'Active', value: activeCount, color: 'text-emerald-500' },
                        { label: 'Total Clicks', value: formatClicks(totalClicks), color: 'text-violet-500' },
                    ].map(({ label, value, color }) => (
                        <div
                            key={label}
                            className="flex flex-col items-center justify-center rounded-xl border border-border/40 bg-card/50 py-3 gap-0.5"
                        >
                            <span className={cn('text-xl font-bold tabular-nums', color)}>{value}</span>
                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Link list ─────────────────────────────────────────────────── */}
            <div className="space-y-2">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : !user ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/50 bg-muted/10 py-12 text-center">
                        <Link2 className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
                        <div>
                            <p className="text-sm font-medium text-foreground">Sign in to manage links</p>
                            <p className="text-xs text-muted-foreground">Your short links are saved to your account</p>
                        </div>
                    </div>
                ) : links.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/50 bg-muted/10 py-12 text-center">
                        <Link2 className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
                        <div>
                            <p className="text-sm font-medium text-foreground">No links yet</p>
                            <p className="text-xs text-muted-foreground">Paste a URL above to create your first short link</p>
                        </div>
                    </div>
                ) : (
                    links.map((link) => (
                        <LinkRow
                            key={link.code}
                            link={link}
                            shortBase={shortBase}
                            onDelete={handleDelete}
                            onToggle={handleToggle}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
