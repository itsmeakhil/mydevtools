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
import { ArrowRightLeft, Check, Copy, FileText, Trash2 } from 'lucide-react'
import { IconReplace } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'
import { ESCAPE_MODES, transform, type EscapeDir, type EscapeMode } from '@/lib/escape-encode'

const MODE_LABEL_KEY: Record<EscapeMode, string> = {
  html: 'modes.html',
  backslash: 'modes.backslash',
  hex: 'modes.hex',
  unicode: 'modes.unicode',
}

export function EscapeEncodeLayout() {
  const t = useTranslations('EscapeEncode')
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<EscapeMode>('html')
  const [dir, setDir] = useState<EscapeDir>('encode')
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard()

  const result = useMemo(() => transform(input, mode, dir), [input, mode, dir])

  const swap = () => {
    setDir((d) => (d === 'encode' ? 'decode' : 'encode'))
    if (result.output && !result.error) setInput(result.output)
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconReplace}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Converters}
        />
      </RevealItem>

      <Card className="flex flex-wrap items-end gap-4 p-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('modeLabel')}</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as EscapeMode)}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESCAPE_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {t(MODE_LABEL_KEY[m.value])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('directionLabel')}</Label>
          <ToggleGroup
            type="single"
            value={dir}
            onValueChange={(v) => v && setDir(v as EscapeDir)}
            className="justify-start"
          >
            <ToggleGroupItem value="encode" className="px-4 text-xs">{t('encode')}</ToggleGroupItem>
            <ToggleGroupItem value="decode" className="px-4 text-xs">{t('decode')}</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={swap}>
          <ArrowRightLeft className="mr-1.5 h-4 w-4" />
          {t('swap')}
        </Button>
      </Card>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('panels.input')}</Label>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInput('')} disabled={!input} title={t('clear')}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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
          <div className="relative min-h-0 flex-1">
            {result.error ? (
              <div className="p-4 text-sm text-destructive">{result.error}</div>
            ) : (
              <textarea
                value={result.output}
                readOnly
                placeholder={t('outputPlaceholder')}
                className="absolute inset-0 h-full w-full resize-none bg-transparent p-4 font-mono text-sm placeholder:text-muted-foreground/50 focus:outline-none"
                spellCheck={false}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
