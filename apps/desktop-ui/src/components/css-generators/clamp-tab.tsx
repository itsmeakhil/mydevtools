'use client'

import React, { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { buildClamp, clampSizeAtViewport, type ClampResult } from '@/lib/css-generators'
import { CssOutput } from './css-output'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
}

function NumberField({ label, value, onChange, min }: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        className="h-8 w-full text-sm"
        value={value}
        min={min}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!Number.isNaN(n)) onChange(n)
        }}
      />
    </div>
  )
}

export function ClampTab() {
  const t = useTranslations('CssGenerators')
  const [minPx, setMinPx] = useState(16)
  const [maxPx, setMaxPx] = useState(32)
  const [minVw, setMinVw] = useState(320)
  const [maxVw, setMaxVw] = useState(1280)
  const [rootPx, setRootPx] = useState(16)
  const [simVw, setSimVw] = useState(800)

  const result: ClampResult | null = useMemo(() => {
    try {
      return buildClamp(minPx, maxPx, minVw, maxVw, rootPx)
    } catch {
      return null
    }
  }, [minPx, maxPx, minVw, maxVw, rootPx])

  const sizeAtSim = useMemo(
    () => clampSizeAtViewport({ minPx, maxPx, minVw, maxVw, rootPx }, simVw),
    [minPx, maxPx, minVw, maxVw, rootPx, simVw],
  )

  const css = result ? `font-size: ${result.css};` : ''

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
        <Card className="grid grid-cols-2 gap-3 p-4">
          <NumberField label={t('clamp.minFont')} value={minPx} onChange={setMinPx} min={1} />
          <NumberField label={t('clamp.maxFont')} value={maxPx} onChange={setMaxPx} min={1} />
          <NumberField label={t('clamp.minViewport')} value={minVw} onChange={setMinVw} min={1} />
          <NumberField label={t('clamp.maxViewport')} value={maxVw} onChange={setMaxVw} min={1} />
          <NumberField label={t('clamp.rootFont')} value={rootPx} onChange={setRootPx} min={1} />
        </Card>

        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('clamp.viewportWidth')}
            </Label>
            <span className="font-mono text-xs text-muted-foreground">{simVw}px</span>
          </div>
          <Slider
            value={[simVw]}
            min={Math.min(240, minVw)}
            max={Math.max(1920, maxVw)}
            step={1}
            onValueChange={(v) => setSimVw(v[0] ?? simVw)}
          />
          <p className="text-xs text-muted-foreground">
            {t('clamp.computedSize')}: <span className="font-mono text-foreground">{sizeAtSim}px</span>
            {' '}({(sizeAtSim / rootPx).toFixed(3)}rem)
          </p>
        </Card>

        {result && (
          <Card className="space-y-1 p-4 text-xs text-muted-foreground">
            <p>
              {t('clamp.slope')}: <span className="font-mono text-foreground">{result.slopeVw}vw</span>
            </p>
            <p>
              {t('clamp.intercept')}: <span className="font-mono text-foreground">{result.interceptRem}rem</span>
            </p>
          </Card>
        )}
      </div>

      <div className="flex min-h-0 flex-col gap-4">
        <Card className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border/50 bg-muted/30 px-3 py-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('preview')}</Label>
          </div>
          <div className="flex min-h-[220px] flex-1 items-center justify-center overflow-hidden p-6">
            {result ? (
              <h2
                className="max-w-full text-center font-bold leading-tight tracking-tight"
                style={{ fontSize: `${sizeAtSim}px` }}
              >
                {t('clamp.previewText')}
              </h2>
            ) : (
              <p className="text-sm text-destructive">{t('clamp.invalid')}</p>
            )}
          </div>
        </Card>
        {result && <CssOutput css={css} />}
      </div>
    </div>
  )
}
