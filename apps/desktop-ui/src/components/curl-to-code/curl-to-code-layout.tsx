'use client'

import React, { useMemo, useState } from 'react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Copy, Trash2 } from 'lucide-react'
import { IconTerminal2 } from '@tabler/icons-react'
import { ToolShell } from '@/components/tools/tool-shell'
import { ToolPanels, IOPanel, ToolTextArea } from '@/components/tools/io-panel'
import { CURL_TARGETS, curlToCode, type CurlTarget } from '@/lib/curl-to-code'

const SAMPLE = `curl -X POST https://api.example.com/v1/users \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer TOKEN' \\
  -d '{"name":"Ada","role":"admin"}'`

export function CurlToCodeLayout() {
  const t = useTranslations('CurlToCode')
  const [input, setInput] = useState('')
  const [target, setTarget] = useState<CurlTarget>('fetch')
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard()

  const result = useMemo(() => curlToCode(input, target), [input, target])

  const toolbar = (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <Select value={target} onValueChange={(v) => setTarget(v as CurlTarget)}>
        <SelectTrigger className="w-[190px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURL_TARGETS.map((tg) => (
            <SelectItem key={tg.value} value={tg.value}>
              {tg.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <ToolShell
      icon={IconTerminal2}
      title={t('title')}
      description={t('subtitle')}
      toolbar={toolbar}
    >
      <ToolPanels className="lg:grid-cols-2">
        <IOPanel
          label={t('panels.input')}
          actions={
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setInput(SAMPLE)}
              >
                {t('sample')}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setInput('')}
                disabled={!input}
                title={t('clear')}
              >
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
          bodyClassName="overflow-auto"
          actions={
            <Button
              size="sm"
              variant="secondary"
              className="h-7"
              disabled={!result.code}
              onClick={() => void copyToClipboard(result.code, { silent: true })}
            >
              {copied ? (
                <Check className="mr-1.5 h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="mr-1.5 h-4 w-4" />
              )}
              {copied ? t('copied') : t('copy')}
            </Button>
          }
        >
          {result.error ? (
            <div className="p-3 text-sm text-destructive">{result.error}</div>
          ) : result.code ? (
            <pre className="whitespace-pre p-3 font-mono text-sm leading-relaxed">
              {result.code}
            </pre>
          ) : (
            <div className="p-3 text-sm text-muted-foreground">{t('outputPlaceholder')}</div>
          )}
        </IOPanel>
      </ToolPanels>
    </ToolShell>
  )
}
