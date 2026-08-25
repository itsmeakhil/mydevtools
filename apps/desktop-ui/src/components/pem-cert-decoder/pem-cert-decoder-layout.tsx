'use client';

import { useEffect, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import type { DecodedPemBlock } from '@/lib/pem-cert-decode';
import { decodePemCertificateInput } from '@/lib/pem-cert-decode';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, Copy, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { IconCertificate } from '@tabler/icons-react';
import { ToolShell } from '@/components/tools/tool-shell';
import { IOPanel, ToolTextArea } from '@/components/tools/io-panel';

function CopyBtn({ text, title }: { text: string; title: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      title={title}
      onClick={() => copyToClipboard(text, { silent: true, resetMs: 1600 })}
    >
      {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function formatLocalDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function BlockCard({
  block,
  index,
  t,
  locale,
}: {
  block: DecodedPemBlock;
  index: number;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  const title =
    block.kind === 'certificate'
      ? t('block.certificate')
      : block.kind === 'csr'
        ? t('block.csr')
        : '';

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('block.title', { index: index + 1 })}
          </p>
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-[11px] text-muted-foreground font-mono">{block.pemLabel}</p>
        </div>
      </div>

      <dl className="grid gap-2 p-3 text-sm">
        <div className="grid gap-0.5">
          <dt className="text-xs font-medium text-muted-foreground">{t('fields.subject')}</dt>
          <dd className="font-mono text-xs break-all">{block.subject || '—'}</dd>
        </div>

        {block.kind === 'certificate' && (
          <>
            <div className="grid gap-0.5">
              <dt className="text-xs font-medium text-muted-foreground">{t('fields.issuer')}</dt>
              <dd className="font-mono text-xs break-all">{block.issuer || '—'}</dd>
            </div>
            <div className="grid gap-0.5 sm:grid-cols-2 sm:gap-3">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{t('fields.notBefore')}</dt>
                <dd className="font-mono text-xs">{formatLocalDate(block.notBeforeIso, locale)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{t('fields.notAfter')}</dt>
                <dd className="font-mono text-xs">{formatLocalDate(block.notAfterIso, locale)}</dd>
              </div>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-xs font-medium text-muted-foreground">{t('fields.serial')}</dt>
              <dd className="font-mono text-xs break-all">{block.serialNumber}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-xs font-medium text-muted-foreground">{t('fields.sha256')}</dt>
              <dd className="flex items-start gap-1">
                <span className="font-mono text-xs break-all flex-1">{block.sha256Fingerprint}</span>
                <CopyBtn text={block.sha256Fingerprint.replace(/:/g, '')} title={t('copyHex')} />
              </dd>
            </div>
          </>
        )}

        {block.kind === 'csr' && (
          <>
            <p className="text-xs text-muted-foreground border-l-2 border-muted pl-2">{t('fields.csrIssuerNote')}</p>
            <p className="text-xs text-muted-foreground border-l-2 border-muted pl-2">{t('fields.csrValidityNote')}</p>
          </>
        )}

        <div className="grid gap-0.5">
          <dt className="text-xs font-medium text-muted-foreground">{t('fields.signatureAlgorithm')}</dt>
          <dd className="font-mono text-xs break-all">{block.signatureAlgorithm}</dd>
        </div>

        <div className="grid gap-1 pt-1 border-t border-border/40">
          <dt className="text-xs font-medium text-muted-foreground">{t('fields.sans')}</dt>
          <dd>
            {block.sans.length === 0 ? (
              <span className="text-xs text-muted-foreground">{t('fields.sansNone')}</span>
            ) : (
              <ul className="space-y-1">
                {block.sans.map((row: { type: string; value: string }, i: number) => {
                  const kindKeys = ['dns', 'dn', 'email', 'ip', 'url', 'guid', 'upn', 'id'] as const;
                  const label = kindKeys.includes(row.type as (typeof kindKeys)[number])
                    ? t(`sanType.${row.type}` as Parameters<typeof t>[0])
                    : t('sanType.other', { type: row.type });
                  return (
                    <li key={`${row.type}-${i}`} className="font-mono text-xs break-all flex gap-2">
                      <span className="shrink-0 text-muted-foreground">{label}</span>
                      <span>{row.value}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function PemCertDecoderLayout() {
  const t = useTranslations('CertificatePemDecoder');
  const locale = useLocale();
  const [input, setInput] = useState('');
  const [blocks, setBlocks] = useState<DecodedPemBlock[] | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setBlocks(null);
      setErrorKey(null);
      setBusy(false);
      return;
    }

    let cancelled = false;
    setBusy(true);
    void (async () => {
      const res = await decodePemCertificateInput(input);
      if (cancelled) return;
      setBusy(false);
      if (res.ok) {
        setBlocks(res.blocks);
        setErrorKey(null);
      } else {
        setBlocks(null);
        setErrorKey(res.errorKey);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [input]);

  return (
    <ToolShell
      icon={IconCertificate}
      title={t('title')}
      description={t.rich('subtitle', {
        code: (chunks) => <code className="text-foreground">{chunks}</code>,
      })}
      contentClassName="gap-4"
    >
      <IOPanel
        className="h-[200px] shrink-0"
        label={t('pemLabel')}
        actions={
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setInput('')}>
            <Trash2 className="h-3 w-3" />
            {t('clear')}
          </Button>
        }
      >
        <ToolTextArea
          id="pem-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('placeholder')}
          className="text-xs"
        />
      </IOPanel>

      {busy && input.trim() && (
        <p className="px-1 text-xs text-muted-foreground">{t('parsing')}</p>
      )}

      {errorKey && input.trim() && !busy && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t(`errors.${errorKey}` as 'errors.empty')}</p>
        </div>
      )}

      {blocks && blocks.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
          {blocks.map((b, i) => (
            <BlockCard key={`${b.kind}-${i}`} block={b} index={i} t={t} locale={locale} />
          ))}
        </div>
      )}
    </ToolShell>
  );
}
