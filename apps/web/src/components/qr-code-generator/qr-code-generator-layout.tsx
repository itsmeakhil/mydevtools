'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Copy, Download, ImageIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Ecc = 'L' | 'M' | 'Q' | 'H';

const ECC_OPTIONS: Ecc[] = ['L', 'M', 'Q', 'H'];
const WIDTH_MIN = 120;
const WIDTH_MAX = 1024;
const MARGIN_OPTIONS = [0, 1, 2, 3, 4] as const;

export function QrCodeGeneratorLayout() {
  const t = useTranslations('QrCodeGenerator');
  const [content, setContent] = useState('https://mydevtools.tech');
  const [ecc, setEcc] = useState<Ecc>('M');
  const [margin, setMargin] = useState<number>(2);
  const [width, setWidth] = useState(280);
  const [dark, setDark] = useState('#000000');
  const [light, setLight] = useState('#ffffff');
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const trimmed = useMemo(() => content.trim(), [content]);

  const runGenerate = useCallback(
    async (text: string) => {
      setError(null);
      setCopied(false);
      if (!text) {
        setDataUrl(null);
        return;
      }
      try {
        const QR = (await import('qrcode')).default;
        const w = Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, Math.round(width)));
        const url = await QR.toDataURL(text, {
          errorCorrectionLevel: ecc,
          margin,
          width: w,
          color: { dark, light },
        });
        setDataUrl(url);
      } catch {
        setDataUrl(null);
        setError(t('errors.generationFailed'));
      }
    },
    [dark, ecc, light, margin, t, width]
  );

  const debouncedGenerate = useDebouncedCallback(runGenerate, 320);

  useEffect(() => {
    void debouncedGenerate(trimmed);
  }, [trimmed, debouncedGenerate, ecc, margin, width, dark, light]);

  const handleResetColors = () => {
    setDark('#000000');
    setLight('#ffffff');
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = t('filename');
    a.click();
  };

  const handleCopyImage = async () => {
    if (!dataUrl) return;
    try {
      if (!navigator.clipboard?.write) {
        toast.error(t('errors.copyUnsupported'));
        return;
      }
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('errors.copyFailed'));
    }
  };

  const widthClamped = Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, Math.round(width)));

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 overflow-auto p-4">
          <div className="space-y-2">
            <Label htmlFor="qr-content" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('contentLabel')}
            </Label>
            <Textarea
              id="qr-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('contentPlaceholder')}
              className="min-h-[140px] resize-y font-mono text-sm"
              spellCheck={false}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('eccLabel')}</Label>
              <Select value={ecc} onValueChange={(v) => setEcc(v as Ecc)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ECC_OPTIONS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {t(`ecc${level}` as 'eccL' | 'eccM' | 'eccQ' | 'eccH')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('marginLabel')}</Label>
              <Select value={String(margin)} onValueChange={(v) => setMargin(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARGIN_OPTIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-width" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('widthLabel')}
            </Label>
            <Input
              id="qr-width"
              type="number"
              min={WIDTH_MIN}
              max={WIDTH_MAX}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              {WIDTH_MIN}–{WIDTH_MAX}px · {t('widthEffective', { px: widthClamped })}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qr-dark" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('darkColor')}
              </Label>
              <div className="flex gap-2">
                <Input id="qr-dark" type="color" value={dark} onChange={(e) => setDark(e.target.value)} className="h-10 w-14 cursor-pointer p-1" />
                <Input value={dark} onChange={(e) => setDark(e.target.value)} className="font-mono text-xs" spellCheck={false} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qr-light" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('lightColor')}
              </Label>
              <div className="flex gap-2">
                <Input id="qr-light" type="color" value={light} onChange={(e) => setLight(e.target.value)} className="h-10 w-14 cursor-pointer p-1" />
                <Input value={light} onChange={(e) => setLight(e.target.value)} className="font-mono text-xs" spellCheck={false} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleResetColors}>
              {t('resetColors')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setContent('')}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              {t('clear')}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 overflow-auto p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={handleDownload} disabled={!dataUrl}>
              <Download className="mr-1.5 h-4 w-4" />
              {t('downloadPng')}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={handleCopyImage} disabled={!dataUrl}>
              <Copy className="mr-1.5 h-4 w-4" />
              {copied ? t('copied') : t('copyImage')}
            </Button>
          </div>

          <div
            className={cn(
              'flex min-h-[200px] flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/30 p-4',
              error && 'border-destructive/50'
            )}
          >
            {error ? (
              <p className="text-center text-sm text-destructive">{error}</p>
            ) : dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dataUrl} alt={t('previewAlt')} className="max-h-[min(420px,50vh)] max-w-full object-contain" width={widthClamped} height={widthClamped} />
            ) : (
              <div className="flex max-w-sm flex-col items-center gap-2 text-center text-muted-foreground">
                <ImageIcon className="h-10 w-10 opacity-50" aria-hidden />
                <p className="text-sm">{t('emptyHint')}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
