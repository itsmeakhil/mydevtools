'use client'

import React, { useMemo, useState } from 'react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ArrowRightLeft, Check, Copy, Trash2 } from 'lucide-react'
import { IconReplace } from '@tabler/icons-react'
import { ToolShell } from '@/components/tools/tool-shell'
import { ToolPanels, IOPanel, ToolTextArea } from '@/components/tools/io-panel'
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

  const toolbar = (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card px-4 py-3">
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
    </div>
  )

  return (
    <ToolShell
      icon={IconReplace}
      title={t('title')}
      description={t('subtitle')}
      toolbar={toolbar}
    >
      <ToolPanels className="lg:grid-cols-2">
        <IOPanel
          label={t('panels.input')}
          actions={
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setInput('')}
              disabled={!input}
              title={t('clear')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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
            <Button
              size="sm"
              variant="secondary"
              disabled={!result.output}
              onClick={() => void copyToClipboard(result.output, { silent: true })}
            >
              {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? t('copied') : t('copy')}
            </Button>
          }
        >
          {result.error ? (
            <div className="p-3 text-sm text-destructive">{result.error}</div>
          ) : (
            <ToolTextArea
              value={result.output}
              readOnly
              placeholder={t('outputPlaceholder')}
            />
          )}
        </IOPanel>
      </ToolPanels>
    </ToolShell>
  )
}
