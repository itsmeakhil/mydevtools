'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { decodeJwt, type RelativeUnit } from '@/lib/jwt-decode';
import { cn } from '@/lib/utils';
import { AlertCircle, Check, Copy, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

function CopyBtn({ text, title }: { text: string; title: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      title={title}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          // If clipboard fails (permissions / insecure context), do nothing.
        }
      }}
    >
      {done ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function JsonPanel({
  title,
  content,
  copyLabel,
}: {
  title: string;
  content: string;
  copyLabel: string;
}) {
  return (
    <Card className="flex flex-col overflow-hidden min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30 gap-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </Label>
        <CopyBtn text={content} title={copyLabel} />
      </div>
      <div className="flex-1 min-h-[140px] max-h-[280px] relative">
        <pre className="absolute inset-0 overflow-auto p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all">
          {content}
        </pre>
      </div>
    </Card>
  );
}

export function JwtDecoderLayout() {
  const t = useTranslations('JwtDecoder');
  const [input, setInput] = useState('');
  const result = useMemo(() => decodeJwt(input), [input]);

  const relativeText = (n: number, unit: RelativeUnit, direction: 'future' | 'past') => {
    const unitText = t(`units.${unit}`, { count: n });
    return direction === 'future'
      ? t('relative.future', { n, unit: unitText })
      : t('relative.past', { n, unit: unitText });
  };

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">
          {t.rich('subtitle', {
            code: (chunks) => <code className="text-foreground">{chunks}</code>,
          })}
        </p>
      </div>

      <Card className="flex flex-col overflow-hidden shrink-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30">
          <Label htmlFor="jwt-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('tokenLabel')}
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setInput('')}
          >
            <Trash2 className="h-3 w-3" />
            {t('clear')}
          </Button>
        </div>
        <textarea
          id="jwt-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('placeholder')}
          spellCheck={false}
          className="min-h-[100px] max-h-[160px] w-full resize-y bg-transparent p-3 text-xs font-mono focus:outline-none placeholder:text-muted-foreground/50"
        />
      </Card>

      {!result.ok && input.trim() && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{t(`errors.${result.errorKey}`)}</p>
        </div>
      )}

      {result.ok && (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <Card
            className={cn(
              'border p-4 space-y-3',
              result.expiry.kind === 'present' &&
                (result.expiry.expired
                  ? 'border-destructive/40 bg-destructive/5'
                  : 'border-emerald-500/30 bg-emerald-500/5')
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('expiryLabel')}
              </Label>
              {result.hasSignature && (
                <span className="text-[10px] text-muted-foreground">{t('signaturePresent')}</span>
              )}
            </div>

            {result.expiry.kind === 'absent' && (
              <p className="text-sm text-muted-foreground">
                {t.rich('noExp', {
                  code: (chunks) => <code className="text-foreground">{chunks}</code>,
                })}
              </p>
            )}

            {result.expiry.kind === 'present' && (
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      result.expiry.expired
                        ? 'bg-destructive/15 text-destructive'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    )}
                  >
                    {result.expiry.expired ? t('status.expired') : t('status.valid')}
                  </span>
                  <span className="text-muted-foreground">
                    {relativeText(
                      result.expiry.relative.value,
                      result.expiry.relative.unit,
                      result.expiry.relative.direction
                    )}
                  </span>
                </div>
                <dl className="grid gap-1 text-xs font-mono sm:grid-cols-[auto_1fr] sm:gap-x-4">
                  <dt className="text-muted-foreground">{t('fields.unix')}</dt>
                  <dd>{result.expiry.unix}</dd>
                  <dt className="text-muted-foreground">{t('fields.local')}</dt>
                  <dd>{result.expiry.date.toLocaleString()}</dd>
                  <dt className="text-muted-foreground">{t('fields.utc')}</dt>
                  <dd>{result.expiry.date.toUTCString()}</dd>
                </dl>
              </div>
            )}

            {(result.issuedAt || result.notBefore) && (
              <div className="pt-2 border-t border-border/50 space-y-2 text-xs">
                {result.issuedAt && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="text-muted-foreground shrink-0">{t('claims.issuedAt')}</span>
                    <span className="font-mono">{result.issuedAt.date.toLocaleString()}</span>
                  </div>
                )}
                {result.notBefore && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="text-muted-foreground shrink-0">{t('claims.notBefore')}</span>
                    <span className="font-mono">{result.notBefore.date.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
            <JsonPanel title={t('panels.header')} content={result.headerFormatted} copyLabel={t('copy')} />
            <JsonPanel title={t('panels.payload')} content={result.payloadFormatted} copyLabel={t('copy')} />
          </div>
        </div>
      )}
    </div>
  );
}
