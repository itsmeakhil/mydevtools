'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Check, Copy, FileText, Trash2 } from 'lucide-react'
import { IconLetterCase } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'

/** Split arbitrary text into normalized words, honouring camelCase / ACRONYM / separators. */
function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()

interface CaseDef {
  id: string
  label: string
  convert: (words: string[], raw: string) => string
}

const CASES: CaseDef[] = [
  { id: 'camel', label: 'camelCase', convert: (w) => w.map((x, i) => (i === 0 ? x.toLowerCase() : cap(x))).join('') },
  { id: 'pascal', label: 'PascalCase', convert: (w) => w.map(cap).join('') },
  { id: 'snake', label: 'snake_case', convert: (w) => w.map((x) => x.toLowerCase()).join('_') },
  { id: 'constant', label: 'CONSTANT_CASE', convert: (w) => w.map((x) => x.toUpperCase()).join('_') },
  { id: 'kebab', label: 'kebab-case', convert: (w) => w.map((x) => x.toLowerCase()).join('-') },
  { id: 'train', label: 'Train-Case', convert: (w) => w.map(cap).join('-') },
  { id: 'dot', label: 'dot.case', convert: (w) => w.map((x) => x.toLowerCase()).join('.') },
  { id: 'path', label: 'path/case', convert: (w) => w.map((x) => x.toLowerCase()).join('/') },
  { id: 'title', label: 'Title Case', convert: (w) => w.map(cap).join(' ') },
  { id: 'sentence', label: 'Sentence case', convert: (w) => w.map((x, i) => (i === 0 ? cap(x) : x.toLowerCase())).join(' ') },
  { id: 'lower', label: 'lower case', convert: (_w, raw) => raw.toLowerCase() },
  { id: 'upper', label: 'UPPER CASE', convert: (_w, raw) => raw.toUpperCase() },
]

function CopyIconButton({ value, title }: { value: string; title: string }) {
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard()
  const handleCopy = useCallback(() => {
    void copyToClipboard(value, { silent: true, resetMs: 1200 })
  }, [value, copyToClipboard])
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopy} disabled={!value} title={title}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

export function StringCaseConverterLayout() {
  const t = useTranslations('StringCaseConverter')
  const [input, setInput] = useState('')

  const words = useMemo(() => splitWords(input), [input])
  const results = useMemo(
    () => CASES.map((c) => ({ id: c.id, label: c.label, value: input.trim() ? c.convert(words, input) : '' })),
    [words, input],
  )

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconLetterCase}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Converters}
        />
      </RevealItem>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('panels.input')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {t('wordCount', { count: words.length })}
              </span>
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
          <div className="flex items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('panels.output')}</Label>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <div className="grid grid-cols-1 gap-2">
              {results.map((r) => (
                <div key={r.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{r.label}</div>
                    <CopyIconButton value={r.value} title={t('copyTitle')} />
                  </div>
                  <div className="mt-1 break-all font-mono text-sm">
                    {r.value || <span className="text-muted-foreground/60">{t('emptyHint')}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
