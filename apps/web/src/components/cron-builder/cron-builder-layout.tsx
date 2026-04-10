'use client';

import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { AlertCircle, Check, Copy } from 'lucide-react';

const MINUTE_PICKS = [
  { value: '*', label: '* (every minute)' },
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

const HOUR_PICKS = [
  { value: '*', label: '* (every hour)' },
  { value: '*/2', label: '*/2' },
  { value: '*/3', label: '*/3' },
  { value: '*/6', label: '*/6' },
  { value: '*/12', label: '*/12' },
  ...Array.from({ length: 24 }, (_, h) => ({
    value: String(h),
    label: String(h),
  })),
];

const DOM_PICKS = [
  { value: '*', label: '* (any day)' },
  { value: 'L', label: 'L (last day)' },
  ...Array.from({ length: 31 }, (_, d) => ({
    value: String(d + 1),
    label: String(d + 1),
  })),
];

const MONTH_PICKS = [
  { value: '*', label: '* (every month)' },
  { value: '1', label: 'Jan' },
  { value: '2', label: 'Feb' },
  { value: '3', label: 'Mar' },
  { value: '4', label: 'Apr' },
  { value: '5', label: 'May' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Jul' },
  { value: '8', label: 'Aug' },
  { value: '9', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
];

const DOW_PICKS = [
  { value: '*', label: '* (any weekday)' },
  { value: '0', label: '0 Sun' },
  { value: '1', label: '1 Mon' },
  { value: '2', label: '2 Tue' },
  { value: '3', label: '3 Wed' },
  { value: '4', label: '4 Thu' },
  { value: '5', label: '5 Fri' },
  { value: '6', label: '6 Sat' },
  { value: '1-5', label: '1–5 weekdays' },
  { value: '0,6', label: '0,6 weekend' },
];

const PICKS = [MINUTE_PICKS, HOUR_PICKS, DOM_PICKS, MONTH_PICKS, DOW_PICKS];

function QuickPick({
  options,
  onPick,
}: {
  options: { value: string; label: string }[];
  onPick: (v: string) => void;
}) {
  return (
    <Select onValueChange={onPick}>
      <SelectTrigger className="h-8 w-[min(100%,11rem)] text-xs shrink-0">
        <SelectValue placeholder="Quick pick" />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {options.map((o) => (
          <SelectItem key={`${o.value}-${o.label}`} value={o.value} className="text-xs font-mono">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CronBuilderLayout() {
  const [expression, setExpression] = useState('0 * * * *');
  const [rawDraft, setRawDraft] = useState('0 * * * *');
  const [copied, setCopied] = useState(false);

  const commitExpression = (next: string) => {
    const t = next.trim();
    setExpression(t);
    setRawDraft(t);
  };

  const validation = useMemo(() => validateCron(expression), [expression]);
  const human = useMemo(() => (validation.ok ? describeCron(expression) : null), [expression, validation.ok]);
  const nextRuns = useMemo(
    () => (validation.ok ? getNextRunDates(expression, 6) : null),
    [expression, validation.ok]
  );

  const five = useMemo(() => getFiveFieldParts(expression), [expression]);
  const tokenCount = useMemo(() => tokenizeCron(expression).length, [expression]);

  const updateField = (index: 0 | 1 | 2 | 3 | 4, value: string) => {
    commitExpression(setFiveFieldAt(expression, index, value));
  };

  const copyExpr = async () => {
    await navigator.clipboard.writeText(expression.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full gap-4 min-h-0 overflow-auto">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Cron expression builder</h1>
        <p className="text-xs text-muted-foreground">
          Standard 5-field cron: <span className="font-mono text-foreground">minute hour day month weekday</span>.
          Parser uses seconds=<code className="text-foreground">0</code> internally. Optional 6-field (
          <span className="font-mono">sec min hour dom mon dow</span>) works in the expression editor.
        </p>
      </div>

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
            Visual builder
          </TabsTrigger>
          <TabsTrigger value="expression" className="text-xs">
            Expression
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-0 space-y-4">
          <Card className="p-4 space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Presets</Label>
            <div className="flex flex-wrap gap-2">
              {CRON_PRESETS.map((p) => (
                <Button
                  key={p.cron}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => commitExpression(p.cron)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Fields</Label>
            <div className="space-y-3">
              {CRON_FIELD_LABELS.map((label, i) => {
                const idx = i as 0 | 1 | 2 | 3 | 4;
                return (
                  <div
                    key={label}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="text-xs font-medium text-muted-foreground w-36 shrink-0">
                      {label}
                    </span>
                    <Input
                      value={five[idx]}
                      onChange={(e) => updateField(idx, e.target.value)}
                      className="font-mono text-sm h-9 flex-1 min-w-0"
                      spellCheck={false}
                      aria-label={label}
                    />
                    <QuickPick options={PICKS[idx]!} onPick={(v) => updateField(idx, v)} />
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="expression" className="mt-0 space-y-3">
          <Card className="p-4 space-y-2">
            <Label htmlFor="cron-raw" className="text-xs text-muted-foreground uppercase tracking-wider">
              Raw expression
            </Label>
            <textarea
              id="cron-raw"
              value={rawDraft}
              onChange={(e) => setRawDraft(e.target.value)}
              onBlur={() => commitExpression(rawDraft)}
              spellCheck={false}
              className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">
              Blur the field to parse and sync the builder. {tokenCount} token{tokenCount === 1 ? '' : 's'}.
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="p-4 space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Current expression</Label>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={copyExpr}>
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            Copy
          </Button>
        </div>
        <p className="font-mono text-sm break-all rounded-md bg-muted/50 px-3 py-2">{expression.trim() || '—'}</p>
      </Card>

      {validation.ok === false && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{validation.error}</p>
        </div>
      )}

      {validation.ok && human && (
        <Card className="p-4 space-y-2 border-primary/20 bg-primary/5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Plain language</Label>
          <p className="text-sm leading-relaxed">{human}</p>
        </Card>
      )}

      {validation.ok && nextRuns && nextRuns.length > 0 && (
        <Card className="p-4 space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Next runs (local time)
          </Label>
          <ul className="space-y-1.5 text-sm font-mono text-muted-foreground">
            {nextRuns.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[10px] w-5 shrink-0 text-muted-foreground/70">{i + 1}.</span>
                <span className="text-foreground">{format(d, 'PPpp')}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
