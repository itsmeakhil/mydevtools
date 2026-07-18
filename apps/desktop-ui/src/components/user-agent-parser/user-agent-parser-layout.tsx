'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseUserAgent } from '@/lib/user-agent-parser'
import { IconUserSearch } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text)
}

function fmtNameVersion(name: string | null, version: string | null): string {
  if (!name && !version) return '—'
  if (name && version) return `${name} ${version}`
  return name ?? version ?? '—'
}

export function UserAgentParserLayout() {
  const t = useTranslations('UserAgentParser')
  const [ua, setUa] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const result = useMemo(() => (ua.trim() ? parseUserAgent(ua) : null), [ua])

  const rows = useMemo(() => {
    if (!result) return []
    return [
      { key: 'browser', label: t('browserLabel'), value: fmtNameVersion(result.browser.name, result.browser.version) },
      { key: 'os', label: t('osLabel'), value: fmtNameVersion(result.os.name, result.os.version) },
      { key: 'deviceType', label: t('deviceTypeLabel'), value: result.device.type ?? '—' },
      { key: 'deviceVendor', label: t('deviceVendorLabel'), value: result.device.vendor ?? '—' },
      { key: 'deviceModel', label: t('deviceModelLabel'), value: result.device.model ?? '—' },
      { key: 'engine', label: t('engineLabel'), value: fmtNameVersion(result.engine.name, result.engine.version) },
      { key: 'cpu', label: t('cpuArchLabel'), value: result.cpu.architecture ?? '—' },
    ]
  }, [result, t])

  const canShow = Boolean(ua.trim())
  const canCopyJson = Boolean(result)

  const json = useMemo(() => (result ? JSON.stringify(result, null, 2) : ''), [result])

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <RevealItem index={0} className="shrink-0">
        <ToolPageHeader
          icon={IconUserSearch}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT['Network & API']}
        />
      </RevealItem>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 overflow-auto p-4">
          <div className="space-y-2">
            <Label htmlFor="ua-input">{t('inputLabel')}</Label>
            <Textarea
              id="ua-input"
              value={ua}
              onChange={(e) => setUa(e.target.value)}
              placeholder={t('placeholder')}
              className="min-h-[180px] resize-y font-mono text-sm"
              spellCheck={false}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">{t('hint')}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setUa('')}>
              {t('clear')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setUa(
                  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                )
              }
            >
              {t('exampleDesktop')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setUa(
                  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
                )
              }
            >
              {t('exampleMobile')}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 overflow-auto p-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('resultLabel')}
            </Label>
            {canCopyJson && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    await copyToClipboard(json)
                    setCopiedKey('json')
                    setTimeout(() => setCopiedKey(null), 1500)
                  } catch {
                    /* ignore */
                  }
                }}
              >
                {copiedKey === 'json' ? (
                  <Check className="mr-1.5 h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="mr-1.5 h-4 w-4" />
                )}
                {copiedKey === 'json' ? t('copied') : t('copyJson')}
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
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.key} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-muted-foreground">{r.label}</div>
                      <div className="font-mono break-words">{r.value}</div>
                    </div>
                    {r.value !== '—' && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="shrink-0"
                        onClick={async () => {
                          try {
                            await copyToClipboard(r.value)
                            setCopiedKey(r.key)
                            setTimeout(() => setCopiedKey(null), 1500)
                          } catch {
                            /* ignore */
                          }
                        }}
                        title={t('copy')}
                        aria-label={t('copy')}
                      >
                        {copiedKey === r.key ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{t('localNote')}</p>
        </Card>
      </div>
    </div>
  )
}

