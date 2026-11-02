'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Copy, Pipette, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ACCENT_PRESETS, accentHex, isCustomAccent } from '@/lib/accent-color'
import {
  MAX_CHROMA,
  contrastLevel,
  contrastRatio,
  hexFromHsv,
  hexFromOklch,
  hsvFromHex,
  normalizeHex,
  oklchFromHex,
  wheelHsFromPoint,
  wheelPoint,
  type Hsv,
  type Oklch,
} from '@/lib/color-picker'
import { cn } from '@/lib/utils'

const WHEEL = 176
const RADIUS = WHEEL / 2
const HUE_RING =
  'conic-gradient(from 90deg, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))'
const THUMB_SHADOW = 'shadow-[0_0_0_1px_rgba(0,0,0,0.45),0_1px_3px_rgba(0,0,0,0.4)]'

type Mode = 'wheel' | 'sliders'

/**
 * Keeps a color model (HSV, OKLCH) as state so values the hex can't carry
 * (hue at zero saturation, sub-8-bit steps) survive a drag. Falls back to
 * re-deriving from the hex whenever it changed from elsewhere.
 */
function useColorModel<T>(hex: string, from: (hex: string) => T, to: (m: T) => string) {
  const [model, setModel] = useState(() => from(hex))
  return [to(model) === hex ? model : from(hex), setModel] as const
}

/** Pointer-captured drag reporting the pointer position relative to the element. */
function dragHandlers(onPoint: (x: number, y: number) => void) {
  const report = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    onPoint(e.clientX - r.left, e.clientY - r.top)
  }
  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      report(e)
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) report(e)
    },
  }
}

const arrowStep = (e: React.KeyboardEvent) => (e.shiftKey ? 10 : 1)

function GradientSlider({
  label,
  value,
  min,
  max,
  step,
  background,
  display,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  background: string
  display: string
  onChange: (value: number) => void
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-[72px] shrink-0 truncate text-[11px] text-muted-foreground">{label}</span>
      <span
        className="relative h-3 flex-1 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15"
        style={{ background }}
      >
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            'absolute inset-x-0 top-1/2 h-[18px] w-full -translate-y-1/2 cursor-pointer appearance-none bg-transparent outline-none',
            '[&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[7px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white',
            '[&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.45),0_1px_3px_rgba(0,0,0,0.4)] focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-ring',
            '[&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[7px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white',
          )}
        />
      </span>
      <span className="w-11 shrink-0 text-right font-mono text-[11px] tabular-nums text-foreground/90">
        {display}
      </span>
    </label>
  )
}

