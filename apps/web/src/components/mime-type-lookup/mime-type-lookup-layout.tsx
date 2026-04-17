'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { lookupMimeType } from '@/lib/mime-type-lookup'

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

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 overflow-auto p-4">
          <div className="space-y-2">
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue('package.json')}
            >
              {t('exampleFilename')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setValue('.png')}>
              {t('exampleExtension')}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 overflow-auto p-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('resultLabel')}
            </Label>
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
        </Card>
      </div>
    </div>
  )
}

