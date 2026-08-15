"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useApiKeyVaultStore, type ApiKeyEntry, type ApiKeyEnv } from "@/store/api-key-vault-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Copy, Check, Eye, EyeOff, Trash2, KeyRound, Pencil, MoreVertical, ArrowDownAZ, Clock, Layers, Plus } from "lucide-react"
import { toast } from "sonner"
import { deleteApiKeyEntry } from "@/lib/api-key-vault-api"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { AddApiKeyDialog, EditApiKeyDialog } from "./add-api-key-dialog"
import {
    ToolSidebarFilterList,
    ToolSidebarLayout,
    type ToolSidebarFilterItem,
} from "@/components/tools/tool-sidebar"

const REVEAL_TIMEOUT_MS = 30_000

type SortKey = "updated" | "name" | "env"

// Dot color matches the env badge tint.
const ENV_META: Record<ApiKeyEnv, { label: string; badge: string; dot: string; weight: number }> = {
    development: {
        label: "Dev",
        badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        dot: "bg-emerald-500",
        weight: 0,
    },
    staging: {
        label: "Staging",
        badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
        dot: "bg-amber-500",
        weight: 1,
    },
    production: {
        label: "Prod",
        badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
        dot: "bg-rose-500",
        weight: 2,
    },
}

function maskValue(v: string): string {
    if (!v) return ""
    if (v.length <= 8) return "•".repeat(Math.min(v.length, 12))
    const dotCount = Math.min(20, Math.max(4, v.length - 8))
    return v.slice(0, 4) + "•".repeat(dotCount) + v.slice(-4)
}

async function copy(text: string, label: string) {
    try {
        await navigator.clipboard.writeText(text)
        toast.success(`${label} copied`)
        return true
    } catch {
        toast.error(`Failed to copy ${label.toLowerCase()}`)
        return false
    }
}

// Copy icon flips to a check for 1.5s — feedback right at the cursor.
function CopyButton({ text, label }: { text: string; label: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={async () => {
                if (await copy(text, label)) {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                }
            }}
            aria-label={`Copy ${label.toLowerCase()}`}
        >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </Button>
    )
}

