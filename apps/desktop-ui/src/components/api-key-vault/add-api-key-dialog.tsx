"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Eye, EyeOff, KeyRound } from "lucide-react"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { useApiKeyVaultStore, type ApiKeyEntry, type ApiKeyEnv } from "@/store/api-key-vault-store"
import { encryptData } from "@/lib/encryption"
import { auth } from "@/database/firebase"
import { createApiKeyEntry, updateApiKeyEntry } from "@/lib/api-key-vault-api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useCipherKey, cipherKeyErrorMessage } from "@/lib/use-cipher-key"
import { useActiveToolPermissions } from "@/lib/workspace-rbac"

type FormState = {
    name: string
    apiKey: string
    secret: string
    env: ApiKeyEnv
    notes: string
}

const EMPTY: FormState = {
    name: "",
    apiKey: "",
    secret: "",
    env: "development",
    notes: "",
}

const ENV_HINT: Record<ApiKeyEnv, string> = {
    development: "Safe for local testing",
    staging: "Pre-production environment",
    production: "Live — handle with care",
}

function fromEntry(entry: ApiKeyEntry): FormState {
    return {
        name: entry.name,
        apiKey: entry.apiKey,
        secret: entry.secret,
        env: entry.env,
        notes: entry.notes,
    }
}

