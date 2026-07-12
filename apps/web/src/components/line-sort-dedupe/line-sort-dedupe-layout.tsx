'use client'

import React, { useMemo, useState } from 'react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Copy, FileText, Trash2 } from 'lucide-react'
import { IconArrowsSort } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'

type SortMode = 'none' | 'asc' | 'desc' | 'natural' | 'length' | 'reverse'

interface Options {
  sort: SortMode
  caseInsensitive: boolean
  trim: boolean
  removeEmpty: boolean
  dedupe: boolean
}

function process(text: string, o: Options): string {
  if (!text) return ''
  let lines = text.split(/\r\n|\r|\n/)

  if (o.trim) lines = lines.map((l) => l.trim())
  if (o.removeEmpty) lines = lines.filter((l) => l.trim() !== '')

  if (o.dedupe) {
    const seen = new Set<string>()
    lines = lines.filter((l) => {
      const key = o.caseInsensitive ? l.toLowerCase() : l
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const cmp = (a: string, b: string) => {
    const x = o.caseInsensitive ? a.toLowerCase() : a
    const y = o.caseInsensitive ? b.toLowerCase() : b
    return x < y ? -1 : x > y ? 1 : 0
  }

  switch (o.sort) {
    case 'asc':
      lines = [...lines].sort(cmp)
      break
    case 'desc':
      lines = [...lines].sort((a, b) => cmp(b, a))
      break
    case 'natural':
      lines = [...lines].sort((a, b) =>
        (o.caseInsensitive ? a.toLowerCase() : a).localeCompare(
          o.caseInsensitive ? b.toLowerCase() : b,
          undefined,
          { numeric: true, sensitivity: 'base' },
        ),
      )
      break
    case 'length':
      lines = [...lines].sort((a, b) => a.length - b.length || cmp(a, b))
      break
    case 'reverse':
      lines = [...lines].reverse()
      break
    case 'none':
    default:
      break
  }

  return lines.join('\n')
}

export function LineSortDedupeLayout() {
  const t = useTranslations('LineSortDedupe')
  const [input, setInput] = useState('')
  const [opts, setOpts] = useState<Options>({
    sort: 'asc',
    caseInsensitive: false,
    trim: false,
    removeEmpty: true,
    dedupe: true,
  })
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard()

  const output = useMemo(() => process(input, opts), [input, opts])

  const inCount = useMemo(() => (input ? input.split(/\r\n|\r|\n/).length : 0), [input])
  const outCount = useMemo(() => (output ? output.split('\n').length : 0), [output])

  const set = <K extends keyof Options>(k: K, v: Options[K]) => setOpts((p) => ({ ...p, [k]: v }))

  const toggles: { key: keyof Options; label: string }[] = [
    { key: 'dedupe', label: t('opts.dedupe') },
    { key: 'removeEmpty', label: t('opts.removeEmpty') },
    { key: 'trim', label: t('opts.trim') },
    { key: 'caseInsensitive', label: t('opts.caseInsensitive') },
  ]

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconArrowsSort}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Converters}
        />
      </RevealItem>

      <Card className="flex flex-wrap items-end gap-4 p-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('opts.sort')}</Label>
          <Select value={opts.sort} onValueChange={(v) => set('sort', v as SortMode)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('sortModes.none')}</SelectItem>
              <SelectItem value="asc">{t('sortModes.asc')}</SelectItem>
              <SelectItem value="desc">{t('sortModes.desc')}</SelectItem>
              <SelectItem value="natural">{t('sortModes.natural')}</SelectItem>
              <SelectItem value="length">{t('sortModes.length')}</SelectItem>
              <SelectItem value="reverse">{t('sortModes.reverse')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {toggles.map((tg) => (
            <label key={tg.key} className="flex cursor-pointer items-center gap-2 text-sm">
              <Switch
                checked={opts[tg.key] as boolean}
                onCheckedChange={(v) => set(tg.key, v as never)}
              />
              {tg.label}
            </label>
          ))}
        </div>
      </Card>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('panels.input')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tabular-nums text-muted-foreground">{t('lineCount', { count: inCount })}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInput('')} disabled={!input} title={t('clear')}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('placeholder')}
              className="absolute inset-0 h-full w-full resize-none bg-transparent p-4 font-mono text-sm placeholder:text-muted-foreground/50 focus:outline-none"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('panels.output')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tabular-nums text-muted-foreground">{t('lineCount', { count: outCount })}</span>
              <Button
                size="sm"
                variant="secondary"
                disabled={!output}
                onClick={() => void copyToClipboard(output, { silent: true })}
              >
                {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
                {copied ? t('copied') : t('copy')}
              </Button>
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            <textarea
              value={output}
              readOnly
              placeholder={t('outputPlaceholder')}
              className="absolute inset-0 h-full w-full resize-none bg-transparent p-4 font-mono text-sm placeholder:text-muted-foreground/50 focus:outline-none"
              spellCheck={false}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
