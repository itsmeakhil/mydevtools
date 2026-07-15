'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { KeyRound, Loader2, Plus, Trash2, Pencil, ShieldCheck } from 'lucide-react'
import { browserSupportsWebAuthn } from '@simplewebauthn/browser'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  registerPasskey,
  listPasskeys,
  renamePasskey,
  deletePasskey,
  type PasskeySummary,
} from '@/lib/passkey'

function formatDate(ms: number | null): string | null {
  return ms ? new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null
}

export function PasskeysManager() {
  const t = useTranslations('Dashboard')
  const [passkeys, setPasskeys] = useState<PasskeySummary[] | null>(null)
  const [busy, setBusy] = useState(false)
  const supported = typeof window !== 'undefined' ? browserSupportsWebAuthn() : true

  const refresh = () => {
    listPasskeys()
      .then(setPasskeys)
      .catch(() => {
        setPasskeys([])
        toast.error(t('passkeysLoadError'))
      })
  }

  useEffect(refresh, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onAdd = async () => {
    const name = window.prompt(t('namePrompt'))
    if (name === null) return // cancelled
    setBusy(true)
    try {
      await registerPasskey(name.trim() || undefined)
      toast.success(t('passkeyAdded'))
      refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('passkeyAddError'))
    } finally {
      setBusy(false)
    }
  }

  const onRename = async (pk: PasskeySummary) => {
    const name = window.prompt(t('renamePrompt'), pk.device_name ?? '')
    if (name === null || !name.trim()) return
    try {
      await renamePasskey(pk.credential_id, name.trim())
      toast.success(t('passkeyRenamed'))
      refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('passkeyRenameError'))
    }
  }

  const onDelete = async (pk: PasskeySummary) => {
    if (!window.confirm(t('deleteConfirm'))) return
    try {
      await deletePasskey(pk.credential_id)
      toast.success(t('passkeyDeleted'))
      refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('passkeyDeleteError'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          {t('passkeysTitle')}
        </CardTitle>
        <CardDescription>{t('passkeysDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supported && (
          <p className="text-sm text-muted-foreground">{t('passkeyNotSupported')}</p>
        )}

        {passkeys === null ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('passkeysEmpty')}</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border">
            {passkeys.map((pk) => {
              const created = formatDate(pk.created_at)
              const lastUsed = formatDate(pk.last_used_at)
              return (
                <li key={pk.credential_id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {pk.device_name || t('unnamedPasskey')}
                      </span>
                      {pk.backed_up && (
                        <Badge variant="secondary" className="gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          {t('backedUp')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {created && `${t('added')} ${created}`}
                      {created && ` · `}
                      {lastUsed ? `${t('lastUsed')} ${lastUsed}` : t('neverUsed')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onRename(pk)} aria-label={t('rename')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(pk)} aria-label={t('delete')}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <Button onClick={onAdd} disabled={!supported || busy} className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t('addPasskey')}
        </Button>
      </CardContent>
    </Card>
  )
}