function FormBody({
    initial,
    submitLabel,
    onSubmit,
    onCancel,
    isMobile,
}: {
    initial: FormState
    submitLabel: string
    onSubmit: (data: FormState) => Promise<void>
    onCancel: () => void
    isMobile: boolean
}) {
    const [formData, setFormData] = useState<FormState>(initial)
    const [showKey, setShowKey] = useState(false)
    const [showSecret, setShowSecret] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setFormData(initial)
        setShowKey(false)
        setShowSecret(false)
    }, [initial])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim() || !formData.apiKey.trim()) {
            toast.error("Name and API key are required")
            return
        }
        setLoading(true)
        try {
            await onSubmit(formData)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    id="name"
                    placeholder="e.g. GitHub PAT, Stripe live"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    autoFocus={!isMobile}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="env">Environment</Label>
                <Select
                    value={formData.env}
                    onValueChange={(v) => setFormData({ ...formData, env: v as ApiKeyEnv })}
                >
                    <SelectTrigger id="env">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                </Select>
                <p className={cn(
                    "text-[11px]",
                    formData.env === "production" ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                )}>
                    {ENV_HINT[formData.env]}
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="relative">
                    <Input
                        id="api-key"
                        type={showKey ? "text" : "password"}
                        placeholder="ghp_… / sk_live_… / etc."
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        required
                        className="font-mono pr-10"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <button
                        type="button"
                        onClick={() => setShowKey((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        aria-label={showKey ? "Hide key" : "Show key"}
                    >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="secret">
                    Secret <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <div className="relative">
                    <Input
                        id="secret"
                        type={showSecret ? "text" : "password"}
                        placeholder="Signing secret, webhook secret…"
                        value={formData.secret}
                        onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                        className="font-mono pr-10"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <button
                        type="button"
                        onClick={() => setShowSecret((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        aria-label={showSecret ? "Hide secret" : "Show secret"}
                    >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">
                    Notes <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                    id="notes"
                    placeholder="Scopes, expiry, owner…"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="min-h-[70px]"
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                {!isMobile && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" disabled={loading} className={cn(isMobile && "w-full h-12 rounded-xl text-base")}>
                    {loading ? "Saving…" : submitLabel}
                </Button>
            </div>
        </form>
    )
}

function DialogShell({
    open,
    onOpenChange,
    trigger,
    title,
    description,
    children,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    trigger?: React.ReactNode
    title: string
    description?: string
    children: React.ReactNode
}) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
                <DrawerContent className="max-h-[95vh]">
                    <div className="flex flex-col h-full max-h-[95vh]">
                        <DrawerHeader className="shrink-0 border-b pb-4 text-left">
                            <DrawerTitle className="text-xl flex items-center gap-2">
                                <KeyRound className="h-5 w-5 text-primary" /> {title}
                            </DrawerTitle>
                            {description && <DrawerDescription>{description}</DrawerDescription>}
                        </DrawerHeader>
                        <div className="flex-1 overflow-y-auto px-4 pb-8">{children}</div>
                    </div>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-primary" /> {title}
                    </DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    )
}

export function AddApiKeyDialog({ children }: { children?: React.ReactNode }) {
    const encryptionKey = useCipherKey()
    const { addEntry } = useApiKeyVaultStore()
    const [open, setOpen] = useState(false)
    const isMobile = useIsMobile()
    const { canWrite } = useActiveToolPermissions()

    // Viewers in shared workspaces — hide the Add button entirely. Personal
    // workspace + admin/developer still see it (canWrite is true for both).
    if (!canWrite) return null

    const handleSubmit = async (data: FormState) => {
        if (!auth.currentUser) {
            toast.error("Sign in to continue")
            return
        }
        if (!encryptionKey) {
            toast.error(cipherKeyErrorMessage())
            return
        }
        try {
            const payload = JSON.stringify(data)
            const { encrypted, iv } = await encryptData(encryptionKey, payload)
            const ts = Date.now()
            const created = await createApiKeyEntry({
                encryptedData: encrypted,
                iv,
                createdAt: ts,
                updatedAt: ts,
            })
            addEntry({ id: created.id, ...data, createdAt: ts, updatedAt: ts })
            setOpen(false)
            toast.success("API key saved")
        } catch (err) {
            console.error("Failed to save API key:", err)
            toast.error("Failed to save API key")
        }
    }

    const trigger = children ?? (
        isMobile ? (
            <Button
                className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-2xl z-50 p-0 bg-gradient-to-br from-primary to-primary/80"
                size="icon"
                aria-label="Add API key"
            >
                <Plus className="h-7 w-7" />
            </Button>
        ) : (
            <Button className="shadow-sm hover:shadow-md transition-shadow">
                <Plus className="mr-2 h-4 w-4" /> Add API Key
            </Button>
        )
    )

    return (
        <DialogShell
            open={open}
            onOpenChange={setOpen}
            trigger={trigger}
            title="Add API Key"
            description="Encrypted on your device before sync. Server never sees plaintext."
        >
            <FormBody
                initial={EMPTY}
                submitLabel="Save API Key"
                onSubmit={handleSubmit}
                onCancel={() => setOpen(false)}
                isMobile={isMobile}
            />
        </DialogShell>
    )
}

export function EditApiKeyDialog({
    entry,
    open,
    onOpenChange,
}: {
    entry: ApiKeyEntry | null
    open: boolean
    onOpenChange: (v: boolean) => void
}) {
    const encryptionKey = useCipherKey()
    const { updateEntry } = useApiKeyVaultStore()
    const isMobile = useIsMobile()
    const { canWrite } = useActiveToolPermissions()

    if (!entry) return null
    // Viewers can open the row but the edit dialog itself is no-op for them.
    if (!canWrite) return null

    const handleSubmit = async (data: FormState) => {
        if (!auth.currentUser) {
            toast.error("Sign in to continue")
            return
        }
        if (!encryptionKey) {
            toast.error(cipherKeyErrorMessage())
            return
        }
        try {
            const payload = JSON.stringify(data)
            const { encrypted, iv } = await encryptData(encryptionKey, payload)
            const ts = Date.now()
            await updateApiKeyEntry(entry.id, {
                encryptedData: encrypted,
                iv,
                updatedAt: ts,
            })
            updateEntry({ ...entry, ...data, updatedAt: ts })
            onOpenChange(false)
            toast.success("API key updated")
        } catch (err) {
            console.error("Failed to update API key:", err)
            toast.error("Failed to update API key")
        }
    }

    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            title="Edit API Key"
            description={`Updating "${entry.name}". Re-encrypted on save.`}
        >
            <FormBody
                initial={fromEntry(entry)}
                submitLabel="Save Changes"
                onSubmit={handleSubmit}
                onCancel={() => onOpenChange(false)}
                isMobile={isMobile}
            />
        </DialogShell>
    )
}
