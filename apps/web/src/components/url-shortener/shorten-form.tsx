'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
    Check,
    Copy,
    Link2,
    Loader2,
    Plus,
    Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createShortLink, type ShortLink } from '@/lib/url-shortener-api'
import { useCopy } from './hooks/use-copy'

interface ShortenFormProps {
    isAuthenticated: boolean
    onCreated: (link: ShortLink) => void
}

export function ShortenForm({ isAuthenticated, onCreated }: ShortenFormProps) {
    const [url, setUrl] = useState('')
    const [title, setTitle] = useState('')
    const [customCode, setCustomCode] = useState('')
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [creating, setCreating] = useState(false)
    const [justCreated, setJustCreated] = useState<ShortLink | null>(null)

    const { copied, copy } = useCopy()

    const shortBase = typeof window !== 'undefined' ? window.location.origin : ''
    const justCreatedUrl = justCreated ? `${shortBase}/s/${justCreated.code}` : ''

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
            onCreated(link)
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

    return (
        <>
            {/* Hero / Shorten form */}
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
                                disabled={creating || !isAuthenticated}
                                className="h-11 gap-2 px-5 bg-gradient-to-r from-primary to-violet-600 text-primary-foreground shadow-md shadow-primary/20 hover:shadow-primary/30 hover:opacity-90 transition-all"
                            >
                                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                Shorten
                            </Button>
                        </div>

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

                    {!isAuthenticated && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            Sign in to create and manage your short links.
                        </p>
                    )}
                </div>
            </div>

            {/* Just created banner */}
            {justCreated && (
                <div className="animate-in fade-in slide-in-from-top-3 duration-300 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Link created!</p>
                        <p className="truncate text-sm font-mono font-semibold text-foreground">{justCreatedUrl}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => copy(justCreatedUrl, 'just-created')}>
                            {copied === 'just-created' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            Copy
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => setJustCreated(null)}>
                            ✕
                        </Button>
                    </div>
                </div>
            )}
        </>
    )
}
