'use client'

import React, { useMemo, useState } from 'react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Copy, Trash2 } from 'lucide-react'
import { IconArrowsSort } from '@tabler/icons-react'
import { ToolShell } from '@/components/tools/tool-shell'
import { ToolPanels, IOPanel, ToolTextArea } from '@/components/tools/io-panel'

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

  const toolbar = (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card px-4 py-3">
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
    </div>
  )

  return (
    <ToolShell
      icon={IconArrowsSort}
      title={t('title')}
      description={t('subtitle')}
      toolbar={toolbar}
    >
      <ToolPanels className="lg:grid-cols-2">
        <IOPanel
          label={t('panels.input')}
          actions={
            <>
              <span className="text-[10px] tabular-nums text-muted-foreground">{t('lineCount', { count: inCount })}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInput('')} disabled={!input} title={t('clear')}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          }
        >
          <ToolTextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('placeholder')}
            autoComplete="off"
          />
        </IOPanel>

        <IOPanel
          label={t('panels.output')}
          actions={
            <>
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
            </>
          }
        >
          <ToolTextArea
            value={output}
            readOnly
            placeholder={t('outputPlaceholder')}
          />
        </IOPanel>
      </ToolPanels>
    </ToolShell>
  )
}
