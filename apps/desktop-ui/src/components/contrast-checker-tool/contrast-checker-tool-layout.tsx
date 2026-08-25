'use client';

import Color from 'color';
import { useCallback, useMemo, useState } from 'react';
import { useCopyFeedback } from '@/hooks/use-copy-feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { contrastRatio, meetsLevel, WCAG_THRESHOLDS } from '@/lib/wcag-contrast';
import { Check, Copy, ArrowDownUp, Pipette } from 'lucide-react';
import { IconContrast } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { ToolShell } from '@/components/tools/tool-shell';

const DEFAULT_FG = '#0f172a';
const DEFAULT_BG = '#f8fafc';

function normalizeHex(raw: string): string {
  let v = raw.trim();
  if (!v.startsWith('#')) v = `#${v}`;
  const m3 = /^#([0-9a-f]{3})$/i.exec(v);
  if (m3) {
    const [, x] = m3;
    v = `#${x![0]}${x![0]}${x![1]}${x![1]}${x![2]}${x![2]}`;
  }
  return v.toLowerCase();
}

function parseHex(raw: string): string | null {
  try {
    const n = normalizeHex(raw);
    Color(n);
    return n;
  } catch {
    return null;
  }
}

type WcagKey = keyof typeof WCAG_THRESHOLDS;

