'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { useDebouncedCallback } from 'use-debounce';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type QRCodeStyling from 'qr-code-styling';
import { ChevronDown } from 'lucide-react';
import { IconClock } from '@tabler/icons-react';
import { CATEGORY_ACCENT } from '@/components/dashboard/types';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { CopyTextButton } from '@/components/tools/copy-text-button';
import { ToolErrorBanner } from '@/components/tools/tool-error-banner';
import { Button } from '@/components/ui/button';
import {
  computeTotp,
  decodeBase32Secret,
  getTotpSecondsRemaining,
  type TotpAlgorithm,
} from '@/lib/totp-compute';
import { buildOtpauthUri, parseOtpauthUri } from '@/lib/totp-uri';
import { cn } from '@/lib/utils';

const DIGIT_OPTIONS = [6, 8] as const;
const PERIOD_OPTIONS = [15, 30, 60] as const;
const ALGORITHM_OPTIONS: TotpAlgorithm[] = ['SHA-1', 'SHA-256', 'SHA-512'];

type TotpDigits = (typeof DIGIT_OPTIONS)[number];
type TotpPeriod = (typeof PERIOD_OPTIONS)[number];

const isSupportedDigits = (d: number): d is TotpDigits =>
  (DIGIT_OPTIONS as readonly number[]).includes(d);
const isSupportedPeriod = (p: number): p is TotpPeriod =>
  (PERIOD_OPTIONS as readonly number[]).includes(p);