export function ApiKeyList() {
    const { entries, deleteEntry, isLoading } = useApiKeyVaultStore()
    const [search, setSearch] = useState("")
    const [envFilter, setEnvFilter] = useState<"all" | ApiKeyEnv>("all")
    const [sortBy, setSortBy] = useState<SortKey>("updated")
    const [revealed, setRevealed] = useState<Set<string>>(new Set())
    const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set())
    const [confirmDelete, setConfirmDelete] = useState<ApiKeyEntry | null>(null)
    const [editing, setEditing] = useState<ApiKeyEntry | null>(null)
    const [editOpen, setEditOpen] = useState(false)

    // ponytail: auto-hide reveals after 30s; security UX consistent with password vault.
    const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
    useEffect(() => () => {
        timers.current.forEach((t) => clearTimeout(t))
        timers.current.clear()
    }, [])

    const filteredSorted = useMemo(() => {
        const q = search.trim().toLowerCase()
        const f = entries.filter((e) => {
            if (envFilter !== "all" && e.env !== envFilter) return false
            if (!q) return true
            return (
                e.name.toLowerCase().includes(q) ||
                e.notes.toLowerCase().includes(q) ||
                e.env.toLowerCase().includes(q)
            )
        })
        const sorters: Record<SortKey, (a: ApiKeyEntry, b: ApiKeyEntry) => number> = {
            updated: (a, b) => b.updatedAt - a.updatedAt,
            name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
            env: (a, b) => ENV_META[a.env].weight - ENV_META[b.env].weight || b.updatedAt - a.updatedAt,
        }
        return [...f].sort(sorters[sortBy])
    }, [entries, search, envFilter, sortBy])

    const counts = useMemo(() => {
        const c = { development: 0, staging: 0, production: 0 } as Record<ApiKeyEnv, number>
        entries.forEach((e) => { c[e.env]++ })
        return c
    }, [entries])

    const toggleReveal = (kind: "key" | "secret", id: string) => {
        const setter = kind === "key" ? setRevealed : setRevealedSecrets
        const timerKey = `${kind}:${id}`

        setter((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
                const t = timers.current.get(timerKey)
                if (t) {
                    clearTimeout(t)
                    timers.current.delete(timerKey)
                }
            } else {
                next.add(id)
                const t = setTimeout(() => {
                    setter((p) => {
                        const n = new Set(p)
                        n.delete(id)
                        return n
                    })
                    timers.current.delete(timerKey)
                }, REVEAL_TIMEOUT_MS)
                timers.current.set(timerKey, t)
            }
            return next
        })
    }

    const handleEdit = (entry: ApiKeyEntry) => {
        setEditing(entry)
        setEditOpen(true)
    }

    const handleDelete = async (entry: ApiKeyEntry) => {
        try {
            await deleteApiKeyEntry(entry.id)
            deleteEntry(entry.id)
            toast.success("API key deleted")
        } catch {
            toast.error("Failed to delete API key")
        } finally {
            setConfirmDelete(null)
        }
    }

    const envFilters: ToolSidebarFilterItem[] = [
        { id: "all", label: "All keys", count: entries.length },
        { id: "development", label: ENV_META.development.label, count: counts.development, dot: ENV_META.development.dot },
        { id: "staging", label: ENV_META.staging.label, count: counts.staging, dot: ENV_META.staging.dot },
        { id: "production", label: ENV_META.production.label, count: counts.production, dot: ENV_META.production.dot },
    ]

    return (
        <ToolSidebarLayout
            toolId="api-keys"
            icon={KeyRound}
            title="API Keys"
            actions={
                <AddApiKeyDialog>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Add API key">
                        <Plus className="h-4 w-4" />
                    </Button>
                </AddApiKeyDialog>
            }
            sidebar={
                <ToolSidebarFilterList
                    items={envFilters}
                    value={envFilter}
                    onChange={(id) => setEnvFilter(id as "all" | ApiKeyEnv)}
                    heading="Environment"
                />
            }
        >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search name, env, or notes…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                    <SelectTrigger className="w-full sm:w-44" aria-label="Sort by">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="updated">
                            <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Recently updated</span>
                        </SelectItem>
                        <SelectItem value="name">
                            <span className="flex items-center gap-2"><ArrowDownAZ className="h-3.5 w-3.5" /> Name (A–Z)</span>
                        </SelectItem>
                        <SelectItem value="env">
                            <span className="flex items-center gap-2"><Layers className="h-3.5 w-3.5" /> Environment</span>
                        </SelectItem>
                    </SelectContent>
                </Select>
              </div>
                <AddApiKeyDialog>
                    <Button className="hidden sm:inline-flex shrink-0 shadow-sm hover:shadow-md transition-shadow">
                        <Plus className="mr-2 h-4 w-4" /> Add API Key
                    </Button>
                </AddApiKeyDialog>
            </div>

            {!isLoading && filteredSorted.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center py-20 px-4 text-muted-foreground border border-dashed rounded-xl">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <KeyRound className="h-6 w-6 opacity-70" />
                    </div>
                    <p className="font-medium text-foreground">
                        {entries.length === 0 ? "No API keys yet" : "No matches"}
                    </p>
                    <p className="text-sm mt-1 max-w-sm">
                        {entries.length === 0
                            ? "Add your first key — name, value, environment. Encrypted on your device in a local vault."
                            : "Try a different search or environment filter."}
                    </p>
                    {entries.length === 0 && (
                        <AddApiKeyDialog>
                            <Button className="mt-4">
                                <Plus className="mr-2 h-4 w-4" /> Add API Key
                            </Button>
                        </AddApiKeyDialog>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredSorted.map((entry) => {
                    const keyShown = revealed.has(entry.id)
                    const secretShown = revealedSecrets.has(entry.id)
                    const env = ENV_META[entry.env]
                    return (
                        <Card
                            key={entry.id}
                            className="group overflow-hidden border-muted/60 hover:border-primary/40 hover:shadow-md transition-all"
                        >
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("h-2 w-2 rounded-full shrink-0", env.dot)} aria-hidden />
                                            <h3 className="font-semibold truncate text-[15px]" title={entry.name}>
                                                {entry.name || "Untitled"}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border uppercase tracking-wide text-[10px] font-medium", env.badge)}>
                                                {env.label}
                                            </span>
                                            <span aria-hidden>·</span>
                                            <span title={new Date(entry.updatedAt).toLocaleString()}>
                                                {formatDistanceToNow(entry.updatedAt, { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 opacity-60 group-hover:opacity-100">
                                                <MoreVertical className="h-4 w-4" />
                                                <span className="sr-only">Actions</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEdit(entry)}>
                                                <Pencil className="h-4 w-4 mr-2" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => copy(entry.apiKey, "Key")}>
                                                <Copy className="h-4 w-4 mr-2" /> Copy key
                                            </DropdownMenuItem>
                                            {entry.secret && (
                                                <DropdownMenuItem onClick={() => copy(entry.secret, "Secret")}>
                                                    <Copy className="h-4 w-4 mr-2" /> Copy secret
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => setConfirmDelete(entry)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Key</p>
                                    <div className="flex items-center gap-1">
                                        <code
                                            className={cn(
                                                "flex-1 text-xs font-mono bg-muted/60 px-2 py-1.5 rounded min-w-0",
                                                keyShown ? "break-all select-all" : "truncate"
                                            )}
                                        >
                                            {keyShown ? entry.apiKey : maskValue(entry.apiKey)}
                                        </code>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => toggleReveal("key", entry.id)}
                                            aria-label={keyShown ? "Hide key" : "Reveal key"}
                                            title={keyShown ? "Hide" : `Reveal (auto-hides in ${REVEAL_TIMEOUT_MS / 1000}s)`}
                                        >
                                            {keyShown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <CopyButton text={entry.apiKey} label="Key" />
                                    </div>
                                </div>

                                {entry.secret && (
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Secret</p>
                                        <div className="flex items-center gap-1">
                                            <code
                                                className={cn(
                                                    "flex-1 text-xs font-mono bg-muted/60 px-2 py-1.5 rounded min-w-0",
                                                    secretShown ? "break-all select-all" : "truncate"
                                                )}
                                            >
                                                {secretShown ? entry.secret : maskValue(entry.secret)}
                                            </code>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                                onClick={() => toggleReveal("secret", entry.id)}
                                                aria-label={secretShown ? "Hide secret" : "Reveal secret"}
                                                title={secretShown ? "Hide" : `Reveal (auto-hides in ${REVEAL_TIMEOUT_MS / 1000}s)`}
                                            >
                                                {secretShown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                            <CopyButton text={entry.secret} label="Secret" />
                                        </div>
                                    </div>
                                )}

                                {entry.notes && (
                                    <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words border-l-2 border-muted pl-2">
                                        {entry.notes}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <EditApiKeyDialog entry={editing} open={editOpen} onOpenChange={setEditOpen} />

            <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this API key?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &ldquo;{confirmDelete?.name}&rdquo; will be permanently removed. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => confirmDelete && handleDelete(confirmDelete)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
        </ToolSidebarLayout>
    )
}
