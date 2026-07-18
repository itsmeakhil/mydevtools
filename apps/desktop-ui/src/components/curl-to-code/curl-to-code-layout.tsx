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
import { Check, Copy, FileText, Trash2 } from 'lucide-react'
import { IconTerminal2 } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'
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

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconTerminal2}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT['Network & API']}
          offline={false}
        />
      </RevealItem>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('panels.input')}</Label>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setInput(SAMPLE)}>
                {t('sample')}
              </Button>
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
          <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-4 py-2">
            <Select value={target} onValueChange={(v) => setTarget(v as CurlTarget)}>
              <SelectTrigger className="h-8 w-[190px] text-xs">
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
            <Button
              size="sm"
              variant="secondary"
              disabled={!result.code}
              onClick={() => void copyToClipboard(result.code, { silent: true })}
            >
              {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? t('copied') : t('copy')}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {result.error ? (
              <div className="p-4 text-sm text-destructive">{result.error}</div>
            ) : result.code ? (
              <pre className="p-4 font-mono text-sm leading-relaxed whitespace-pre">{result.code}</pre>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">{t('outputPlaceholder')}</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