function WheelPanel({ hex, onChange }: { hex: string; onChange: (hex: string) => void }) {
  const t = useTranslations('SettingsPage.appearance.picker')
  const [hsv, setHsv] = useColorModel<Hsv>(hex, hsvFromHex, hexFromHsv)
  const set = (next: Hsv) => {
    setHsv(next)
    onChange(hexFromHsv(next))
  }
  const thumb = wheelPoint(hsv.h, hsv.s, RADIUS)
  const fullBright = hexFromHsv({ ...hsv, v: 100 })

  const onWheelKey = (e: React.KeyboardEvent) => {
    const d = arrowStep(e)
    const keys: Record<string, Partial<Hsv>> = {
      ArrowRight: { h: (hsv.h + d) % 360 },
      ArrowLeft: { h: (hsv.h - d + 360) % 360 },
      ArrowUp: { s: Math.min(100, hsv.s + d) },
      ArrowDown: { s: Math.max(0, hsv.s - d) },
    }
    if (!keys[e.key]) return
    e.preventDefault()
    set({ ...hsv, ...keys[e.key] })
  }
  const onBarKey = (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowUp' ? arrowStep(e) : e.key === 'ArrowDown' ? -arrowStep(e) : 0
    if (!d) return
    e.preventDefault()
    set({ ...hsv, v: Math.min(100, Math.max(0, hsv.v + d)) })
  }

  return (
    <div className="flex items-center justify-center gap-4">
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${t('hue')} / ${t('saturation')}`}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(hsv.h)}
        aria-valuetext={`${t('hue')} ${Math.round(hsv.h)}°, ${t('saturation')} ${Math.round(hsv.s)}%`}
        onKeyDown={onWheelKey}
        {...dragHandlers((x, y) => set({ ...hsv, ...wheelHsFromPoint(x, y, RADIUS) }))}
        className="relative shrink-0 touch-none cursor-crosshair rounded-full shadow-[0_0_0_0.5px_rgba(0,0,0,0.2),0_6px_18px_rgba(0,0,0,0.25)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
        style={{
          width: WHEEL,
          height: WHEEL,
          background: `radial-gradient(circle closest-side, #fff, rgba(255,255,255,0)), ${HUE_RING}`,
        }}
      >
        {/* Brightness dims the whole wheel, as in HSV. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-black"
          style={{ opacity: 1 - hsv.v / 100 }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.45)]"
          style={{ left: thumb.x, top: thumb.y, background: hex }}
        />
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={t('brightness')}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.v)}
        aria-valuetext={`${Math.round(hsv.v)}%`}
        onKeyDown={onBarKey}
        {...dragHandlers((_, y) => set({ ...hsv, v: Math.min(100, Math.max(0, (1 - y / WHEEL) * 100)) }))}
        className="relative w-3 shrink-0 touch-none cursor-ns-resize rounded-full ring-1 ring-inset ring-black/10 outline-none focus-visible:ring-2 focus-visible:ring-ring dark:ring-white/15"
        style={{ height: WHEEL, background: `linear-gradient(to bottom, ${fullBright}, #000)` }}
      >
        <div
          aria-hidden
          className={cn('pointer-events-none absolute -left-[3px] h-[7px] w-[18px] -translate-y-1/2 rounded-full bg-white', THUMB_SHADOW)}
          style={{ top: (1 - hsv.v / 100) * WHEEL }}
        />
      </div>
    </div>
  )
}

function SlidersPanel({ hex, onChange }: { hex: string; onChange: (hex: string) => void }) {
  const t = useTranslations('SettingsPage.appearance.picker')
  const [o, setO] = useColorModel<Oklch>(hex, oklchFromHex, hexFromOklch)
  const set = (patch: Partial<Oklch>) => {
    const next = { ...o, ...patch }
    setO(next)
    onChange(hexFromOklch(next))
  }
  const L = `${o.l.toFixed(1)}%`
  const C = o.c.toFixed(3)
  const H = o.h.toFixed(0)

  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-3">
        <div
          role="img"
          aria-label={t('newColor')}
          className="h-14 w-14 shrink-0 rounded-lg ring-1 ring-inset ring-black/10 dark:ring-white/15"
          style={{ background: hex, boxShadow: `0 6px 16px ${hex}47` }}
        />
        <div className="min-w-0 space-y-1">
          <p className="font-mono text-xs text-foreground">{hex.toUpperCase()}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            oklch({L} {C} {H})
          </p>
        </div>
      </div>
      <GradientSlider
        label={t('lightness')}
        value={o.l}
        min={0}
        max={100}
        step={0.5}
        display={`${Math.round(o.l)}%`}
        background={`linear-gradient(in oklch to right, oklch(0% ${C} ${H}), oklch(50% ${C} ${H}), oklch(100% ${C} ${H}))`}
        onChange={(l) => set({ l })}
      />
      <GradientSlider
        label={t('chroma')}
        value={o.c}
        min={0}
        max={MAX_CHROMA}
        step={0.005}
        display={C}
        background={`linear-gradient(in oklch to right, oklch(${L} 0 ${H}), oklch(${L} ${MAX_CHROMA} ${H}))`}
        onChange={(c) => set({ c })}
      />
      <GradientSlider
        label={t('hue')}
        value={o.h}
        min={0}
        max={360}
        step={1}
        display={`${H}°`}
        background={`linear-gradient(in oklch longer hue to right, oklch(${L} ${C} 0), oklch(${L} ${C} 360))`}
        onChange={(h) => set({ h })}
      />
    </div>
  )
}

function HexField({ hex, onChange }: { hex: string; onChange: (hex: string) => void }) {
  const t = useTranslations('SettingsPage.appearance.picker')
  const ref = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(hex.toUpperCase())
  // Mirror outside changes (drags, presets) unless the user is typing here.
  useEffect(() => {
    if (document.activeElement !== ref.current) setText(hex.toUpperCase())
  }, [hex])

  const commit = () => {
    const next = normalizeHex(text)
    if (next) onChange(next)
    else setText(hex.toUpperCase())
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hex.toUpperCase())
      toast.success(t('copied'))
    } catch {
      // Clipboard denied: nothing to undo, the value is still in the field.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
        HEX
      </span>
      <label className="relative flex-1">
        <span className="sr-only">{t('hexValue')}</span>
        <input
          ref={ref}
          value={text}
          spellCheck={false}
          maxLength={7}
          onChange={(e) => {
            setText(e.target.value)
            // Apply full 6-digit values live; short forms wait for Enter/blur.
            const next = /^#?[0-9a-f]{6}$/i.test(e.target.value.trim()) && normalizeHex(e.target.value)
            if (next) onChange(next)
          }}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="h-7 w-full rounded-md border border-input bg-background pl-2 pr-8 font-mono text-xs tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={copy}
          aria-label={t('copy')}
          title={t('copy')}
          className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Copy className="h-3 w-3" aria-hidden />
        </button>
      </label>
    </div>
  )
}

function ContrastPill({ fg, bg, label }: { fg: string; bg: string; label: string }) {
  const t = useTranslations('SettingsPage.appearance.picker')
  const ratio = contrastRatio(fg, bg)
  const level = contrastLevel(ratio)
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-muted/60 px-1.5 py-1 ring-1 ring-inset ring-border/60">
      <span
        aria-hidden
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded text-[11px] font-bold ring-1 ring-inset ring-black/10 dark:ring-white/15"
        style={{ background: bg, color: fg }}
      >
        Aa
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-mono text-[11px] tabular-nums text-foreground/90">
          <span className="sr-only">{label}: </span>
          {ratio.toFixed(2)}:1
        </span>
        <span
          className={cn(
            'truncate text-[11px]',
            level === 'aa' && 'text-emerald-700 dark:text-emerald-400',
            level === 'aaLarge' && 'text-muted-foreground',
            level === 'fail' && 'text-red-700 dark:text-red-400',
          )}
        >
          {t(level)}
        </span>
      </span>
    </div>
  )
}

/**
 * Accent color picker: Wheel (HSV) and Sliders (OKLCH) modes, hex entry,
 * revert-to-original, text contrast on white/black, and the preset swatches.
 * `onChange` receives a preset id or a custom `#rrggbb`, matching useColorTheme.
 */
export function AccentColorPicker({
  colorTheme,
  onChange,
  label,
}: {
  colorTheme: string
  onChange: (value: string) => void
  label: string
}) {
  const t = useTranslations('SettingsPage.appearance.picker')
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('wheel')
  const [original, setOriginal] = useState(colorTheme)
  const hex = accentHex(colorTheme)
  const custom = isCustomAccent(colorTheme)
  const currentName = custom
    ? hex.toUpperCase()
    : (ACCENT_PRESETS.find((p) => p.id === colorTheme)?.name ?? hex.toUpperCase())
  // Only read inside PopoverContent, which renders client-side after opening.
  const canEyedrop = open && 'EyeDropper' in window

  const eyedrop = async () => {
    try {
      // Chromium-only API; the button is hidden where it's missing.
      const Ctor = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper
      const { sRGBHex } = await new Ctor().open()
      const next = normalizeHex(sRGBHex)
      if (next) onChange(next)
    } catch {
      // User pressed Esc — not an error.
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setOriginal(colorTheme)
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${currentName}`}
          className="flex h-9 w-full min-w-0 items-center gap-2.5 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15"
            style={{ background: hex }}
          />
          <span className={cn('min-w-0 flex-1 truncate text-left', custom && 'font-mono')}>{currentName}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[304px] space-y-3 p-3">
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label={label}
            className="flex h-7 flex-1 rounded-md bg-muted p-0.5"
          >
            {(['wheel', 'sliders'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 rounded-[5px] text-xs transition-colors',
                  mode === m
                    ? 'bg-background font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t(m)}
              </button>
            ))}
          </div>
          {canEyedrop ? (
            <button
              type="button"
              onClick={eyedrop}
              aria-label={t('eyedropper')}
              title={t('eyedropper')}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors hover:text-foreground"
            >
              <Pipette className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>

        {mode === 'wheel' ? (
          <WheelPanel hex={hex} onChange={onChange} />
        ) : (
          <SlidersPanel hex={hex} onChange={onChange} />
        )}

        <HexField hex={hex} onChange={onChange} />

        <div className="flex h-[34px] items-stretch gap-2">
          <div className="flex shrink-0 overflow-hidden rounded-md ring-1 ring-inset ring-black/10 dark:ring-white/15">
            <div role="img" aria-label={t('newColor')} className="w-9" style={{ background: hex }} />
            <button
              type="button"
              onClick={() => onChange(original)}
              aria-label={t('revert')}
              title={t('revert')}
              className="flex w-9 items-center justify-center text-white"
              style={{ background: accentHex(original) }}
            >
              <RotateCcw className="h-3 w-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]" aria-hidden />
            </button>
          </div>
          <ContrastPill fg={hex} bg="#ffffff" label={t('onWhite')} />
          <ContrastPill fg={hex} bg="#000000" label={t('onBlack')} />
        </div>

        <div className="border-t border-border/60 pt-2.5">
          <p className="mb-2 text-[11px] text-muted-foreground">{t('presets')}</p>
          {/* Explicit rows of 9, spread edge to edge: rows line up column for
              column. (A CSS grid collapsed to one column in Tauri's WebKit.) */}
          <div className="space-y-2">
            {[ACCENT_PRESETS.slice(0, 9), ACCENT_PRESETS.slice(9)].map((row, i) => (
            <div key={i} className="flex items-center justify-between">
            {row.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange(p.id)}
                aria-label={p.name}
                aria-pressed={colorTheme === p.id}
                title={p.name}
                className={cn(
                  'h-6 w-6 shrink-0 rounded-full ring-1 ring-inset ring-black/10 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:ring-white/15',
                  colorTheme === p.id && 'ring-0 shadow-[0_0_0_2px_hsl(var(--popover)),0_0_0_3.5px_hsl(var(--foreground))]',
                )}
                style={{ background: p.hex }}
              />
            ))}
            </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
