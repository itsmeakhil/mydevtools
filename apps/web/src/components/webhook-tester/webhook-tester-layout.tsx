'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { IconWebhook } from '@tabler/icons-react'
import { Check, Copy, Inbox, Loader2, Plus, Terminal, Trash2, Webhook } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { backendFetch } from '@/lib/backend-auth'
import { BACKEND_BASE_URL } from '@/lib/backend-api'
import { cn } from '@/lib/utils'
import {
  buildCurlExample,
  buildReceiveUrl,
  formatCountdown,
  formatRequestSize,
  isBinExpired,
  methodColor,
  relativeTime,
  tryPrettyJson,
  type RecordedRequest,
  type WebhookBin,
} from '@/lib/webhook-tester'

const STORAGE_KEY = 'webhook-tester:bin'
const POLL_MS = 2500

function loadStoredBin(): WebhookBin | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WebhookBin
    if (!parsed?.binId || !parsed?.expiresAt || isBinExpired(parsed.expiresAt)) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function CopyIconButton({ text, className }: { text: string; className?: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard()
  return (
    <button
      type="button"
      onClick={() => void copyToClipboard(text, { silent: true, resetMs: 1500 })}
      className={cn(
        'shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground',
        className
      )}
    >
      {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function MethodBadge({ method }: { method: string }) {
  const meta = methodColor(method)
  return (
    <span
      className={cn(
        'inline-flex w-16 items-center justify-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold',
        meta.text,
        meta.bg
      )}
    >
      {method}
    </span>
  )
}

function KeyValueTable({ entries }: { entries: [string, string][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/40 bg-muted/10">
      <table className="w-full text-xs">
        <tbody className="divide-y divide-border/30">
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td className="w-1/3 min-w-32 px-3 py-1.5 align-top font-mono text-muted-foreground">{k}</td>
              <td className="break-all px-3 py-1.5 font-mono">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RequestDetail({ request }: { request: RecordedRequest }) {
  const t = useTranslations('WebhookTester')
  const { isCopied, copyToClipboard } = useCopyToClipboard()
  const pretty = request.body_encoding === 'text' ? tryPrettyJson(request.body) : null
  const bodyText = pretty ?? request.body

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <MethodBadge method={request.method} />
        <span className="break-all font-mono text-sm">/{request.path}</span>
        <span className="ml-auto text-xs text-muted-foreground">{formatRequestSize(request.size)}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
        <div>
          <span className="text-muted-foreground">{t('detail.receivedAt')}: </span>
          <span className="font-mono">{new Date(request.received_at).toLocaleTimeString()}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t('detail.source')}: </span>
          <span className="font-mono">{request.source_ip ?? '—'}</span>
        </div>
        <div className="break-all">
          <span className="text-muted-foreground">{t('detail.contentType')}: </span>
          <span className="font-mono">{request.content_type ?? '—'}</span>
        </div>
      </div>

      {Object.keys(request.query).length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('detail.query')}
          </Label>
          <KeyValueTable entries={Object.entries(request.query)} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('detail.headers')}
        </Label>
        <KeyValueTable entries={Object.entries(request.headers)} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('detail.body')}
            </Label>
            {request.body_encoding === 'base64' && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {t('base64Badge')}
              </Badge>
            )}
            {request.body_truncated && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {t('truncatedBadge')}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-7"
            disabled={!bodyText}
            onClick={() => void copyToClipboard(bodyText, { silent: true })}
          >
            {isCopied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
            {isCopied ? t('copied') : t('detail.copyBody')}
          </Button>
        </div>
        {bodyText ? (
          <pre className="min-h-24 overflow-auto rounded-lg border border-border/40 bg-muted/10 p-3 font-mono text-xs leading-relaxed">
            {bodyText}
          </pre>
        ) : (
          <p className="text-xs italic text-muted-foreground/60">{t('detail.emptyBody')}</p>
        )}
      </div>
    </div>
  )
}

export function WebhookTesterLayout() {
  const t = useTranslations('WebhookTester')
  const [bin, setBin] = useState<WebhookBin | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [requests, setRequests] = useState<RecordedRequest[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const { isCopied: urlCopied, copyToClipboard: copyUrl } = useCopyToClipboard()
  const { isCopied: curlCopied, copyToClipboard: copyCurl } = useCopyToClipboard()
  const expiredNoticeShown = useRef(false)

  useEffect(() => {
    setBin(loadStoredBin())
    setHydrated(true)
  }, [])

  const receiveUrl = useMemo(
    () => (bin ? buildReceiveUrl(BACKEND_BASE_URL, bin.binId) : ''),
    [bin]
  )

  const dropBin = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setBin(null)
    setRequests([])
    setSelectedId(null)
  }, [])

  const createBin = useCallback(async () => {
    setCreating(true)
    try {
      const res = await backendFetch('/api/backend/webhook-tester/bins', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { bin_id: string; created_at: string; expires_at: string }
      const next: WebhookBin = { binId: data.bin_id, createdAt: data.created_at, expiresAt: data.expires_at }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      expiredNoticeShown.current = false
      setBin(next)
      setRequests([])
      setSelectedId(null)
    } catch {
      toast.error(t('errors.createFailed'))
    } finally {
      setCreating(false)
    }
  }, [t])

  // Poll for requests every 2.5s while the tab is visible.
  useEffect(() => {
    if (!bin) return
    let cancelled = false

    const load = async () => {
      if (typeof document !== 'undefined' && document.hidden) return
      try {
        const res = await backendFetch(`/api/backend/webhook-tester/bins/${bin.binId}/requests`)
        if (cancelled) return
        if (res.status === 404) {
          if (!expiredNoticeShown.current) {
            expiredNoticeShown.current = true
            toast.info(t('expiredNotice'))
          }
          dropBin()
          return
        }
        if (!res.ok) return
        const data = (await res.json()) as { requests: RecordedRequest[] }
        if (!cancelled) {
          setRequests(data.requests)
          setNow(Date.now())
        }
      } catch {
        /* transient network error — retry on next tick */
      }
    }

    void load()
    const interval = setInterval(() => void load(), POLL_MS)
    const onVisibility = () => {
      if (!document.hidden) void load()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [bin, dropBin, t])

  const clearRequests = useCallback(async () => {
    if (!bin) return
    try {
      const res = await backendFetch(`/api/backend/webhook-tester/bins/${bin.binId}/requests`, {
        method: 'DELETE',
      })
      if (res.status === 404) {
        dropBin()
        return
      }
      setRequests([])
      setSelectedId(null)
    } catch {
      toast.error(t('errors.clearFailed'))
    }
  }, [bin, dropBin, t])

  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) ?? null,
    [requests, selectedId]
  )
  const curlExample = receiveUrl ? buildCurlExample(receiveUrl) : ''

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconWebhook}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT['Network & API']}
        />
      </RevealItem>

      {!bin ? (
        <Card className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <div className="rounded-full bg-cyan-500/10 p-4 text-cyan-600 dark:text-cyan-400">
            <Webhook className="h-8 w-8" />
          </div>
          <div className="max-w-md space-y-1 text-center">
            <p className="text-sm font-medium">{t('intro.title')}</p>
            <p className="text-xs text-muted-foreground">{t('intro.hint')}</p>
          </div>
          <Button onClick={() => void createBin()} disabled={creating || !hydrated} className="gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {creating ? t('creating') : t('createBtn')}
          </Button>
        </Card>
      ) : (
        <>
          {/* URL toolbar */}
          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('urlLabel')}
              </Label>
              <span className="text-xs text-muted-foreground">
                {t('expiresIn', { countdown: formatCountdown(bin.expiresAt, now) })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg border border-border/40 bg-muted/20 px-3 py-2 font-mono text-xs">
                {receiveUrl}
              </code>
              <Button onClick={() => void copyUrl(receiveUrl, { silent: true })} className="gap-2">
                {urlCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {urlCopied ? t('copied') : t('copyUrlBtn')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void clearRequests()}
                disabled={requests.length === 0}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('clearBtn')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void createBin()} disabled={creating} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t('newBinBtn')}
              </Button>
            </div>
          </Card>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
            {/* Request list */}
            <Card className="flex min-h-0 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-2.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('requestsTitle')}
                </Label>
                <Badge variant="secondary" className="h-5 px-2 text-xs">
                  {requests.length}
                </Badge>
              </div>
              {requests.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                  <Inbox className="h-8 w-8 text-muted-foreground/40" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{t('empty.title')}</p>
                    <p className="text-xs text-muted-foreground">{t('empty.hint')}</p>
                  </div>
                  <div className="flex w-full max-w-full items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-3 text-left">
                    <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-relaxed">
                      {curlExample}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copyCurl(curlExample, { silent: true, resetMs: 1500 })}
                      className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      {curlCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <ScrollArea className="min-h-0 flex-1">
                  <div className="divide-y divide-border/30">
                    {requests.map((req) => (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => setSelectedId(req.id)}
                        className={cn(
                          'flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-muted/30',
                          selectedId === req.id && 'bg-muted/40'
                        )}
                      >
                        <MethodBadge method={req.method} />
                        <span className="min-w-0 flex-1 truncate font-mono text-xs">/{req.path}</span>
                        <span className="hidden shrink-0 truncate text-[11px] text-muted-foreground/70 xl:inline max-w-28">
                          {req.content_type ?? '—'}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground/70">
                          {formatRequestSize(req.size)}
                        </span>
                        <span className="w-16 shrink-0 text-right text-[11px] text-muted-foreground">
                          {relativeTime(req.received_at, now)}
                        </span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </Card>

            {/* Detail pane */}
            <Card className="flex min-h-0 flex-col overflow-hidden">
              {selected ? (
                <ScrollArea className="min-h-0 flex-1">
                  <RequestDetail request={selected} />
                </ScrollArea>
              ) : (
                <div className="flex flex-1 items-center justify-center p-6">
                  <p className="text-sm text-muted-foreground/60">{t('selectPrompt')}</p>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
