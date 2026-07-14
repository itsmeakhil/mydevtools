'use client'

import React, { useMemo, useState } from 'react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Check, Copy, FileText, Trash2 } from 'lucide-react'
import { IconWand } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'
import { BEAUTIFY_LANGS, beautify, minify, type BeautifyLang } from '@/lib/beautify-minify'

type Action = 'beautify' | 'minify'

export function BeautifyMinifyLayout() {
  const t = useTranslations('BeautifyMinify')
  const [input, setInput] = useState('')
  const [lang, setLang] = useState<BeautifyLang>('json')
  const [action, setAction] = useState<Action>('beautify')
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard()

  const result = useMemo(
    () => (action === 'beautify' ? beautify(input, lang, 2) : minify(input, lang)),
    [input, lang, action],
  )

  const outBytes = useMemo(
    () => (result.output ? new TextEncoder().encode(result.output).length : 0),
    [result.output],
  )
  const inBytes = useMemo(() => (input ? new TextEncoder().encode(input).length : 0), [input])

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconWand}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Formatters}
        />
      </RevealItem>

      <Card className="flex flex-wrap items-end gap-4 p-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('langLabel')}</Label>
          <Select value={lang} onValueChange={(v) => setLang(v as BeautifyLang)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BEAUTIFY_LANGS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('actionLabel')}</Label>
          <ToggleGroup
            type="single"
            value={action}
            onValueChange={(v) => v && setAction(v as Action)}
            className="justify-start"
          >
            <ToggleGroupItem value="beautify" className="px-4 text-xs">{t('beautify')}</ToggleGroupItem>
            <ToggleGroupItem value="minify" className="px-4 text-xs">{t('minify')}</ToggleGroupItem>
          </ToggleGroup>
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
              <span className="text-[10px] tabular-nums text-muted-foreground">{t('bytes', { count: inBytes.toLocaleString() })}</span>
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
              <span className="text-[10px] tabular-nums text-muted-foreground">{t('bytes', { count: outBytes.toLocaleString() })}</span>
              <Button
                size="sm"
                variant="secondary"
                disabled={!result.output}
                onClick={() => void copyToClipboard(result.output, { silent: true })}
              >
                {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
                {copied ? t('copied') : t('copy')}
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {result.error ? (
              <div className="p-4 text-sm text-destructive">{result.error}</div>
            ) : result.output ? (
              <pre className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">{result.output}</pre>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">{t('outputPlaceholder')}</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
