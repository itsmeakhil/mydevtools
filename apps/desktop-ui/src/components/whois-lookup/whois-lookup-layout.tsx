'use client'

import React, { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Calendar,
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  Copy,
  LoaderCircle,
  RefreshCw,
  Search,
  Server,
  Users,
} from 'lucide-react'
import { IconWorldSearch } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'
import { formatIsoDate, normalizeTarget, relativeTime } from '@/lib/whois-lookup'
import { rdapLookup, type WhoisResult } from '@/lib/rdap'

const EXAMPLES = ['google.com', 'github.com', '8.8.8.8']

function DateCard({ icon: Icon, label, iso }: { icon: React.ElementType; label: string; iso: string | null }) {
  const date = iso ? formatIsoDate(iso) : null
  const rel = iso ? relativeTime(iso) : null
  return (
    <Card className="flex flex-col gap-1 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="font-mono text-sm">{date ?? '—'}</div>
      {rel && <div className="text-[11px] text-muted-foreground/70">{rel}</div>}
    </Card>
  )
}

export function WhoisLookupLayout() {
  const t = useTranslations('WhoisLookup')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<WhoisResult | null>(null)
  const { isCopied: rawCopied, copyToClipboard } = useCopyToClipboard()

  const lookup = useCallback(
    async (override?: string) => {
      const rawValue = override ?? input
      const normalized = normalizeTarget(rawValue)
      if (!normalized) {
        setError(t('errors.invalidTarget'))
        setResult(null)
        return
      }
      if (override) setInput(override)
      setLoading(true)
      setError(null)
      setResult(null)
      try {
        setResult(await rdapLookup(normalized.target, normalized.type))
      } catch (e) {
        setError(e instanceof Error ? e.message : t('errors.lookupFailed', { status: 0 }))
      } finally {
        setLoading(false)
      }
    },
    [input, t],
  )

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconWorldSearch}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT['Network & API']}
          offline={false}
        />
      </RevealItem>

      {/* Search card */}
      <Card className="space-y-3 p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') lookup()
              }}
              placeholder={t('placeholder')}
              className="pl-9 font-mono text-sm"
              disabled={loading}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <Button onClick={() => lookup()} disabled={loading || !input.trim()} className="shrink-0 gap-1.5">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? t('looking') : t('lookupBtn')}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground/60">{t('tryLabel')}</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => lookup(ex)}
              disabled={loading}
              className="rounded-md border border-border/40 bg-muted/20 px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground disabled:opacity-40"
            >
              {ex}
            </button>
          ))}
        </div>
      </Card>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <CircleAlert className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="h-[76px] animate-pulse bg-muted/20 p-3" />
            ))}
          </div>
          <Card className="h-32 animate-pulse bg-muted/20" />
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <ScrollArea className="min-h-0 flex-1">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pr-3 pb-4">
            {/* Summary */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-semibold">{result.target}</span>
              <Badge variant="secondary" className="text-[11px] uppercase">
                {result.type}
              </Badge>
            </div>

            <Card className="flex flex-col gap-1 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {result.type === 'ip' ? t('summary.network') : t('summary.registrar')}
              </div>
              <div className="text-sm">{result.registrar ?? t('notAvailable')}</div>
            </Card>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <DateCard icon={Calendar} label={t('dates.created')} iso={result.created} />
              <DateCard icon={Clock} label={t('dates.updated')} iso={result.updated} />
              <DateCard icon={Clock} label={t('dates.expires')} iso={result.expires} />
            </div>

            {/* Status */}
            {result.status.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t('sections.status')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.status.map((s) => (
                    <Badge key={s} variant="outline" className="font-mono text-[11px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Nameservers */}
            {result.nameservers.length > 0 && (
              <Card className="overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-2.5">
                  <Server className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('sections.nameservers')}
                  </span>
                  <Badge variant="secondary" className="ml-auto h-5 px-2 text-[11px]">
                    {result.nameservers.length}
                  </Badge>
                </div>
                <div className="divide-y divide-border/30">
                  {result.nameservers.map((ns) => (
                    <div key={ns} className="px-4 py-2 font-mono text-sm">
                      {ns}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Contacts */}
            {result.contacts.length > 0 && (
              <Card className="overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-2.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('sections.contacts')}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-2 font-medium">{t('contacts.roles')}</th>
                        <th className="px-4 py-2 font-medium">{t('contacts.name')}</th>
                        <th className="px-4 py-2 font-medium">{t('contacts.organization')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {result.contacts.map((c, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {c.roles.length > 0
                                ? c.roles.map((r) => (
                                    <Badge key={r} variant="outline" className="text-[10px]">
                                      {r}
                                    </Badge>
                                  ))
                                : '—'}
                            </div>
                          </td>
                          <td className="px-4 py-2">{c.name ?? '—'}</td>
                          <td className="px-4 py-2">{c.organization ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Raw RDAP */}
            <Collapsible>
              <Card className="overflow-hidden">
                <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/20">
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('sections.rawRdap')}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      void copyToClipboard(JSON.stringify(result.raw, null, 2), { silent: true })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation()
                        void copyToClipboard(JSON.stringify(result.raw, null, 2), { silent: true })
                      }
                    }}
                    className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    {rawCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {rawCopied ? t('copied') : t('copy')}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="max-h-[400px] overflow-auto border-t border-border/40 bg-muted/10 p-4 font-mono text-xs leading-relaxed">
                    {JSON.stringify(result.raw, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => lookup(result.target)}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                {t('refreshBtn')}
              </Button>
            </div>
          </motion.div>
        </ScrollArea>
      )}
    </div>
  )
}
