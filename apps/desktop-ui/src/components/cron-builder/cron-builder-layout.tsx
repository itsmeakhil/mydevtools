'use client';

import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CRON_FIELD_LABELS,
  CRON_PRESETS,
  describeCron,
  getFiveFieldParts,
  getNextRunDates,
  setFiveFieldAt,
  tokenizeCron,
  validateCron,
} from '@/lib/cron-utils';
import { IconRepeat } from '@tabler/icons-react';
import { ToolShell } from '@/components/tools/tool-shell';
import { CopyTextButton } from '@/components/tools/copy-text-button';
import { ToolErrorBanner } from '@/components/tools/tool-error-banner';
import { useLocale, useTranslations } from 'next-intl';

function QuickPick({
  options,
  onPick,
  placeholder,
}: {
  options: { value: string; label: string }[];
  onPick: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Select onValueChange={onPick}>
      <SelectTrigger className="h-8 w-[min(100%,11rem)] shrink-0 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {options.map((o) => (
          <SelectItem key={`${o.value}-${o.label}`} value={o.value} className="font-mono text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CronBuilderLayout() {
  const t = useTranslations('CronBuilder');
  const locale = useLocale();
  const [expression, setExpression] = useState('0 * * * *');
  const [rawDraft, setRawDraft] = useState('0 * * * *');
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard();

  const commitExpression = (next: string) => {
    const t = next.trim();
    setExpression(t);
    setRawDraft(t);
  };

  const validation = useMemo(() => validateCron(expression), [expression]);
  const human = useMemo(
    () => (validation.ok ? describeCron(expression, locale) : null),
    [expression, validation.ok, locale]
  );
  const nextRuns = useMemo(
    () => (validation.ok ? getNextRunDates(expression, 6) : null),
    [expression, validation.ok]
  );

  const five = useMemo(() => getFiveFieldParts(expression), [expression]);
  const tokenCount = useMemo(() => tokenizeCron(expression).length, [expression]);

  const updateField = (index: 0 | 1 | 2 | 3 | 4, value: string) => {
    commitExpression(setFiveFieldAt(expression, index, value));
  };

  const copyExpr = () => {
    void copyToClipboard(expression.trim(), { silent: true, resetMs: 1500 });
  };

  const monthShort = useMemo(
    () => [
      t('months.jan'),
      t('months.feb'),
      t('months.mar'),
      t('months.apr'),
      t('months.may'),
      t('months.jun'),
      t('months.jul'),
      t('months.aug'),
      t('months.sep'),
      t('months.oct'),
      t('months.nov'),
      t('months.dec'),
    ],
    [t]
  );

  const weekdayShort = useMemo(
    () => [
      t('weekdays.sun'),
      t('weekdays.mon'),
      t('weekdays.tue'),
      t('weekdays.wed'),
      t('weekdays.thu'),
      t('weekdays.fri'),
      t('weekdays.sat'),
    ],
    [t]
  );

  const PICKS = useMemo(() => {
    const minutePicks = [
      { value: '*', label: `* (${t('picks.minute.every')})` },
      { value: '*/2', label: '*/2' },
      { value: '*/5', label: '*/5' },
      { value: '*/10', label: '*/10' },
      { value: '*/15', label: '*/15' },
      { value: '*/30', label: '*/30' },
      { value: '0', label: '0' },
      { value: '15', label: '15' },
      { value: '30', label: '30' },
      { value: '45', label: '45' },
    ];

    const hourPicks = [
      { value: '*', label: `* (${t('picks.hour.every')})` },
      { value: '*/2', label: '*/2' },
      { value: '*/3', label: '*/3' },
      { value: '*/6', label: '*/6' },
      { value: '*/12', label: '*/12' },
      ...Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: String(h) })),
    ];

    const domPicks = [
      { value: '*', label: `* (${t('picks.dom.any')})` },
      { value: 'L', label: `L (${t('picks.dom.last')})` },
      ...Array.from({ length: 31 }, (_, d) => ({ value: String(d + 1), label: String(d + 1) })),
    ];

    const monthPicks = [
      { value: '*', label: `* (${t('picks.month.every')})` },
      ...monthShort.map((m, i) => ({ value: String(i + 1), label: m })),
    ];

    const dowPicks = [
      { value: '*', label: `* (${t('picks.dow.any')})` },
      ...weekdayShort.map((w, i) => ({ value: String(i), label: `${i} ${w}` })),
      { value: '1-5', label: `1–5 ${t('picks.dow.weekdays')}` },
      { value: '0,6', label: `0,6 ${t('picks.dow.weekend')}` },
    ];

    return [minutePicks, hourPicks, domPicks, monthPicks, dowPicks] as const;
  }, [t, monthShort, weekdayShort]);

  return (
    <ToolShell
      icon={IconRepeat}
      title={t('title')}
      description={t.rich('subtitle', {
        mono: (chunks) => <span className="font-mono text-foreground">{chunks}</span>,
        code: (chunks) => <code className="text-foreground">{chunks}</code>,
      })}
      contentClassName="gap-4 overflow-auto"
    >
      <Tabs
        defaultValue="builder"
        className="flex flex-col gap-4"
        onValueChange={(tab) => {
          if (tab === 'builder') {
            commitExpression(rawDraft);
          }
        }}
      >
        <TabsList className="w-fit">
          <TabsTrigger value="builder" className="text-xs">
            {t('tabs.builder')}
          </TabsTrigger>
          <TabsTrigger value="expression" className="text-xs">
            {t('tabs.expression')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-0 space-y-4">
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('presetsLabel')}</Label>
            <div className="flex flex-wrap gap-2">
              {CRON_PRESETS.map((p) => (
                <Button
                  key={p.key}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => commitExpression(p.cron)}
                >
                  {t(`presets.${p.key}` as never)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('fieldsLabel')}</Label>
            <div className="space-y-3">
              {CRON_FIELD_LABELS.map((label, i) => {
                const idx = i as 0 | 1 | 2 | 3 | 4;
                const uiLabel = t(`fields.${label}` as never);
                return (
                  <div key={label} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <span className="w-36 shrink-0 text-xs font-medium text-muted-foreground">{uiLabel}</span>
                    <Input
                      value={five[idx]}
                      onChange={(e) => updateField(idx, e.target.value)}
                      className="h-9 min-w-0 flex-1 font-mono text-sm"
                      spellCheck={false}
                      aria-label={uiLabel}
                    />
                    <QuickPick options={PICKS[idx]!} onPick={(v) => updateField(idx, v)} placeholder={t('quickPick')} />
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="expression" className="mt-0 space-y-3">
          <div className="space-y-2 rounded-lg border border-border bg-card p-4">
            <Label htmlFor="cron-raw" className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('rawExpressionLabel')}
            </Label>
            <textarea
              id="cron-raw"
              value={rawDraft}
              onChange={(e) => setRawDraft(e.target.value)}
              onBlur={() => commitExpression(rawDraft)}
              spellCheck={false}
              className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">{t('expressionHint', { count: tokenCount })}</p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="shrink-0 space-y-2 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('currentExpressionLabel')}</Label>
          <CopyTextButton
            onCopy={copyExpr}
            copied={copied}
            label={t('copy')}
            copiedLabel={t('copy')}
            className="h-8 gap-1 text-xs"
          />
        </div>
        <p className="break-all rounded-md bg-muted/50 px-3 py-2 font-mono text-sm">
          {expression.trim() || t('emptyExpression')}
        </p>
      </div>

      {validation.ok === false && (
        <ToolErrorBanner
          message={
            <div className="space-y-1">
              <p>
                {validation.errorKey === 'invalid' ? t('errors.invalid') : t(`errors.${validation.errorKey}` as never)}
              </p>
              {validation.errorKey === 'invalid' && validation.detail ? (
                <p className="font-mono text-xs text-destructive/80">{validation.detail}</p>
              ) : null}
            </div>
          }
        />
      )}

      {validation.ok && human && (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('plainLanguageLabel')}</Label>
          <p className="text-sm leading-relaxed">{human}</p>
        </div>
      )}

      {validation.ok && nextRuns && nextRuns.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('nextRunsLabel')}</Label>
          <ul className="space-y-1.5 font-mono text-sm text-muted-foreground">
            {nextRuns.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-5 shrink-0 text-[10px] text-muted-foreground/70">{i + 1}.</span>
                <span className="text-foreground">{format(d, 'PPpp')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ToolShell>
  );
}
