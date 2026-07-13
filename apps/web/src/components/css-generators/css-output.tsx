'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { Check, Code, Copy } from 'lucide-react'

/** CSS output block with a copy button, shared by all generator tabs. */
export function CssOutput({ css }: { css: string }) {
  const t = useTranslations('CssGenerators')
  const { isCopied, copyToClipboard } = useCopyToClipboard()

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Code className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('output')}</Label>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void copyToClipboard(css, { silent: true })}>
          {isCopied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
          {isCopied ? t('copied') : t('copy')}
        </Button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all p-3 font-mono text-xs leading-relaxed">{css}</pre>
    </div>
  )
}
