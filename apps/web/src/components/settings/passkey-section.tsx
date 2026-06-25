'use client'

import { useCallback, useEffect, useState } from 'react'
import { Fingerprint, KeyRound, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    deletePasskey,
    listPasskeys,
    registerPasskey,
    renamePasskey,
    type PasskeySummary,
} from '@/lib/passkey'

function formatDate(ms: number | null): string {
    if (!ms) return '—'
    try {
        return new Date(ms).toLocaleString()
    } catch {
        return '—'
    }
}

export function PasskeySection() {
    const t = useTranslations('SettingsPage.passkeys')
    const [passkeys, setPasskeys] = useState<PasskeySummary[] | null>(null)
    const [loading, setLoading] = useState(false)
    const [registering, setRegistering] = useState(false)
    const [addOpen, setAddOpen] = useState(false)
    const [deviceName, setDeviceName] = useState('')
    const [toDelete, setToDelete] = useState<PasskeySummary | null>(null)

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            setPasskeys(await listPasskeys())
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t('loadError'))
        } finally {
            setLoading(false)
        }
    }, [t])

    useEffect(() => {
        refresh()
    }, [refresh])

    const handleAdd = async () => {
        setRegistering(true)
        try {
            await registerPasskey(deviceName.trim() || undefined)
            toast.success(t('addedToast'))
            setAddOpen(false)
            setDeviceName('')
            await refresh()
        } catch (e) {
            const msg = e instanceof Error ? e.message : t('addError')
            toast.error(msg)
        } finally {
            setRegistering(false)
        }
    }

    const handleRename = async (p: PasskeySummary) => {
        const next = window.prompt(t('renamePrompt'), p.device_name ?? '')
        if (next === null) return
        const trimmed = next.trim()
        if (!trimmed || trimmed === p.device_name) return
        try {
            await renamePasskey(p.credential_id, trimmed)
            toast.success(t('renamedToast'))
            await refresh()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t('renameError'))
        }
    }

    const handleDelete = async () => {
        if (!toDelete) return
        try {
            await deletePasskey(toDelete.credential_id)
            toast.success(t('removedToast'))
            setToDelete(null)
            await refresh()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t('deleteError'))
        }
    }

    return (
        <Card className="border shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Fingerprint className="h-5 w-5 opacity-70" />
                    {t('title')}
                </CardTitle>
                <CardDescription>{t('description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                        {loading
                            ? t('loading')
                            : passkeys && passkeys.length > 0
                              ? t('count', { count: passkeys.length })
                              : t('none')}
                    </p>
                    <Button onClick={() => setAddOpen(true)} size="sm">
                        <KeyRound className="mr-2 h-4 w-4" />
                        {t('addButton')}
                    </Button>
                </div>

                {passkeys && passkeys.length > 0 ? (
                    <ul className="divide-y rounded-lg border bg-background/40">
                        {passkeys.map((p) => (
                            <li key={p.credential_id} className="flex items-center justify-between gap-3 p-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{p.device_name || t('title')}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('addedOn', { date: formatDate(p.created_at) })}
                                        {p.last_used_at
                                            ? ` · ${t('lastUsedOn', { date: formatDate(p.last_used_at) })}`
                                            : ''}
                                        {p.backed_up ? ` · ${t('synced')}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button size="sm" variant="ghost" onClick={() => handleRename(p)}>
                                        {t('rename')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => setToDelete(p)}
                                        aria-label="Delete passkey"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </CardContent>

            <Dialog open={addOpen} onOpenChange={(open) => !registering && setAddOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('dialog.title')}</DialogTitle>
                        <DialogDescription>{t('dialog.description')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="passkey-device-name">{t('dialog.nameLabel')}</Label>
                        <Input
                            id="passkey-device-name"
                            placeholder={t('dialog.namePlaceholder')}
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            maxLength={80}
                            disabled={registering}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={registering}>
                            {t('dialog.cancel')}
                        </Button>
                        <Button onClick={handleAdd} disabled={registering}>
                            {registering ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('dialog.waiting')}
                                </>
                            ) : (
                                t('dialog.continue')
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('delete.description')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('delete.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>{t('delete.confirm')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
