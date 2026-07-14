'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { useDebouncedCallback } from 'use-debounce';
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
import { IconCircleKey } from '@tabler/icons-react';
import { CATEGORY_ACCENT } from '@/components/dashboard/types';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { CopyTextButton } from '@/components/tools/copy-text-button';
import { ToolErrorBanner } from '@/components/tools/tool-error-banner';
import { Input } from '@/components/ui/input';
import {
  HMAC_DIGESTS,
  computeHmac,
  decodeKey,
  type HmacDigestId,
  type HmacKeyEncoding,
} from '@/lib/hmac-compute';
import { compareHashes } from '@/lib/compare-hashes';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

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
  const [keyEncoding, setKeyEncoding] = useState<HmacKeyEncoding>('utf8');
  const [secret, setSecret] = useState('');
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [expectedMac, setExpectedMac] = useState('');
  const [working, setWorking] = useState(false);
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard();
  const [error, setError] = useState<'crypto' | 'invalidKey' | null>(null);

  const secretBytes = useMemo(() => {
    try {
      return decodeKey(secret, keyEncoding).length;
    } catch {
      return 0;
    }
  }, [secret, keyEncoding]);
  const messageBytes = useMemo(() => new TextEncoder().encode(message).length, [message]);

  const run = useCallback(async () => {
    if (!secret) {
      setSignature('');
      setError(null);
      return;
    }
    setWorking(true);
    setError(null);
    try {
      setSignature(await computeHmac(digest, secret, message, outputFormat, keyEncoding));
    } catch (e) {
      setSignature('');
      setError(
        e instanceof Error && (e.message === 'invalid-hex' || e.message === 'invalid-base64')
          ? 'invalidKey'
          : 'crypto'
      );
    } finally {
      setWorking(false);
    }
  }, [digest, secret, message, outputFormat, keyEncoding]);

  const debounced = useDebouncedCallback(() => {
    void run();
  }, 250);

  useEffect(() => {
    debounced();
  }, [digest, secret, message, outputFormat, keyEncoding, debounced]);

  const handleCopy = () => {
    if (!signature) return;
    void copyToClipboard(signature, { silent: true });
  };

  const verifyMatch = useMemo(() => {
    if (!expectedMac.trim() || !signature) return null;
    return compareHashes(expectedMac, signature);
  }, [expectedMac, signature]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconCircleKey}
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
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('keyEncodingLabel')}
              </Label>
              <Select value={keyEncoding} onValueChange={(v) => setKeyEncoding(v as HmacKeyEncoding)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utf8">{t('keyEncodingUtf8')}</SelectItem>
                  <SelectItem value="hex">{t('keyEncodingHex')}</SelectItem>
                  <SelectItem value="base64">{t('keyEncodingBase64')}</SelectItem>
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
            <p className="text-xs text-muted-foreground">{t('keyByteCountHint', { count: secretBytes })}</p>
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
            <CopyTextButton
              onCopy={handleCopy}
              copied={copied}
              disabled={!signature}
              label={t('copyOutput')}
              copiedLabel={t('copied')}
            />
          </div>
          <div
            className={cn(
              'min-h-[120px] rounded-md border bg-muted/30 p-3 font-mono text-sm break-all',
              working && 'opacity-60'
            )}
          >
            {error ? (
              <ToolErrorBanner
                message={error === 'invalidKey' ? t('errors.invalidKey') : t('errors.cryptoFailed')}
              />
            ) : signature ? (
              signature
            ) : (
              <span className="text-muted-foreground">
                {!secret ? t('emptyHint') : '…'}
              </span>
            )}
          </div>
          <div className="space-y-2 border-t pt-3">
            <Label
              htmlFor="hmac-verify"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t('verifyLabel')}
            </Label>
            <Input
              id="hmac-verify"
              value={expectedMac}
              onChange={(e) => setExpectedMac(e.target.value)}
              placeholder={t('verifyPlaceholder')}
              className="font-mono text-sm"
              spellCheck={false}
              autoComplete="off"
            />
            {verifyMatch !== null && (
              <p
                role="status"
                className={cn(
                  'flex items-center gap-1.5 text-sm font-medium',
                  verifyMatch ? 'text-green-600 dark:text-green-500' : 'text-destructive'
                )}
              >
                {verifyMatch ? <Check className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
                {verifyMatch ? t('verifyMatch') : t('verifyMismatch')}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t('securityNote')}</p>
        </Card>
      </div>
    </div>
  );
}
