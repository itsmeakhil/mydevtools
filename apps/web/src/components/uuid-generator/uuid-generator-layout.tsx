'use client';

import { useCallback, useMemo, useState } from 'react';
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
import { AlertCircle, Copy, Check, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  generateIds,
  MAX_BULK,
  type IdKind,
  type NamespacePreset,
} from '@/lib/generate-ids';

const KIND_OPTIONS: { value: IdKind; label: string; hint: string }[] = [
  { value: 'ulid', label: 'ULID', hint: 'Sortable, URL-safe 26-character identifier' },
  { value: 'uuid4', label: 'UUID v4', hint: 'Random (RFC 9562)' },
  { value: 'uuid7', label: 'UUID v7', hint: 'Time-ordered, Unix ms + random' },
  { value: 'uuid1', label: 'UUID v1', hint: 'MAC/time-based (RFC 9562)' },
  { value: 'uuid6', label: 'UUID v6', hint: 'Reordered Gregorian time-based' },
  { value: 'uuid3', label: 'UUID v3', hint: 'MD5 hash of name + namespace' },
  { value: 'uuid5', label: 'UUID v5', hint: 'SHA-1 hash of name + namespace' },
];

export function UuidGeneratorLayout() {
  const [kind, setKind] = useState<IdKind>('uuid4');
  const [count, setCount] = useState(10);
  const [name, setName] = useState('mydevtools');
  const [namespacePreset, setNamespacePreset] = useState<NamespacePreset>('DNS');
  const [customNamespace, setCustomNamespace] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const needsName = kind === 'uuid3' || kind === 'uuid5';
  const kindMeta = useMemo(() => KIND_OPTIONS.find((o) => o.value === kind), [kind]);

  const runGenerate = useCallback(() => {
    setError('');
    setCopied(false);
    try {
      const n = Number(count);
      const lines = generateIds({
        kind,
        count: Number.isFinite(n) ? n : 1,
        name,
        namespacePreset,
        customNamespace,
      });
      setOutput(lines.join('\n'));
    } catch (e) {
      setOutput('');
      setError(e instanceof Error ? e.message : 'Could not generate IDs.');
    }
  }, [kind, count, name, namespacePreset, customNamespace]);

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ids-${kind}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">UUID / ULID generator</h1>
        <p className="text-xs text-muted-foreground">
          Generate RFC 9562 UUIDs or ULIDs in the browser. Bulk export up to {MAX_BULK.toLocaleString()}{' '}
          per run.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        <Card className="flex flex-col gap-4 p-4 overflow-auto">
          <div className="space-y-2">
            <Label htmlFor="id-kind" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Format
            </Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as IdKind)}
            >
              <SelectTrigger id="id-kind" className="font-mono text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="font-mono text-sm">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {kindMeta && (
              <p className="text-[11px] text-muted-foreground leading-snug">{kindMeta.hint}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="id-count" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Count (1–{MAX_BULK.toLocaleString()})
            </Label>
            <Input
              id="id-count"
              type="number"
              min={1}
              max={MAX_BULK}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="font-mono text-sm"
            />
          </div>

          {needsName && (
            <>
              <div className="space-y-2">
                <Label htmlFor="id-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name (input string)
                </Label>
                <Input
                  id="id-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. my.app/resource"
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Bulk runs append <code className="text-foreground">#0</code>,{' '}
                  <code className="text-foreground">#1</code>, … so each ID is distinct (v3/v5 are
                  deterministic).
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Namespace
                </Label>
                <Select
                  value={namespacePreset}
                  onValueChange={(v) => setNamespacePreset(v as NamespacePreset)}
                >
                  <SelectTrigger className="font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DNS">DNS (RFC 4122)</SelectItem>
                    <SelectItem value="URL">URL (RFC 4122)</SelectItem>
                    <SelectItem value="custom">Custom UUID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {namespacePreset === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="id-ns-custom" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Namespace UUID
                  </Label>
                  <Input
                    id="id-ns-custom"
                    value={customNamespace}
                    onChange={(e) => setCustomNamespace(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" onClick={runGenerate} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Generate
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden min-h-[280px]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30 gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Output
            </Label>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground tabular-nums mr-1">
                {output ? output.split('\n').length.toLocaleString() : 0} lines
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleDownload}
                disabled={!output}
                title="Download .txt"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
                disabled={!output}
                title="Copy all"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className={cn('flex flex-col items-center gap-2 text-destructive max-w-sm text-center')}>
                  <AlertCircle className="h-6 w-6 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            ) : (
              <textarea
                value={output}
                readOnly
                placeholder='Click "Generate"…'
                className="absolute inset-0 w-full h-full resize-none bg-transparent p-4 text-sm font-mono focus:outline-none placeholder:text-muted-foreground/50"
                spellCheck={false}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
