'use client';

import { useMemo, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatTimestampAll, parseTimestampInput } from '@/lib/timestamp-convert';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IconCalendarTime } from '@tabler/icons-react';
import { ToolShell } from '@/components/tools/tool-shell';

function CopyField({
  label,
  value,
  copyTitle,
}: {
  label: string;
  value: string;
  copyTitle: string;
}) {
  const { isCopied: done, copyToClipboard } = useCopyToClipboard();
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:w-28">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <Input readOnly value={value} className="h-8 min-w-0 flex-1 font-mono text-xs" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          title={copyTitle}
          onClick={() => copyToClipboard(value, { silent: true, resetMs: 1500 })}
        >
          {done ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export function TimestampConverterLayout() {
  const t = useTranslations('TimestampConverter');
  const [input, setInput] = useState('');

  const parsed = useMemo(() => parseTimestampInput(input), [input]);
  const formatted = useMemo(
    () => (parsed.ok ? formatTimestampAll(parsed.date) : null),
    [parsed]
  );

  const setNow = () => setInput(String(Date.now()));

  const toolbar = (
    <div className="shrink-0 space-y-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="ts-input" className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('inputLabel')}
          </Label>
          <Input
            id="ts-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('placeholder')}
            spellCheck={false}
            className="font-mono text-sm"
          />
        </div>
        <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={setNow}>
          {t('now')}
        </Button>
      </div>

      {parsed.ok === false && input.trim() !== '' && (
        <p className="text-sm text-destructive">{t(`errors.${parsed.errorKey}` as never)}</p>
      )}
      {input.trim() === '' && (
        <p className="text-xs text-muted-foreground">
          {t.rich('hint', { strong: (chunks) => <strong>{chunks}</strong> })}
        </p>
      )}
    </div>
  );

  return (
    <ToolShell
      icon={IconCalendarTime}
      title={t('title')}
      description={t.rich('subtitle', {
        code: (chunks) => <code className="text-foreground">{chunks}</code>,
      })}
      toolbar={toolbar}
    >
      {parsed.ok && formatted && (
        <div className="min-h-0 flex-1 space-y-4 overflow-auto rounded-lg border border-border bg-card p-4">
          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('sections.unix')}
            </h2>
            <div className="space-y-2">
              <CopyField label={t('fields.seconds')} value={formatted.unixSeconds} copyTitle={t('copy')} />
              <CopyField label={t('fields.milliseconds')} value={formatted.unixMs} copyTitle={t('copy')} />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('sections.iso')}
            </h2>
            <div className="space-y-2">
              <CopyField label={t('fields.utc')} value={formatted.isoUtc} copyTitle={t('copy')} />
              <CopyField label={t('fields.local')} value={formatted.isoLocal} copyTitle={t('copy')} />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('sections.relative')}
            </h2>
            <CopyField label={t('fields.distance')} value={formatted.relative} copyTitle={t('copy')} />
          </div>

          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('sections.human')}
            </h2>
            <div className="space-y-2">
              <CopyField label={t('fields.utc')} value={formatted.utcDisplay} copyTitle={t('copy')} />
              <CopyField label={t('fields.local')} value={formatted.localDisplay} copyTitle={t('copy')} />
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
