'use client';

import Color from 'color';
import type { ColorInstance } from 'color';
import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_HEX, channelsFromHex, parseHex, safeHue } from './color-helpers';
import { useCopyFeedback } from '@/hooks/use-copy-feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { PALETTE_GROUPS } from '@/lib/color-palettes';
import { Check, Copy, Pipette } from 'lucide-react';
import { IconPalette } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { ToolShell } from '@/components/tools/tool-shell';


type PaletteId = (typeof PALETTE_GROUPS)[number]['id'];
const PALETTE_LABEL_KEY: Record<PaletteId, 'paletteShades' | 'paletteComplementary' | 'paletteTriadic' | 'paletteAnalogous' | 'paletteSplit' | 'paletteSquare'> = {
  monochrome: 'paletteShades',
  complementary: 'paletteComplementary',
  triadic: 'paletteTriadic',
  analogous: 'paletteAnalogous',
  split: 'paletteSplit',
  square: 'paletteSquare',
};

export function ColorPickerToolLayout() {
  const t = useTranslations('ColorPicker');

  const [hex, setHex] = useState(DEFAULT_HEX);
  const [hexDraft, setHexDraft] = useState(DEFAULT_HEX);
  const [hexError, setHexError] = useState(false);

  const ic = channelsFromHex(DEFAULT_HEX);
  const [r, setR] = useState(ic.r);
  const [g, setG] = useState(ic.g);
  const [b, setB] = useState(ic.b);
  const [h, setH] = useState(ic.h);
  const [s, setS] = useState(ic.s);
  const [l, setL] = useState(ic.l);

  const { key: copiedKey, flash } = useCopyFeedback();

  const c = useMemo(() => Color(hex), [hex]);

  const syncFromColor = useCallback((next: ColorInstance) => {
    const hx = next.hex();
    setHex(hx);
    setHexDraft(hx);
    setHexError(false);
    setR(Math.round(next.red()));
    setG(Math.round(next.green()));
    setB(Math.round(next.blue()));
    setH(safeHue(next));
    setS(Math.round(next.saturationl()));
    setL(Math.round(next.lightness()));
  }, []);

  const commitHex = useCallback(
    (raw: string) => {
      const parsed = parseHex(raw);
      if (parsed) {
        syncFromColor(Color(parsed));
      } else {
        setHexError(true);
      }
    },
    [syncFromColor]
  );

  const applyRgb = useCallback(
    (nr: number, ng: number, nb: number) => {
      const rr = Math.min(255, Math.max(0, Math.round(nr)));
      const gg = Math.min(255, Math.max(0, Math.round(ng)));
      const bb = Math.min(255, Math.max(0, Math.round(nb)));
      syncFromColor(Color.rgb(rr, gg, bb));
    },
    [syncFromColor]
  );

  const applyHsl = useCallback(
    (nh: number, ns: number, nl: number) => {
      const hh = ((Math.round(nh) % 360) + 360) % 360;
      const ss = Math.min(100, Math.max(0, Math.round(ns)));
      const ll = Math.min(100, Math.max(0, Math.round(nl)));
      syncFromColor(Color.hsl(hh, ss, ll));
    },
    [syncFromColor]
  );

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    flash(id);
  };

  const rgbCss = useMemo(() => `rgb(${r}, ${g}, ${b})`, [r, g, b]);
  const hslCss = useMemo(() => `hsl(${h}, ${s}%, ${l}%)`, [h, s, l]);

  const eyeDropperSupported =
    typeof window !== 'undefined' && 'EyeDropper' in window;

  const pickScreenColor = async () => {
    if (!eyeDropperSupported) return;
    try {
      const EyeDropperCtor = (
        window as unknown as {
          EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> };
        }
      ).EyeDropper;
      const dropper = new EyeDropperCtor();
      const { sRGBHex } = await dropper.open();
      const parsed = parseHex(sRGBHex);
      if (parsed) syncFromColor(Color(parsed));
    } catch {
      /* user cancelled */
    }
  };

  const CopyRow = ({ id, label, value }: { id: string; label: string; value: string }) => (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-9 shrink-0">
        {label}
      </span>
      <Input readOnly value={value} className="font-mono text-xs h-8 flex-1 min-w-0" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => copy(value, id)}
        title={t('copy')}
      >
        {copiedKey === id ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );

  return (
    <ToolShell
      icon={IconPalette}
      title={t('title')}
      description={t('subtitle')}
      contentClassName="overflow-auto"
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 shrink-0">
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-start gap-4">
            <div
              className="h-28 w-28 shrink-0 rounded-xl border border-border shadow-sm"
              style={{ backgroundColor: hex }}
              aria-hidden
            />
            <div className="flex flex-col gap-2 min-w-0">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('nativePicker')}
              </Label>
              <input
                type="color"
                value={hex}
                onChange={(e) => syncFromColor(Color(e.target.value))}
                className="h-10 w-full max-w-[200px] cursor-pointer rounded-md border border-input bg-background p-1"
                aria-label={t('chooseColor')}
              />
              {eyeDropperSupported && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 w-fit text-xs"
                  onClick={pickScreenColor}
                >
                  <Pipette className="h-3.5 w-3.5" />
                  {t('eyeDropper')}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hex-input" className="text-xs text-muted-foreground uppercase tracking-wider">
              HEX
            </Label>
            <div className="flex gap-2">
              <Input
                id="hex-input"
                value={hexDraft}
                onChange={(e) => {
                  setHexDraft(e.target.value);
                  setHexError(false);
                }}
                onBlur={() => commitHex(hexDraft)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitHex(hexDraft);
                }}
                spellCheck={false}
                className={cn(
                  'font-mono text-sm max-w-xs',
                  hexError && 'border-destructive focus-visible:ring-destructive'
                )}
                placeholder="#RRGGBB"
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => copy(hex, 'hex')}>
                {copiedKey === 'hex' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {hexError && <p className="text-xs text-destructive">{t('invalidHex')}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">RGB</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min={0}
                  max={255}
                  value={r}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setR(v);
                    if (Number.isFinite(v)) applyRgb(v, g, b);
                  }}
                  className="font-mono text-xs h-8"
                  aria-label="Red 0-255"
                />
                <Input
                  type="number"
                  min={0}
                  max={255}
                  value={g}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setG(v);
                    if (Number.isFinite(v)) applyRgb(r, v, b);
                  }}
                  className="font-mono text-xs h-8"
                  aria-label="Green 0-255"
                />
                <Input
                  type="number"
                  min={0}
                  max={255}
                  value={b}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setB(v);
                    if (Number.isFinite(v)) applyRgb(r, g, v);
                  }}
                  className="font-mono text-xs h-8"
                  aria-label="Blue 0-255"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">HSL</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min={0}
                  max={360}
                  value={h}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setH(v);
                    if (Number.isFinite(v)) applyHsl(v, s, l);
                  }}
                  className="font-mono text-xs h-8"
                  aria-label="Hue 0-360"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={s}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setS(v);
                    if (Number.isFinite(v)) applyHsl(h, v, l);
                  }}
                  className="font-mono text-xs h-8"
                  aria-label="Saturation 0-100"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={l}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setL(v);
                    if (Number.isFinite(v)) applyHsl(h, s, v);
                  }}
                  className="font-mono text-xs h-8"
                  aria-label="Lightness 0-100"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-border/50">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t('cssValues')}</Label>
            <div className="space-y-1.5">
              <CopyRow id="css-hex" label="hex" value={hex} />
              <CopyRow id="css-rgb" label="rgb" value={rgbCss} />
              <CopyRow id="css-hsl" label="hsl" value={hslCss} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 flex flex-col min-h-[280px]">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
            {t('palettes')}
          </Label>
          <Tabs defaultValue="monochrome" className="flex-1 flex flex-col min-h-0 gap-3">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
              {PALETTE_GROUPS.map((g) => (
                <TabsTrigger
                  key={g.id}
                  value={g.id}
                  className="text-xs px-2.5 py-1.5 shrink-0"
                >
                  {t(PALETTE_LABEL_KEY[g.id])}
                </TabsTrigger>
              ))}
            </TabsList>
            {PALETTE_GROUPS.map((group) => {
              const colors = group.fn(c);
              const allHex = colors.map((x) => x.hex()).join('\n');
              return (
                <TabsContent key={group.id} value={group.id} className="mt-0 flex-1 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {colors.map((col, i) => {
                      const hx = col.hex();
                      const cid = `${group.id}-${i}`;
                      return (
                        <button
                          key={cid}
                          type="button"
                          aria-label={t('copyColor', { color: hx })}
                          onClick={() => copy(hx, cid)}
                          className="group flex flex-col items-stretch gap-1 rounded-lg border border-border/60 bg-card/50 p-1.5 w-[calc(50%-4px)] sm:w-[calc(33.333%-6px)] max-w-[140px] transition-colors hover:bg-muted/40"
                        >
                          <div
                            className="h-12 w-full rounded-md border border-border/40 shadow-inner"
                            style={{ backgroundColor: hx }}
                          />
                          <span className="font-mono text-[10px] text-center truncate w-full" title={hx}>
                            {hx}
                          </span>
                          <span className="text-[10px] text-muted-foreground text-center">
                            {copiedKey === cid ? t('copied') : t('clickToCopy')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit gap-1.5 text-xs"
                    onClick={() => copy(allHex, `palette-${group.id}`)}
                  >
                    {copiedKey === `palette-${group.id}` ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {t('copyAllHex')}
                  </Button>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </div>
    </ToolShell>
  );
}
