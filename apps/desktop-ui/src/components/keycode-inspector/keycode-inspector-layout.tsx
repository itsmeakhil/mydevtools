'use client'

import React, { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Copy, Keyboard, Trash2 } from 'lucide-react'
import { IconKeyboard } from '@tabler/icons-react'
import { ToolPageHeader } from '@/components/tools/tool-page-header'
import { RevealItem } from '@/components/dashboard/dashboard-reveal'
import { CATEGORY_ACCENT } from '@/components/dashboard/types'
import {
  KEY_HISTORY_LIMIT,
  isPreventable,
  locationName,
  serializeKeyEvent,
  type SerializedKeyEvent,
} from '@/lib/keycode-inspector'

interface HistoryEntry {
  id: number
  event: SerializedKeyEvent
}

const MODIFIERS = [
  { key: 'ctrlKey', label: 'Ctrl' },
  { key: 'shiftKey', label: 'Shift' },
  { key: 'altKey', label: 'Alt' },
  { key: 'metaKey', label: 'Meta' },
] as const

function displayKey(key: string, spaceLabel: string): string {
  return key === ' ' ? spaceLabel : key
}

function FieldCard({
  label,
  value,
  deprecated,
  deprecatedLabel,
}: {
  label: string
  value: React.ReactNode
  deprecated?: boolean
  deprecatedLabel?: string
}) {
  return (
    <Card className="flex min-w-0 flex-col gap-1 p-4">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <Label className="min-w-0 truncate font-mono text-xs font-medium text-muted-foreground">{label}</Label>
        {deprecated && (
          <Badge
            variant="outline"
            className="shrink-0 border-amber-500/40 px-1.5 py-0 text-[10px] text-amber-600 dark:text-amber-400"
          >
            {deprecatedLabel}
          </Badge>
        )}
      </div>
      <div className="min-w-0 break-words font-mono text-xl font-semibold">{value}</div>
    </Card>
  )
}

export function KeycodeInspectorLayout() {
  const t = useTranslations('KeycodeInspector')
  const { copyToClipboard } = useCopyToClipboard()

  const [current, setCurrent] = useState<SerializedKeyEvent | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [focused, setFocused] = useState(false)

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isPreventable(e)) e.preventDefault()
    const serialized = serializeKeyEvent(e)
    setCurrent(serialized)
    if (!e.repeat) {
      setHistory((prev) =>
        [{ id: Date.now() + Math.random(), event: serialized }, ...prev].slice(0, KEY_HISTORY_LIMIT),
      )
    }
  }, [])

  const copyJson = (event: SerializedKeyEvent) =>
    void copyToClipboard(JSON.stringify(event, null, 2), t('copiedJson'))

  const clear = () => {
    setCurrent(null)
    setHistory([])
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconKeyboard}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT['Media & Design']}
        />
      </RevealItem>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            {/* Capture area / hero */}
            <div
              tabIndex={0}
              role="textbox"
              autoFocus
              aria-label={t('capture.prompt')}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center outline-none transition-colors ${
                focused ? 'border-primary/60 bg-primary/5' : 'border-border/60 bg-muted/20 hover:border-border'
              }`}
            >
              {current ? (
                <>
                  <div className="max-w-full break-words font-mono text-5xl font-bold tracking-tight md:text-6xl">
                    {displayKey(current.key, t('hero.spaceKey'))}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">{t('hero.keyLabel')}</div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {MODIFIERS.map((m) => (
                      <Badge
                        key={m.key}
                        variant={current[m.key] ? 'default' : 'outline'}
                        className={current[m.key] ? '' : 'text-muted-foreground/60'}
                      >
                        {m.label}
                      </Badge>
                    ))}
                    {current.repeat && <Badge variant="secondary">{t('hero.repeat')}</Badge>}
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => copyJson(current)}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    {t('copyJson')}
                  </Button>
                </>
              ) : (
                <>
                  <Keyboard className="h-10 w-10 text-muted-foreground/60" />
                  <div className="text-xl font-semibold text-muted-foreground">{t('capture.prompt')}</div>
                  <p className="text-sm text-muted-foreground/70">
                    {focused ? t('capture.ready') : t('capture.clickToFocus')}
                  </p>
                </>
              )}
            </div>

            {/* Field cards */}
            {current && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <FieldCard label={t('fields.code')} value={current.code || '—'} />
                <FieldCard
                  label={t('fields.keyCode')}
                  value={current.keyCode}
                  deprecated
                  deprecatedLabel={t('deprecated')}
                />
                <FieldCard
                  label={t('fields.which')}
                  value={current.which}
                  deprecated
                  deprecatedLabel={t('deprecated')}
                />
                <FieldCard
                  label={t('fields.location')}
                  value={
                    <span>
                      {t(`location.${locationName(current.location)}`)}{' '}
                      <span className="text-sm text-muted-foreground">({current.location})</span>
                    </span>
                  }
                />
              </div>
            )}
          </div>

          {/* History */}
          <Card className="flex min-h-[280px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-2.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('history.title')}
              </Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={clear}
                disabled={history.length === 0 && !current}
                title={t('history.clear')}
                aria-label={t('history.clear')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground/70">{t('history.empty')}</p>
              ) : (
                <ul className="divide-y divide-border/30">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      onClick={() => setCurrent(entry.event)}
                      className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2 text-sm transition-colors hover:bg-muted/50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-mono font-semibold">
                          {displayKey(entry.event.key, t('hero.spaceKey'))}
                        </span>
                        <span className="truncate font-mono text-xs text-muted-foreground">{entry.event.code}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="font-mono text-xs text-muted-foreground">{entry.event.keyCode}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyJson(entry.event)
                          }}
                          title={t('copyJson')}
                          aria-label={t('copyJson')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
