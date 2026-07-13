'use client'

import React, { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2 } from 'lucide-react'
import { buildBoxShadow, SHADOW_PRESETS, type ShadowLayer } from '@/lib/css-generators'
import { CssOutput } from './css-output'

const DEFAULT_LAYER: ShadowLayer = { x: 0, y: 4, blur: 12, spread: 0, color: '#000000', alpha: 0.25, inset: false }

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, onChange }: SliderRowProps) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr_4.5rem] items-center gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0] ?? value)} />
      <Input
        type="number"
        className="h-7 text-xs"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!Number.isNaN(n)) onChange(n)
        }}
      />
    </div>
  )
}

export function BoxShadowTab() {
  const t = useTranslations('CssGenerators')
  const [layers, setLayers] = useState<ShadowLayer[]>([{ ...DEFAULT_LAYER }])

  const css = useMemo(() => `box-shadow: ${buildBoxShadow(layers)};`, [layers])
  const shadowValue = useMemo(() => buildBoxShadow(layers), [layers])

  const updateLayer = (index: number, patch: Partial<ShadowLayer>) => {
    setLayers((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  const removeLayer = (index: number) => {
    setLayers((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
        <Card className="space-y-2 p-4">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('boxShadow.presets')}
          </Label>
          <div className="flex flex-wrap gap-2">
            {SHADOW_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setLayers(preset.layers.map((l) => ({ ...l })))}
              >
                {t(`boxShadow.presetNames.${preset.id}`)}
              </Button>
            ))}
          </div>
        </Card>

        {layers.map((layer, i) => (
          <Card key={i} className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('boxShadow.layer')} {i + 1}
              </Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => removeLayer(i)}
                disabled={layers.length === 1}
                title={t('boxShadow.removeLayer')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <SliderRow label={t('boxShadow.x')} value={layer.x} min={-50} max={50} onChange={(v) => updateLayer(i, { x: v })} />
            <SliderRow label={t('boxShadow.y')} value={layer.y} min={-50} max={50} onChange={(v) => updateLayer(i, { y: v })} />
            <SliderRow label={t('boxShadow.blur')} value={layer.blur} min={0} max={100} onChange={(v) => updateLayer(i, { blur: v })} />
            <SliderRow label={t('boxShadow.spread')} value={layer.spread} min={-50} max={50} onChange={(v) => updateLayer(i, { spread: v })} />

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">{t('boxShadow.color')}</Label>
                <input
                  type="color"
                  value={layer.color}
                  onChange={(e) => updateLayer(i, { color: e.target.value })}
                  className="h-7 w-10 cursor-pointer rounded border border-border/60 bg-transparent p-0.5"
                  aria-label={t('boxShadow.color')}
                />
              </div>
              <div className="grid flex-1 grid-cols-[3.5rem_1fr_3rem] items-center gap-2">
                <Label className="text-xs text-muted-foreground">{t('boxShadow.alpha')}</Label>
                <Slider
                  value={[Math.round(layer.alpha * 100)]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => updateLayer(i, { alpha: (v[0] ?? 100) / 100 })}
                />
                <span className="text-right font-mono text-xs text-muted-foreground">
                  {Math.round(layer.alpha * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={layer.inset} onCheckedChange={(v) => updateLayer(i, { inset: v })} />
                <Label className="text-xs text-muted-foreground">{t('boxShadow.inset')}</Label>
              </div>
            </div>
          </Card>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={() => setLayers((prev) => [...prev, { ...DEFAULT_LAYER }])}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t('boxShadow.addLayer')}
        </Button>
      </div>

      <div className="flex min-h-0 flex-col gap-4">
        <Card className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border/50 bg-muted/30 px-3 py-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('preview')}</Label>
          </div>
          <div
            className="flex min-h-[220px] flex-1 items-center justify-center p-8"
            style={{
              backgroundImage:
                'repeating-conic-gradient(rgba(127,127,127,0.12) 0% 25%, transparent 0% 50%)',
              backgroundSize: '20px 20px',
            }}
          >
            <div
              className="h-32 w-52 rounded-xl border border-border/40 bg-card"
              style={{ boxShadow: shadowValue }}
            />
          </div>
        </Card>
        <CssOutput css={css} />
      </div>
    </div>
  )
}
