'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { useDebouncedCallback } from 'use-debounce';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { computeTotp, decodeBase32Secret, getTotpSecondsRemaining } from '@/lib/totp-compute';
import { cn } from '@/lib/utils';

const PERIOD_SEC = 30;
const DIGITS = 6;

export function TotpGeneratorLayout() {
  const t = useTranslations('TotpGenerator');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(PERIOD_SEC);
  const [invalid, setInvalid] = useState(false);
  const [cryptoError, setCryptoError] = useState(false);
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard();

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
    setRemaining(getTotpSecondsRemaining(now, PERIOD_SEC));
    try {
      setCode(await computeTotp(keyBytes, now, PERIOD_SEC, DIGITS));
      setCryptoError(false);
    } catch {
      setCode('');
      setCryptoError(true);
    }
  }, [secret, trimmed]);

  const debounced = useDebouncedCallback(() => {
    void run();
  }, 150);

  useEffect(() => {
    debounced();
  }, [secret, debounced]);

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

  const progress = remaining / PERIOD_SEC;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 overflow-auto p-4">
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
        </Card>

        <Card className="flex flex-col gap-4 overflow-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('codeLabel')}
            </Label>
            <Button type="button" size="sm" variant="secondary" disabled={!code} onClick={handleCopy}>
              {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? t('copied') : t('copyCode')}
            </Button>
          </div>

          <div
            className={cn(
              'relative flex min-h-[140px] flex-col items-center justify-center rounded-md border bg-muted/30 p-6',
              !code && !invalid && !cryptoError && 'text-muted-foreground'
            )}
            aria-live="polite"
          >
            {cryptoError ? (
              <span className="text-center text-sm text-destructive">{t('errors.cryptoFailed')}</span>
            ) : invalid ? (
              <span className="text-center text-sm text-destructive">{t('errors.invalidSecret')}</span>
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
        </Card>
      </div>
    </div>
  );
}
