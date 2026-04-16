'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDebouncedCallback } from 'use-debounce';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Check } from 'lucide-react';
import { HMAC_DIGESTS, computeHmac, type HmacDigestId } from '@/lib/hmac-compute';
import { cn } from '@/lib/utils';

const DIGEST_MSG: Record<HmacDigestId, string> = {
  'SHA-1': 'sha1',
  'SHA-256': 'sha256',
  'SHA-384': 'sha384',
  'SHA-512': 'sha512',
};

export function HmacGeneratorLayout() {
  const t = useTranslations('HmacGenerator');
  const [digest, setDigest] = useState<HmacDigestId>('SHA-256');
  const [outputFormat, setOutputFormat] = useState<'hex' | 'base64'>('hex');
  const [secret, setSecret] = useState('');
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const secretBytes = useMemo(() => new TextEncoder().encode(secret).length, [secret]);
  const messageBytes = useMemo(() => new TextEncoder().encode(message).length, [message]);

  const run = useCallback(async () => {
    if (!secret) {
      setSignature('');
      setError(false);
      return;
    }
    setWorking(true);
    setError(false);
    try {
      setSignature(await computeHmac(digest, secret, message, outputFormat));
    } catch {
      setSignature('');
      setError(true);
    } finally {
      setWorking(false);
    }
  }, [digest, secret, message, outputFormat]);

  const debounced = useDebouncedCallback(() => {
    void run();
  }, 250);

  useEffect(() => {
    debounced();
  }, [digest, secret, message, outputFormat, debounced]);

  const handleCopy = async () => {
    if (!signature) return;
    try {
      await navigator.clipboard.writeText(signature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 overflow-auto p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('algorithmLabel')}
              </Label>
              <Select value={digest} onValueChange={(v) => setDigest(v as HmacDigestId)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HMAC_DIGESTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {t(`algorithms.${DIGEST_MSG[d]}` as 'algorithms.sha256')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('outputFormatLabel')}
              </Label>
              <Select
                value={outputFormat}
                onValueChange={(v) => setOutputFormat(v as 'hex' | 'base64')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hex">{t('formatHex')}</SelectItem>
                  <SelectItem value="base64">{t('formatBase64')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hmac-secret">{t('secretLabel')}</Label>
            <Textarea
              id="hmac-secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={t('placeholderSecret')}
              className="min-h-[100px] resize-y font-mono text-sm"
              spellCheck={false}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">{t('byteCountHint', { count: secretBytes })}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hmac-message">{t('messageLabel')}</Label>
            <Textarea
              id="hmac-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('placeholderMessage')}
              className="min-h-[140px] resize-y font-mono text-sm"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">{t('byteCountHint', { count: messageBytes })}</p>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 overflow-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('outputLabel')}
            </Label>
            <Button type="button" size="sm" variant="secondary" disabled={!signature} onClick={handleCopy}>
              {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? t('copied') : t('copyOutput')}
            </Button>
          </div>
          <div
            className={cn(
              'min-h-[120px] rounded-md border bg-muted/30 p-3 font-mono text-sm break-all',
              working && 'opacity-60'
            )}
          >
            {error ? (
              <span className="text-destructive">{t('errors.cryptoFailed')}</span>
            ) : signature ? (
              signature
            ) : (
              <span className="text-muted-foreground">
                {!secret ? t('emptyHint') : '…'}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t('securityNote')}</p>
        </Card>
      </div>
    </div>
  );
}
