'use client'

import React, { useMemo, useState } from 'react'
import { useDebounce } from 'use-debounce'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  ArrowRight,
  Check,
  CircleCheck,
  Copy,
  FileText,
  GitCompare,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import { IconGitCompare } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'
import {
  SAMPLE_A,
  SAMPLE_B,
  diffJson,
  formatJsonText,
  previewValue,
  type ChangeType,
} from '@/lib/json-diff'

const TYPE_STYLES: Record<ChangeType, { badge: string; row: string }> = {
  added: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    row: 'border-emerald-500/30',
  },
  removed: {
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400',
    row: 'border-red-500/30',
  },
  changed: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    row: 'border-amber-500/30',
  },
}

interface DocPanelProps {
  label: string
  value: string
  onChange: (v: string) => void
  onSample: () => void
  t: ReturnType<typeof useTranslations>
}

function DocPanel({ label, value, onChange, onSample, t }: DocPanelProps) {
  const format = () => {
    const res = formatJsonText(value)
    if (res.error) {
      toast.error(t('formatError'))
    } else {
      onChange(res.output)
    }
  }
  return (
    <Card className="flex flex-col overflow-hidden min-h-0">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onSample}>
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            {t('sample')}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={format} disabled={!value.trim()}>
            <WandSparkles className="mr-1 h-3.5 w-3.5" />
            {t('format')}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onChange('')} disabled={!value} title={t('clear')}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('placeholder')}
          className="absolute inset-0 h-full w-full resize-none bg-transparent p-4 font-mono text-sm placeholder:text-muted-foreground/50 focus:outline-none"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </Card>
  )
}

export function JsonDiffLayout() {
  const t = useTranslations('JsonDiff')
  const [aText, setAText] = useState('')
  const [bText, setBText] = useState('')
  const [ignoreArrayOrder, setIgnoreArrayOrder] = useState(false)
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard()

  const [debouncedA] = useDebounce(aText, 300)
  const [debouncedB] = useDebounce(bText, 300)

  const bothFilled = debouncedA.trim().length > 0 && debouncedB.trim().length > 0

  const result = useMemo(() => {
    if (!bothFilled) return null
    return diffJson(debouncedA, debouncedB, { ignoreArrayOrder })
  }, [bothFilled, debouncedA, debouncedB, ignoreArrayOrder])

  const summary = useMemo(() => {
    const counts = { added: 0, removed: 0, changed: 0 }
    for (const c of result?.changes ?? []) counts[c.type]++
    return counts
  }, [result])

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconGitCompare}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Formatters}
        />
      </RevealItem>

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-2">
          <Switch id="ignore-array-order" checked={ignoreArrayOrder} onCheckedChange={setIgnoreArrayOrder} />
          <Label htmlFor="ignore-array-order" className="text-sm">{t('options.ignoreArrayOrder')}</Label>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => {
            setAText(SAMPLE_A)
            setBText(SAMPLE_B)
          }}
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          {t('loadBothSamples')}
        </Button>
      </Card>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <DocPanel label={t('panels.left')} value={aText} onChange={setAText} onSample={() => setAText(SAMPLE_A)} t={t} />
          <DocPanel label={t('panels.right')} value={bText} onChange={setBText} onSample={() => setBText(SAMPLE_B)} t={t} />
        </div>

        <Card className="flex flex-col overflow-hidden min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <GitCompare className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('panels.results')}</Label>
              {result && !result.error && result.changes.length > 0 && (
                <>
                  <Badge className={`text-[10px] ${TYPE_STYLES.added.badge}`} variant="secondary">
                    {t('summary.added', { count: summary.added })}
                  </Badge>
                  <Badge className={`text-[10px] ${TYPE_STYLES.removed.badge}`} variant="secondary">
                    {t('summary.removed', { count: summary.removed })}
                  </Badge>
                  <Badge className={`text-[10px] ${TYPE_STYLES.changed.badge}`} variant="secondary">
                    {t('summary.changed', { count: summary.changed })}
                  </Badge>
                </>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={!result || !!result.error || result.changes.length === 0}
              onClick={() => void copyToClipboard(JSON.stringify(result?.changes ?? [], null, 2), { silent: true })}
            >
              {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? t('copied') : t('copyChanges')}
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            {!result ? (
              <div className="p-4 text-sm text-muted-foreground/60">{t('empty')}</div>
            ) : result.error ? (
              <div className="p-4 text-sm text-destructive">{result.error}</div>
            ) : result.changes.length === 0 ? (
              <div className="flex items-center gap-2 p-4 text-sm text-emerald-600 dark:text-emerald-400">
                <CircleCheck className="h-4 w-4" />
                {t('identical')}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 p-3">
                {result.changes.map((change, i) => (
                  <div
                    key={`${change.path}-${change.type}-${i}`}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border-l-2 bg-muted/30 px-3 py-1.5 ${TYPE_STYLES[change.type].row}`}
                  >
                    <Badge className={`text-[10px] uppercase ${TYPE_STYLES[change.type].badge}`} variant="secondary">
                      {t(`types.${change.type}`)}
                    </Badge>
                    <code className="font-mono text-xs font-medium">{change.path}</code>
                    <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                      {change.type !== 'added' && (
                        <span className="text-red-600 dark:text-red-400">{previewValue(change.before)}</span>
                      )}
                      {change.type === 'changed' && <ArrowRight className="h-3 w-3" />}
                      {change.type !== 'removed' && (
                        <span className="text-emerald-600 dark:text-emerald-400">{previewValue(change.after)}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}
