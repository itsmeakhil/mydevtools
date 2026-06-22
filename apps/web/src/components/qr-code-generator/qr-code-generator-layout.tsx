'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
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
import { Copy, Download, ImageIcon, Trash2, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type QRCodeStyling from 'qr-code-styling';

type Ecc = 'L' | 'M' | 'Q' | 'H';
type DotType = 'square' | 'dots' | 'rounded' | 'extra-rounded' | 'classy' | 'classy-rounded';
type CornerSquareType = 'dot' | 'square' | 'extra-rounded';
type CornerDotType = 'dot' | 'square';

const ECC_OPTIONS: Ecc[] = ['L', 'M', 'Q', 'H'];
const WIDTH_MIN = 120;
const WIDTH_MAX = 1024;
const MARGIN_OPTIONS = [0, 5, 10, 15, 20] as const;
const DOT_TYPE_OPTIONS: DotType[] = ['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded'];
const CORNER_SQUARE_OPTIONS: CornerSquareType[] = ['dot', 'square', 'extra-rounded'];
const CORNER_DOT_OPTIONS: CornerDotType[] = ['dot', 'square'];

const DOT_TYPE_LABEL_KEYS = {
  'square': 'dotTypeSquare',
  'dots': 'dotTypeDots',
  'rounded': 'dotTypeRounded',
  'extra-rounded': 'dotTypeExtraRounded',
  'classy': 'dotTypeClassy',
  'classy-rounded': 'dotTypeClassyRounded',
} as const;

const CORNER_SQUARE_LABEL_KEYS = {
  'dot': 'cornerSquareDot',
  'square': 'cornerSquareSquare',
  'extra-rounded': 'cornerSquareExtraRounded',
} as const;

const CORNER_DOT_LABEL_KEYS = {
  'dot': 'cornerDotDot',
  'square': 'cornerDotSquare',
} as const;

export function QrCodeGeneratorLayout() {
  const t = useTranslations('QrCodeGenerator');
  const searchParams = useSearchParams();
  const initialInput = searchParams.get('input') || 'https://mydevtools.tech';

  // Content
  const [content, setContent] = useState(initialInput);

  // QR Options
  const [ecc, setEcc] = useState<Ecc>('M');
  const [margin, setMargin] = useState<number>(10);
  const [width, setWidth] = useState(280);

  // Style
  const [dotType, setDotType] = useState<DotType>('square');
  const [cornerSquareType, setCornerSquareType] = useState<CornerSquareType>('square');
  const [cornerDotType, setCornerDotType] = useState<CornerDotType>('square');

  // Colors
  const [dark, setDark] = useState('#000000');
  const [light, setLight] = useState('#ffffff');

  // Logo
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoMargin, setLogoMargin] = useState(5);

  // UI state
  const [copied, setCopied] = useState(false);

  // Refs
  const qrRef = useRef<QRCodeStyling | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trimmed = content.trim();
  const hasContent = trimmed.length > 0;
  const widthClamped = Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, Math.round(width)));

  // Initialize QR code instance on mount with initial values
  useEffect(() => {
    let cancelled = false;
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (cancelled || !containerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = new (QRCodeStyling as any)({
        width: 280,
        height: 280,
        data: 'https://mydevtools.tech',
        margin: 10,
        qrOptions: { errorCorrectionLevel: 'M' },
        dotsOptions: { color: '#000000', type: 'square' },
        backgroundOptions: { color: '#ffffff' },
        cornersSquareOptions: { color: '#000000', type: 'square' },
        cornersDotOptions: { color: '#000000', type: 'square' },
        image: '',
        imageOptions: { margin: 5, hideBackgroundDots: true, crossOrigin: 'anonymous' },
      });
      qrRef.current = instance;
      containerRef.current.innerHTML = '';
      instance.append(containerRef.current);
    });
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced update when any option changes
  const debouncedUpdate = useDebouncedCallback(() => {
    if (!qrRef.current || !trimmed) return;
    const w = Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, Math.round(width)));
    qrRef.current.update({
      width: w,
      height: w,
      data: trimmed,
      margin,
      qrOptions: { errorCorrectionLevel: ecc },
      dotsOptions: { color: dark, type: dotType },
      backgroundOptions: { color: light },
      cornersSquareOptions: { color: dark, type: cornerSquareType },
      cornersDotOptions: { color: dark, type: cornerDotType },
      image: logoDataUrl ?? '',
      imageOptions: { margin: logoMargin, hideBackgroundDots: true, crossOrigin: 'anonymous' },
    });
  }, 320);

  useEffect(() => {
    debouncedUpdate();
  }, [content, ecc, margin, width, dark, light, dotType, cornerSquareType, cornerDotType, logoDataUrl, logoMargin, debouncedUpdate]);

  const handleDownload = (ext: 'png' | 'svg') => {
    if (!qrRef.current || !hasContent) return;
    qrRef.current.download({ name: 'qr-code', extension: ext });
  };

  const handleCopyImage = async () => {
    if (!qrRef.current || !hasContent) return;
    try {
      if (!navigator.clipboard?.write) {
        toast.error(t('errors.copyUnsupported'));
        return;
      }
      const blob = await qrRef.current.getRawData('png');
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob as Blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('errors.copyFailed'));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoDataUrl((ev.target?.result as string) ?? null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetColors = () => {
    setDark('#000000');
    setLight('#ffffff');
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Controls Panel */}
        <Card className="flex flex-col gap-5 overflow-auto p-4">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="qr-content" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('contentLabel')}
            </Label>
            <Textarea
              id="qr-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('contentPlaceholder')}
              className="min-h-[100px] resize-y font-mono text-sm"
              spellCheck={false}
            />
          </div>

          {/* Style */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('styleLabel')}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('dotTypeLabel')}</Label>
                <Select value={dotType} onValueChange={(v) => setDotType(v as DotType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOT_TYPE_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {t(DOT_TYPE_LABEL_KEYS[d])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('cornerSquareLabel')}</Label>
                <Select value={cornerSquareType} onValueChange={(v) => setCornerSquareType(v as CornerSquareType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CORNER_SQUARE_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(CORNER_SQUARE_LABEL_KEYS[c])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('cornerDotLabel')}</Label>
                <Select value={cornerDotType} onValueChange={(v) => setCornerDotType(v as CornerDotType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CORNER_DOT_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(CORNER_DOT_LABEL_KEYS[c])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Options: ECC, Margin, Width */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('marginLabel')}</Label>
              <Select value={String(margin)} onValueChange={(v) => setMargin(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARGIN_OPTIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} px
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
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
                {WIDTH_MIN}–{WIDTH_MAX} px · {t('widthEffective', { px: widthClamped })}
              </p>
            </div>
          </div>

          {/* Colors */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="qr-dark" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('darkColor')}
              </Label>
              <div className="flex gap-2">
                <Input id="qr-dark" type="color" value={dark} onChange={(e) => setDark(e.target.value)} className="h-10 w-14 cursor-pointer p-1" />
                <Input value={dark} onChange={(e) => setDark(e.target.value)} className="font-mono text-xs" spellCheck={false} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-light" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('lightColor')}
              </Label>
              <div className="flex gap-2">
                <Input id="qr-light" type="color" value={light} onChange={(e) => setLight(e.target.value)} className="h-10 w-14 cursor-pointer p-1" />
                <Input value={light} onChange={(e) => setLight(e.target.value)} className="font-mono text-xs" spellCheck={false} />
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('logoLabel')}</Label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            {logoDataUrl ? (
              <div className="flex flex-wrap items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoDataUrl} alt="Logo preview" width={40} height={40} loading="lazy" decoding="async" className="h-10 w-10 rounded border object-contain p-0.5" />
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="qr-logo-margin" className="text-xs text-muted-foreground">{t('logoMarginLabel')}</Label>
                  <Input
                    id="qr-logo-margin"
                    type="number"
                    min={0}
                    max={20}
                    value={logoMargin}
                    onChange={(e) => setLogoMargin(Number(e.target.value))}
                    className="h-8 w-16 text-xs"
                  />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setLogoDataUrl(null)} className="h-8 px-2 text-muted-foreground">
                  <X className="h-4 w-4" />
                  <span className="sr-only">{t('removeLogo')}</span>
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-1.5 h-4 w-4" />
                {t('uploadLogo')}
              </Button>
            )}
          </div>

          {/* Action buttons */}
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

        {/* Preview Panel */}
        <Card className="flex flex-col gap-4 overflow-auto p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={() => handleDownload('png')} disabled={!hasContent}>
              <Download className="mr-1.5 h-4 w-4" />
              {t('downloadPng')}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => handleDownload('svg')} disabled={!hasContent}>
              <Download className="mr-1.5 h-4 w-4" />
              {t('downloadSvg')}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={handleCopyImage} disabled={!hasContent}>
              <Copy className="mr-1.5 h-4 w-4" />
              {copied ? t('copied') : t('copyImage')}
            </Button>
          </div>

          <div className="relative flex min-h-[200px] flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/30 p-4">
            <div
              ref={containerRef}
              className={cn(
                '[&_canvas]:max-h-[min(420px,50vh)] [&_canvas]:max-w-full [&_canvas]:rounded-sm',
                !hasContent && 'invisible'
              )}
            />
            {!hasContent && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex max-w-sm flex-col items-center gap-2 text-center text-muted-foreground">
                  <ImageIcon className="h-10 w-10 opacity-50" aria-hidden />
                  <p className="text-sm">{t('emptyHint')}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