export function ContrastCheckerToolLayout() {
  const t = useTranslations('ContrastChecker');

  const [fgHex, setFgHex] = useState(DEFAULT_FG);
  const [fgDraft, setFgDraft] = useState(DEFAULT_FG);
  const [fgError, setFgError] = useState(false);

  const [bgHex, setBgHex] = useState(DEFAULT_BG);
  const [bgDraft, setBgDraft] = useState(DEFAULT_BG);
  const [bgError, setBgError] = useState(false);

  const { key: copiedKey, flash } = useCopyFeedback();

  const ratio = useMemo(() => {
    if (!parseHex(fgHex) || !parseHex(bgHex)) return null;
    return contrastRatio(fgHex, bgHex);
  }, [fgHex, bgHex]);

  const ratioText = ratio != null ? `${ratio.toFixed(2)} : 1` : '—';

  const commitFg = useCallback((raw: string) => {
    const p = parseHex(raw);
    if (p) {
      setFgHex(p);
      setFgDraft(p);
      setFgError(false);
    } else {
      setFgError(true);
    }
  }, []);

  const commitBg = useCallback((raw: string) => {
    const p = parseHex(raw);
    if (p) {
      setBgHex(p);
      setBgDraft(p);
      setBgError(false);
    } else {
      setBgError(true);
    }
  }, []);

  const swap = useCallback(() => {
    const nf = fgHex;
    const nb = bgHex;
    setFgHex(nb);
    setFgDraft(nb);
    setFgError(false);
    setBgHex(nf);
    setBgDraft(nf);
    setBgError(false);
  }, [fgHex, bgHex]);

  const copyRatio = async () => {
    if (ratio == null) return;
    await navigator.clipboard.writeText(ratioText);
    flash('ratio');
  };

  const eyeDropperSupported =
    typeof window !== 'undefined' && 'EyeDropper' in window;

  const pickColor = async (which: 'fg' | 'bg') => {
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
      if (!parsed) return;
      if (which === 'fg') {
        setFgHex(parsed);
        setFgDraft(parsed);
        setFgError(false);
      } else {
        setBgHex(parsed);
        setBgDraft(parsed);
        setBgError(false);
      }
    } catch {
      /* cancelled */
    }
  };

  const rows: { id: WcagKey; labelKey: string }[] = [
    { id: 'aaNormal', labelKey: 'levelAANormal' },
    { id: 'aaLarge', labelKey: 'levelAALarge' },
    { id: 'aaaNormal', labelKey: 'levelAAANormal' },
    { id: 'aaaLarge', labelKey: 'levelAAALarge' },
  ];

  return (
    <ToolShell
      icon={IconContrast}
      title={t('title')}
      description={t('subtitle')}
      contentClassName="overflow-auto"
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 shrink-0">
        <div className="rounded-lg border border-border bg-card p-4 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{t('ratio')}</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
                {ratioText}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={ratio == null}
                onClick={copyRatio}
                title={t('copyRatio')}
              >
                {copiedKey === 'ratio' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ColorField
              inputId="cc-fg"
              label={t('foreground')}
              hex={fgDraft}
              onHexChange={setFgDraft}
              onCommit={() => commitFg(fgDraft)}
              onKeyEnter={() => commitFg(fgDraft)}
              error={fgError}
              errorText={t('invalidHex')}
              nativeValue={fgHex}
              onNativeChange={(v) => {
                setFgHex(v);
                setFgDraft(v);
                setFgError(false);
              }}
              ariaLabel={t('chooseForeground')}
              eyeDropperSupported={eyeDropperSupported}
              onEyeDropper={() => pickColor('fg')}
              eyeDropperLabel={t('eyeDropper')}
              placeholder={t('hexPlaceholder')}
            />
            <ColorField
              inputId="cc-bg"
              label={t('background')}
              hex={bgDraft}
              onHexChange={setBgDraft}
              onCommit={() => commitBg(bgDraft)}
              onKeyEnter={() => commitBg(bgDraft)}
              error={bgError}
              errorText={t('invalidHex')}
              nativeValue={bgHex}
              onNativeChange={(v) => {
                setBgHex(v);
                setBgDraft(v);
                setBgError(false);
              }}
              ariaLabel={t('chooseBackground')}
              eyeDropperSupported={eyeDropperSupported}
              onEyeDropper={() => pickColor('bg')}
              eyeDropperLabel={t('eyeDropper')}
              placeholder={t('hexPlaceholder')}
            />
          </div>

          <Button type="button" variant="secondary" size="sm" className="gap-2 w-fit" onClick={swap}>
            <ArrowDownUp className="h-4 w-4" />
            {t('swap')}
          </Button>

          <div className="space-y-2 pt-1 border-t border-border/50">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              {t('wcagHeading')}
            </Label>
            <p className="text-[11px] text-muted-foreground">{t('largeTextHint')}</p>
            <ul className="space-y-2">
              {rows.map((row) => {
                const ok = ratio != null && meetsLevel(ratio, row.id);
                return (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{t(row.labelKey)}</span>
                    <span
                      className={cn(
                        'text-xs font-medium shrink-0',
                        ok ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                      )}
                    >
                      {ok ? t('pass') : t('fail')}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3 min-h-[220px]">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            {t('previewHeading')}
          </Label>
          <div
            className="flex-1 rounded-xl border border-border p-6 min-h-[160px] flex flex-col justify-center"
            style={{ backgroundColor: bgHex, color: fgHex }}
          >
            <p className="text-base leading-relaxed font-medium">{t('previewBody')}</p>
            <p className="mt-4 text-sm opacity-90">{t('previewCaption')}</p>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}

function ColorField({
  inputId,
  label,
  hex,
  onHexChange,
  onCommit,
  onKeyEnter,
  error,
  errorText,
  nativeValue,
  onNativeChange,
  ariaLabel,
  eyeDropperSupported,
  onEyeDropper,
  eyeDropperLabel,
  placeholder,
}: {
  inputId: string;
  label: string;
  hex: string;
  onHexChange: (v: string) => void;
  onCommit: () => void;
  onKeyEnter: () => void;
  error: boolean;
  errorText: string;
  nativeValue: string;
  onNativeChange: (v: string) => void;
  ariaLabel: string;
  eyeDropperSupported: boolean;
  onEyeDropper: () => void;
  eyeDropperLabel: string;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <div className="flex flex-wrap items-start gap-3">
        <div
          className="h-14 w-14 shrink-0 rounded-lg border border-border shadow-sm"
          style={{ backgroundColor: parseHex(hex) ?? nativeValue }}
          aria-hidden
        />
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <input
            type="color"
            value={parseHex(nativeValue) ?? '#000000'}
            onChange={(e) => onNativeChange(normalizeHex(e.target.value))}
            className="h-9 w-full max-w-[180px] cursor-pointer rounded-md border border-input bg-background p-1"
            aria-label={ariaLabel}
          />
          {eyeDropperSupported && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 w-fit text-xs"
              onClick={onEyeDropper}
            >
              <Pipette className="h-3.5 w-3.5" />
              {eyeDropperLabel}
            </Button>
          )}
        </div>
      </div>
      <Input
        id={inputId}
        value={hex}
        onChange={(e) => {
          onHexChange(e.target.value);
        }}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onKeyEnter();
        }}
        spellCheck={false}
        placeholder={placeholder}
        className={cn('font-mono text-sm max-w-xs', error && 'border-destructive focus-visible:ring-destructive')}
      />
      {error && <p className="text-xs text-destructive">{errorText}</p>}
    </div>
  );
}
