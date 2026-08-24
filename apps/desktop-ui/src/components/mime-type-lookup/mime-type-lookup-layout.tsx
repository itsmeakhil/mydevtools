'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { lookupMimeType } from '@/lib/mime-type-lookup'
import { IconFileInfo } from '@tabler/icons-react'
import { ToolShell } from '@/components/tools/tool-shell'

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text)
}

export function MimeTypeLookupLayout() {
  const t = useTranslations('MimeTypeLookup')
  const [value, setValue] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const result = useMemo(() => lookupMimeType(value), [value])

  const items = useMemo(() => {
    const out: Array<{ key: string; label: string; value: string | null }> = [
      { key: 'mimeType', label: t('mimeTypeLabel'), value: result.mimeType },
      { key: 'contentType', label: t('contentTypeLabel'), value: result.contentType },
      { key: 'charset', label: t('charsetLabel'), value: result.charset },
    ]

    return out
  }, [result.charset, result.contentType, result.mimeType, t])

  const canShow = Boolean(value.trim())
  const hasMatch = Boolean(result.mimeType)

  const toolbar = (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor="mime-input">{t('inputLabel')}</Label>
        <Input
          id="mime-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('placeholder')}
          spellCheck={false}
          autoComplete="off"
          inputMode="text"
        />
        <p className="text-xs text-muted-foreground">{t('hint')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setValue('')}>
          {t('clear')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setValue('package.json')}>
          {t('exampleFilename')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setValue('.png')}>
          {t('exampleExtension')}
        </Button>
      </div>
    </div>
  )

  return (
    <ToolShell
      icon={IconFileInfo}
      title={t('title')}
      description={t('subtitle')}
      toolbar={toolbar}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('resultLabel')}
          </span>
          {hasMatch && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={async () => {
                if (!result.mimeType) return
                try {
                  await copyToClipboard(result.mimeType)
                  setCopiedKey('mimeType')
                  setTimeout(() => setCopiedKey(null), 1500)
                } catch {
                  /* ignore */
                }
              }}
            >
              {copiedKey === 'mimeType' ? (
                <Check className="mr-1.5 h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="mr-1.5 h-4 w-4" />
              )}
              {copiedKey === 'mimeType' ? t('copied') : t('copyMimeType')}
            </Button>
          )}
        </div>

        <div
          className={cn(
            'rounded-md border bg-muted/30 p-3 text-sm',
            !canShow && 'text-muted-foreground'
          )}
        >
          {!canShow ? (
            <span>{t('emptyHint')}</span>
          ) : !hasMatch ? (
            <span className="text-destructive">{t('notFound')}</span>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {t('normalizedLabel')}{' '}
                <span className="font-mono text-foreground">{result.normalized || '—'}</span>
              </div>

              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.key} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-muted-foreground">{it.label}</div>
                      <div className="font-mono break-all">{it.value ?? '—'}</div>
                    </div>

                    {it.value && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="shrink-0"
                        onClick={async () => {
                          try {
                            await copyToClipboard(it.value!)
                            setCopiedKey(it.key)
                            setTimeout(() => setCopiedKey(null), 1500)
                          } catch {
                            /* ignore */
                          }
                        }}
                        title={t('copy')}
                        aria-label={t('copy')}
                      >
                        {copiedKey === it.key ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{t('localNote')}</p>
      </div>
    </ToolShell>
  )
}
