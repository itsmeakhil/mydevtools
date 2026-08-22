'use client'

import React, { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Link2, Shuffle, Unlink2 } from 'lucide-react'
import { buildBorderRadius, randomBlob, type BorderRadiusState, type RadiusUnit } from '@/lib/css-generators'
import { IOPanel } from '@/components/tools/io-panel'
import { CssOutput } from './css-output'

type Corner = 'tl' | 'tr' | 'br' | 'bl'
const CORNERS: Corner[] = ['tl', 'tr', 'br', 'bl']
const BLOB_LABELS = ['tl', 'tr', 'br', 'bl'] as const

export function BorderRadiusTab() {
  const t = useTranslations('CssGenerators')
  const [state, setState] = useState<BorderRadiusState>({
    mode: 'simple',
    unit: 'px',
    tl: 16,
    tr: 16,
    br: 16,
    bl: 16,
    h: [30, 70, 70, 30],
    v: [30, 30, 70, 70],
  })
  const [linked, setLinked] = useState(true)

  const value = useMemo(() => buildBorderRadius(state), [state])
  const css = `border-radius: ${value};`
  const max = state.unit === 'px' ? 200 : 100

  const setCorner = (corner: Corner, v: number) => {
    setState((prev) => (linked ? { ...prev, tl: v, tr: v, br: v, bl: v } : { ...prev, [corner]: v }))
  }

  const setBlob = (axis: 'h' | 'v', index: number, v: number) => {
    setState((prev) => {
      const arr = [...prev[axis]] as [number, number, number, number]
      arr[index] = v
      return { ...prev, [axis]: arr }
    })
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('borderRadius.modeLabel')}
            </Label>
            <ToggleGroup
              type="single"
              value={state.mode}
              onValueChange={(v) => v && setState((prev) => ({ ...prev, mode: v as BorderRadiusState['mode'] }))}
              className="justify-start"
            >
              <ToggleGroupItem value="simple" className="px-4 text-xs">{t('borderRadius.modes.simple')}</ToggleGroupItem>
              <ToggleGroupItem value="blob" className="px-4 text-xs">{t('borderRadius.modes.blob')}</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {state.mode === 'simple' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('borderRadius.unit')}
                </Label>
                <ToggleGroup
                  type="single"
                  value={state.unit}
                  onValueChange={(v) => v && setState((prev) => ({ ...prev, unit: v as RadiusUnit }))}
                  className="justify-start"
                >
                  <ToggleGroupItem value="px" className="px-4 text-xs">px</ToggleGroupItem>
                  <ToggleGroupItem value="%" className="px-4 text-xs">%</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={linked} onCheckedChange={setLinked} id="link-corners" />
                {linked ? <Link2 className="h-3.5 w-3.5 text-muted-foreground" /> : <Unlink2 className="h-3.5 w-3.5 text-muted-foreground" />}
                <Label htmlFor="link-corners" className="text-xs text-muted-foreground">
                  {t('borderRadius.linkCorners')}
                </Label>
              </div>
            </>
          )}

          {state.mode === 'blob' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={() => setState((prev) => ({ ...prev, ...randomBlob() }))}
            >
              <Shuffle className="mr-1.5 h-4 w-4" />
              {t('borderRadius.randomize')}
            </Button>
          )}
        </div>

        {state.mode === 'simple' ? (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            {CORNERS.map((corner) => (
              <div key={corner} className="grid grid-cols-[6.5rem_1fr_4rem] items-center gap-2">
                <Label className="text-xs text-muted-foreground">{t(`borderRadius.corners.${corner}`)}</Label>
                <Slider
                  value={[state[corner]]}
                  min={0}
                  max={max}
                  step={1}
                  onValueChange={(v) => setCorner(corner, v[0] ?? 0)}
                />
                <span className="text-right font-mono text-xs text-muted-foreground">
                  {state[corner]}{state.unit}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('borderRadius.horizontal')}
              </Label>
              {BLOB_LABELS.map((label, i) => (
                <div key={`h-${label}`} className="grid grid-cols-[6.5rem_1fr_4rem] items-center gap-2">
                  <Label className="text-xs text-muted-foreground">{t(`borderRadius.corners.${label}`)}</Label>
                  <Slider value={[state.h[i]]} min={0} max={100} step={1} onValueChange={(v) => setBlob('h', i, v[0] ?? 0)} />
                  <span className="text-right font-mono text-xs text-muted-foreground">{state.h[i]}%</span>
                </div>
              ))}
            </div>
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('borderRadius.vertical')}
              </Label>
              {BLOB_LABELS.map((label, i) => (
                <div key={`v-${label}`} className="grid grid-cols-[6.5rem_1fr_4rem] items-center gap-2">
                  <Label className="text-xs text-muted-foreground">{t(`borderRadius.corners.${label}`)}</Label>
                  <Slider value={[state.v[i]]} min={0} max={100} step={1} onValueChange={(v) => setBlob('v', i, v[0] ?? 0)} />
                  <span className="text-right font-mono text-xs text-muted-foreground">{state.v[i]}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex min-h-0 flex-col gap-4">
        <IOPanel label={t('preview')} className="flex-1" bodyClassName="flex flex-col">
          <div className="flex min-h-[220px] flex-1 items-center justify-center p-8">
            <div
              className="h-48 w-48 border border-border/40 bg-gradient-to-br from-pink-500/70 to-violet-500/70"
              style={{ borderRadius: value }}
            />
          </div>
        </IOPanel>
        <CssOutput css={css} />
      </div>
    </div>
  )
}
