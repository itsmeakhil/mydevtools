'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatTimestampAll, parseTimestampInput } from '@/lib/timestamp-convert';
import { Check, Copy } from 'lucide-react';

function CopyField({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:w-28 shrink-0">
        {label}
      </span>
      <div className="flex flex-1 items-center gap-1 min-w-0">
        <Input readOnly value={value} className="font-mono text-xs h-8 flex-1 min-w-0" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          title="Copy"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }}
        >
          {done ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export function TimestampConverterLayout() {
  const [input, setInput] = useState('');

  const parsed = useMemo(() => parseTimestampInput(input), [input]);
  const formatted = useMemo(
    () => (parsed.ok ? formatTimestampAll(parsed.date) : null),
    [parsed]
  );

  const setNow = () => setInput(String(Date.now()));

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Timestamp converter</h1>
        <p className="text-xs text-muted-foreground">
          Unix seconds (≤10 digits) or milliseconds (longer integers),{' '}
          <code className="text-foreground">ISO-8601</code>, or strings your browser can parse. Everything
          runs locally.
        </p>
      </div>

      <Card className="p-4 space-y-3 shrink-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2 min-w-0">
            <Label htmlFor="ts-input" className="text-xs text-muted-foreground uppercase tracking-wider">
              Input
            </Label>
            <Input
              id="ts-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="1744200000 or 2025-04-09T12:00:00Z"
              spellCheck={false}
              className="font-mono text-sm"
            />
          </div>
          <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={setNow}>
            Now
          </Button>
        </div>

        {parsed.ok === false && input.trim() !== '' && (
          <p className="text-sm text-destructive">{parsed.error}</p>
        )}
        {input.trim() === '' && (
          <p className="text-xs text-muted-foreground">Paste a value or click <strong>Now</strong>.</p>
        )}
      </Card>

      {parsed.ok && formatted && (
        <Card className="p-4 space-y-4 flex-1 min-h-0 overflow-auto">
          <div>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Unix
            </h2>
            <div className="space-y-2">
              <CopyField label="Seconds" value={formatted.unixSeconds} />
              <CopyField label="Milliseconds" value={formatted.unixMs} />
            </div>
          </div>

          <div>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              ISO
            </h2>
            <div className="space-y-2">
              <CopyField label="UTC" value={formatted.isoUtc} />
              <CopyField label="Local" value={formatted.isoLocal} />
            </div>
          </div>

          <div>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Relative
            </h2>
            <CopyField label="Distance" value={formatted.relative} />
          </div>

          <div>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Human-readable
            </h2>
            <div className="space-y-2">
              <CopyField label="UTC" value={formatted.utcDisplay} />
              <CopyField label="Local" value={formatted.localDisplay} />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