export function TotpGeneratorLayout() {
  const t = useTranslations('TotpGenerator');
  const [secret, setSecret] = useState('');
  const [digits, setDigits] = useState<TotpDigits>(6);
  const [period, setPeriod] = useState<TotpPeriod>(30);
  const [algorithm, setAlgorithm] = useState<TotpAlgorithm>('SHA-1');
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState<number>(30);
  const [invalid, setInvalid] = useState(false);
  const [cryptoError, setCryptoError] = useState(false);
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard();
  const [importUri, setImportUri] = useState('');
  const [importError, setImportError] = useState<
    'errors.invalidUri' | 'errors.unsupportedUri' | null
  >(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [account, setAccount] = useState('');
  const [issuer, setIssuer] = useState('');
  const qrRef = useRef<QRCodeStyling | null>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const trimmed = useMemo(() => secret.replace(/[\s-]/g, ''), [secret]);

  const run = useCallback(async () => {
    if (!trimmed) {
      setCode('');
      setInvalid(false);
      setCryptoError(false);
      return;
    }
    let keyBytes: Uint8Array;
    try {
      keyBytes = decodeBase32Secret(secret);
    } catch {
      setCode('');
      setInvalid(true);
      setCryptoError(false);
      return;
    }
    if (keyBytes.length === 0) {
      setCode('');
      setInvalid(true);
      setCryptoError(false);
      return;
    }
    setInvalid(false);
    const now = Date.now();
    setRemaining(getTotpSecondsRemaining(now, period));
    try {
      setCode(await computeTotp(keyBytes, now, period, digits, algorithm));
      setCryptoError(false);
    } catch {
      setCode('');
      setCryptoError(true);
    }
  }, [secret, trimmed, digits, period, algorithm]);

  const debounced = useDebouncedCallback(() => {
    void run();
  }, 150);

  useEffect(() => {
    debounced();
  }, [secret, digits, period, algorithm, debounced]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void run();
    }, 1000);
    return () => window.clearInterval(id);
  }, [run]);

  const handleCopy = () => {
    if (!code) return;
    void copyToClipboard(code, { silent: true });
  };

  const handleImport = () => {
    const parsed = parseOtpauthUri(importUri);
    if (!parsed) {
      setImportError('errors.invalidUri');
      return;
    }
    if (!isSupportedDigits(parsed.digits) || !isSupportedPeriod(parsed.period)) {
      setImportError('errors.unsupportedUri');
      return;
    }
    setSecret(parsed.secret);
    setDigits(parsed.digits);
    setPeriod(parsed.period);
    setAlgorithm(parsed.algorithm);
    setImportUri('');
    setImportError(null);
  };

  const progress = remaining / period;

  const provisioningUri = useMemo(() => {
    if (!trimmed) return null;
    try {
      if (decodeBase32Secret(trimmed).length === 0) return null;
    } catch {
      return null;
    }
    return buildOtpauthUri({
      secret: trimmed,
      digits,
      period,
      algorithm,
      label: account.trim() || 'Account',
      issuer: issuer.trim() || undefined,
    });
  }, [trimmed, digits, period, algorithm, account, issuer]);

  useEffect(() => {
    if (!qrOpen || !provisioningUri) return;
    let cancelled = false;
    const mount = (instance: QRCodeStyling) => {
      if (!qrContainerRef.current) return;
      qrContainerRef.current.innerHTML = '';
      instance.append(qrContainerRef.current);
    };
    if (qrRef.current) {
      qrRef.current.update({ data: provisioningUri });
      mount(qrRef.current); // re-append: CollapsibleContent unmounts its DOM when closed
      return;
    }
    // Same dynamic-import pattern as qr-code-generator-layout.tsx:98 — keeps
    // qr-code-styling out of the bundle for users who never open this section.
    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (cancelled || !qrContainerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance: QRCodeStyling = new (QRCodeStyling as any)({
        width: 200,
        height: 200,
        data: provisioningUri,
        margin: 8,
        qrOptions: { errorCorrectionLevel: 'M' },
        dotsOptions: { color: '#000000', type: 'square' },
        backgroundOptions: { color: '#ffffff' },
      });
      qrRef.current = instance;
      mount(instance);
    });
    return () => {
      cancelled = true;
    };
  }, [qrOpen, provisioningUri]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconClock}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Generators}
        />
      </RevealItem>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 overflow-auto p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('digitsLabel')}
              </Label>
              <Select value={String(digits)} onValueChange={(v) => setDigits(Number(v) as TotpDigits)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIGIT_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('periodLabel')}
              </Label>
              <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v) as TotpPeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      {t('periodSeconds', { seconds: p })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('algorithmLabel')}
              </Label>
              <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as TotpAlgorithm)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALGORITHM_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="totp-secret">{t('secretLabel')}</Label>
            <Textarea
              id="totp-secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={t('placeholderSecret')}
              className="min-h-[120px] resize-y font-mono text-sm"
              spellCheck={false}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">{t('standardHint')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="totp-uri">{t('importLabel')}</Label>
            <div className="flex gap-2">
              <Input
                id="totp-uri"
                value={importUri}
                onChange={(e) => {
                  setImportUri(e.target.value);
                  setImportError(null);
                }}
                placeholder={t('importPlaceholder')}
                className="font-mono text-sm"
                spellCheck={false}
                autoComplete="off"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!importUri.trim()}
                onClick={handleImport}
              >
                {t('importAction')}
              </Button>
            </div>
            {importError && <p className="text-xs text-destructive">{t(importError)}</p>}
          </div>
        </Card>

        <Card className="flex flex-col gap-4 overflow-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('codeLabel')}
            </Label>
            <CopyTextButton
              onCopy={handleCopy}
              copied={copied}
              disabled={!code}
              label={t('copyCode')}
              copiedLabel={t('copied')}
            />
          </div>

          <div
            className={cn(
              'relative flex min-h-[140px] flex-col items-center justify-center rounded-md border bg-muted/30 p-6',
              !code && !invalid && !cryptoError && 'text-muted-foreground'
            )}
            aria-live="polite"
          >
            {cryptoError ? (
              <ToolErrorBanner message={t('errors.cryptoFailed')} />
            ) : invalid ? (
              <ToolErrorBanner message={t('errors.invalidSecret')} />
            ) : code ? (
              <>
                <span className="font-mono text-4xl font-semibold tracking-[0.2em] tabular-nums md:text-5xl">
                  {code}
                </span>
                <p className="mt-3 text-xs text-muted-foreground">{t('nextIn', { seconds: remaining })}</p>
                <div
                  className="absolute bottom-0 left-0 h-1 rounded-b-md bg-primary transition-[width] duration-1000 ease-linear"
                  style={{ width: `${progress * 100}%` }}
                  aria-hidden
                />
              </>
            ) : (
              <span className="text-center text-sm">{!trimmed ? t('emptyHint') : t('invalidHint')}</span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{t('securityNote')}</p>

          <Collapsible open={qrOpen} onOpenChange={setQrOpen} className="shrink-0">
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-between px-2">
                {t('qrSectionTitle')}
                <ChevronDown className={cn('h-4 w-4 transition-transform', qrOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="totp-account">{t('accountLabel')}</Label>
                  <Input
                    id="totp-account"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder={t('accountPlaceholder')}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totp-issuer">{t('issuerLabel')}</Label>
                  <Input
                    id="totp-issuer"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    placeholder={t('issuerPlaceholder')}
                    autoComplete="off"
                  />
                </div>
              </div>
              {provisioningUri ? (
                <div className="flex justify-center">
                  <div ref={qrContainerRef} className="rounded-md bg-white p-3" />
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground">{t('qrEmptyHint')}</p>
              )}
              <p className="text-xs text-muted-foreground">{t('qrHint')}</p>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </div>
  );
}
