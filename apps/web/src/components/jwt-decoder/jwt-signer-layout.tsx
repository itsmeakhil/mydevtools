'use client';

import { useCallback, useMemo, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useTranslations } from 'next-intl';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Copy } from 'lucide-react';
import { signJwt, verifyJwt, type JwtAlg } from '@/lib/jwt-jws';
import { cn } from '@/lib/utils';

const ALG_OPTIONS: readonly JwtAlg[] = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'none'] as const;

function safeJsonParse(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

export function JwtSignerLayout() {
  const t = useTranslations('JwtDecoder');

  const [alg, setAlg] = useState<JwtAlg>('HS256');
  const [headerText, setHeaderText] = useState<string>('{\n  "typ": "JWT",\n  "alg": "HS256"\n}');
  const [payloadText, setPayloadText] = useState<string>('{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}');
  const [signingKey, setSigningKey] = useState<string>('');
  const [verificationKey, setVerificationKey] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [signErrorKey, setSignErrorKey] = useState<string | null>(null);
  const [verifyErrorKey, setVerifyErrorKey] = useState<string | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);

  const { isCopied: copied, copyToClipboard } = useCopyToClipboard();

  const keyMode = useMemo<'hs' | 'rs' | 'none'>(() => {
    if (alg === 'none') return 'none';
    if (alg.startsWith('HS')) return 'hs';
    return 'rs';
  }, [alg]);

  const runSign = useCallback(async () => {
    setSignErrorKey(null);
    setVerifyErrorKey(null);
    setVerified(null);

    const headerParsed = safeJsonParse(headerText);
    const payloadParsed = safeJsonParse(payloadText);
    if (!headerParsed.ok || !payloadParsed.ok) {
      setToken('');
      setSignErrorKey('signErrors.invalidJson');
      return;
    }

    const res = await signJwt({
      header: headerParsed.value,
      payload: payloadParsed.value,
      alg,
      signingKey: keyMode === 'none' ? '' : signingKey,
    });

    if (!res.ok) {
      setToken('');
      setSignErrorKey(`signErrors.${res.errorKey}`);
      return;
    }

    setToken(res.token);
  }, [alg, headerText, payloadText, signingKey, keyMode]);

  const runVerify = useCallback(async () => {
    setVerifyErrorKey(null);
    setVerified(null);

    const key = verificationKey.trim() ? verificationKey : signingKey;
    const res = await verifyJwt({ token, verificationKey: keyMode === 'none' ? '' : key });
    if (!res.ok) {
      setVerified(null);
      setVerifyErrorKey(`verifyErrors.${res.errorKey}`);
      return;
    }
    setVerified(res.valid);
  }, [token, verificationKey, signingKey, keyMode]);

  const handleCopy = useCallback(() => {
    if (!token) return;
    void copyToClipboard(token, { silent: true });
  }, [token, copyToClipboard]);

  const keyLabel = keyMode === 'hs' ? t('signer.secretLabel') : t('signer.privateKeyLabel');
  const keyPlaceholder =
    keyMode === 'hs' ? t('signer.secretPlaceholder') : t('signer.privateKeyPlaceholder');

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">
          {t.rich('subtitle', {
            code: (chunks) => <code className="text-foreground">{chunks}</code>,
          })}
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Inputs */}
        <Card className="flex min-h-0 flex-col gap-4 overflow-auto p-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('signer.algLabel')}
            </Label>
            <Select value={alg} onValueChange={(v) => setAlg(v as JwtAlg)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALG_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="payload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="payload">{t('signer.tabs.payload')}</TabsTrigger>
              <TabsTrigger value="header">{t('signer.tabs.header')}</TabsTrigger>
            </TabsList>

            <TabsContent value="payload" className="mt-3 space-y-2 data-[state=inactive]:hidden">
              <Label htmlFor="jwt-payload">{t('signer.payloadLabel')}</Label>
              <Textarea
                id="jwt-payload"
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                placeholder={t('signer.payloadPlaceholder')}
                className="min-h-[220px] resize-y font-mono text-sm"
                spellCheck={false}
              />
            </TabsContent>

            <TabsContent value="header" className="mt-3 space-y-2 data-[state=inactive]:hidden">
              <Label htmlFor="jwt-header">{t('signer.headerLabel')}</Label>
              <Textarea
                id="jwt-header"
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                placeholder={t('signer.headerPlaceholder')}
                className="min-h-[220px] resize-y font-mono text-sm"
                spellCheck={false}
              />
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="jwt-key">{keyLabel}</Label>
            <Textarea
              id="jwt-key"
              value={signingKey}
              onChange={(e) => setSigningKey(e.target.value)}
              placeholder={keyPlaceholder}
              className={cn('min-h-[120px] resize-y font-mono text-sm', keyMode === 'hs' && 'min-h-[80px]')}
              spellCheck={false}
              disabled={keyMode === 'none'}
            />
            {keyMode === 'none' && (
              <p className="text-xs text-muted-foreground">{t('signer.noneHint')}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void runSign()}>
              {t('signer.sign')}
            </Button>
            <Button type="button" variant="secondary" disabled={!token} onClick={() => void runVerify()}>
              {t('signer.verify')}
            </Button>
          </div>

          {signErrorKey && (
            <p className="text-sm text-destructive">{t(signErrorKey as never)}</p>
          )}
        </Card>

        {/* Output */}
        <Card className="flex min-h-0 flex-col gap-3 overflow-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('signer.outputLabel')}
            </Label>
            <Button type="button" size="sm" variant="secondary" disabled={!token} onClick={handleCopy}>
              {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? t('signer.copied') : t('signer.copyToken')}
            </Button>
          </div>

          <div className="min-h-[160px] rounded-md border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap break-all">
            {token || <span className="text-muted-foreground">{t('signer.outputPlaceholder')}</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="jwt-verify-key">{t('signer.verifyKeyLabel')}</Label>
            <Textarea
              id="jwt-verify-key"
              value={verificationKey}
              onChange={(e) => setVerificationKey(e.target.value)}
              placeholder={t('signer.verifyKeyPlaceholder')}
              className="min-h-[100px] resize-y font-mono text-sm"
              spellCheck={false}
              disabled={keyMode === 'none'}
            />
            <p className="text-xs text-muted-foreground">{t('signer.verifyKeyHint')}</p>
          </div>

          {verifyErrorKey && (
            <p className="text-sm text-destructive">{t(verifyErrorKey as never)}</p>
          )}

          {verified !== null && (
            <div
              className={cn(
                'rounded-lg border px-3 py-2 text-sm',
                verified ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400' : 'border-destructive/40 bg-destructive/5 text-destructive'
              )}
            >
              {verified ? t('signer.verifyStatus.valid') : t('signer.verifyStatus.invalid')}
            </div>
          )}

          <p className="text-xs text-muted-foreground">{t('signer.securityNote')}</p>
        </Card>
      </div>
    </div>
  );
}

