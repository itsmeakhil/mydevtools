'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Clock3, Plus, RotateCcw, X } from 'lucide-react'
import { IconWorld } from '@tabler/icons-react'
import { ToolShell } from '@/components/tools/tool-shell'
import { cn } from '@/lib/utils'
import {
  convertParts,
  dayShift,
  DEFAULT_TARGET_ZONES,
  formatOffset,
  splitZone,
  wallTimeToInstant,
  workingHoursBand,
  zoneOffsetMinutes,
  type WallTime,
  type WorkingBand,
} from '@/lib/timezone-converter'
import { ZoneCombobox } from './zone-combobox'

const STORAGE_KEY = 'mydevtools:timezone-converter:zones'

const BAND_DOT: Record<WorkingBand, string> = {
  work: 'bg-emerald-500',
  edge: 'bg-amber-500',
  night: 'bg-rose-500',
}

function toInputValue(w: WallTime): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${w.y}-${p(w.m)}-${p(w.d)}T${p(w.hh)}:${p(w.mm)}`
}

function parseInputValue(v: string): WallTime | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v)
  if (!m) return null
  return { y: +m[1], m: +m[2], d: +m[3], hh: +m[4], mm: +m[5] }
}

function formatScrub(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+'
  const abs = Math.abs(minutes)
  return `${sign}${Math.floor(abs / 60)}h${abs % 60 ? ` ${abs % 60}m` : ''}`
}

export function TimezoneConverterLayout() {
  const t = useTranslations('TimezoneConverter')

  const allZones = useMemo<string[]>(() => {
    try {
      return Intl.supportedValuesOf('timeZone')
    } catch {
      return DEFAULT_TARGET_ZONES
    }
  }, [])

  const [localZone, setLocalZone] = useState('UTC')
  const [sourceTz, setSourceTz] = useState<string>('UTC')
  const [wallInput, setWallInput] = useState('')
  const [scrub, setScrub] = useState(0) // minutes, -720..720
  const [targets, setTargets] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  // Hydrate client-only defaults (local zone, current time, persisted targets).
  useEffect(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    setLocalZone(local)
    setSourceTz(local)
    const nowParts = convertParts(new Date(), local)
    setWallInput(toInputValue(nowParts))

    let stored: string[] | null = null
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.every((z): z is string => typeof z === 'string')) {
          stored = parsed
        }
      }
    } catch {
      // ignore bad storage
    }
    const defaults = [local, ...DEFAULT_TARGET_ZONES].filter((z, i, arr) => arr.indexOf(z) === i)
    setTargets(stored ?? defaults)
    setReady(true)
  }, [])

  // Persist target list.
  useEffect(() => {
    if (!ready) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(targets))
    } catch {
      // storage may be unavailable
    }
  }, [targets, ready])

  const baseInstant = useMemo(() => {
    const w = parseInputValue(wallInput)
    if (!w) return null
    try {
      return wallTimeToInstant(w, sourceTz)
    } catch {
      return null
    }
  }, [wallInput, sourceTz])

  const effectiveInstant = useMemo(
    () => (baseInstant ? new Date(baseInstant.getTime() + scrub * 60000) : null),
    [baseInstant, scrub],
  )

  // Offsets for the combobox, refreshed at hour granularity so scrubbing stays smooth.
  const offsetKey = effectiveInstant ? Math.floor(effectiveInstant.getTime() / 3600000) : 0
  const offsets = useMemo(() => {
    const at = effectiveInstant ?? new Date(offsetKey * 3600000)
    const map: Record<string, number> = {}
    for (const tz of allZones) {
      try {
        map[tz] = zoneOffsetMinutes(at, tz)
      } catch {
        // skip zones the runtime cannot resolve
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allZones, offsetKey])

  const sourceParts = effectiveInstant ? convertParts(effectiveInstant, sourceTz) : null

  const setNow = () => {
    setScrub(0)
    setWallInput(toInputValue(convertParts(new Date(), sourceTz)))
  }

  const addZone = (tz: string) => {
    setTargets((prev) => (prev.includes(tz) ? prev : [...prev, tz]))
  }

  const removeZone = (tz: string) => {
    setTargets((prev) => prev.filter((z) => z !== tz))
  }

  const toolbar = (
    <div className="flex shrink-0 flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-4">
      <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('dateTimeLabel')}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="datetime-local"
              className="h-9 w-[220px]"
              value={wallInput}
              onChange={(e) => setWallInput(e.target.value)}
            />
            <Button type="button" variant="outline" size="sm" onClick={setNow}>
              <Clock3 className="mr-1.5 h-4 w-4" />
              {t('now')}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('sourceZoneLabel')}
          </Label>
          <ZoneCombobox
            zones={allZones}
            offsets={offsets}
            value={sourceTz}
            placeholder={t('selectZone')}
            onSelect={setSourceTz}
            className="w-[280px]"
          />
        </div>

        <div className="min-w-[240px] flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('scrubLabel')}
            </Label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{formatScrub(scrub)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setScrub(0)}
                disabled={scrub === 0}
                title={t('reset')}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Slider value={[scrub]} min={-720} max={720} step={15} onValueChange={(v) => setScrub(v[0] ?? 0)} />
        </div>
      </div>
  )

  return (
    <ToolShell
      icon={IconWorld}
      title={t('title')}
      description={t('subtitle')}
      toolbar={toolbar}
      contentClassName="gap-4"
    >
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('targetsLabel')}
        </Label>
        <ZoneCombobox
          zones={allZones}
          offsets={offsets}
          placeholder={t('addZone')}
          onSelect={addZone}
          triggerLabel={
            <span className="flex items-center gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              {t('addZone')}
            </span>
          }
          className="h-8 w-auto"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-2">
        {effectiveInstant && sourceParts ? (
          targets.map((tz) => {
            const parts = convertParts(effectiveInstant, tz)
            const shift = dayShift(sourceParts, parts)
            const band = workingHoursBand(parts.hh)
            const offset = zoneOffsetMinutes(effectiveInstant, tz)
            const { city } = splitZone(tz)
            const dateStr = new Intl.DateTimeFormat(undefined, {
              timeZone: tz,
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }).format(effectiveInstant)
            const timeStr = `${String(parts.hh).padStart(2, '0')}:${String(parts.mm).padStart(2, '0')}`
            return (
              <div key={tz} className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
                <span
                  className={cn('h-2.5 w-2.5 shrink-0 rounded-full', BAND_DOT[band])}
                  title={t(`bands.${band}`)}
                  aria-label={t(`bands.${band}`)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{city}</p>
                    {tz === localZone && (
                      <Badge variant="secondary" className="text-[10px]">{t('localBadge')}</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {tz} · {formatOffset(offset)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <p className="font-mono text-lg font-semibold tabular-nums">{timeStr}</p>
                    {shift !== 0 && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {shift > 0 ? `+${shift}d` : `−${Math.abs(shift)}d`}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{dateStr}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => removeZone(tz)}
                  title={t('remove')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })
        ) : (
          <p className="p-4 text-sm text-muted-foreground">{t('invalidDate')}</p>
        )}
      </div>
    </ToolShell>
  )
}
