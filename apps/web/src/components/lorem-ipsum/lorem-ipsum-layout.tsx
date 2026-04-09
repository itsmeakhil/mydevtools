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
import { Switch } from '@/components/ui/switch';
import { Copy, Check, Download, RefreshCw } from 'lucide-react';
import {
  generateLorem,
  LOREM_LIMITS,
  type LoremUnit,
} from '@/lib/lorem-ipsum';

const UNIT_OPTIONS: { value: LoremUnit; label: string; hint: string }[] = [
  { value: 'paragraphs', label: 'Paragraphs', hint: 'Separated by blank lines (plain) or <p> tags (HTML)' },
  { value: 'sentences', label: 'Sentences', hint: 'Flowing prose built from classical sentences' },
  { value: 'words', label: 'Words', hint: 'Exact word count, cycling the corpus' },
  { value: 'list', label: 'Bullet list', hint: 'One sentence per item (markdown-style dash or <ul>)' },
];

export function LoremIpsumLayout() {
  const [unit, setUnit] = useState<LoremUnit>('paragraphs');
  const [count, setCount] = useState(3);
  const [asHtml, setAsHtml] = useState(false);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const limits = LOREM_LIMITS[unit];
  const unitMeta = useMemo(() => UNIT_OPTIONS.find((o) => o.value === unit), [unit]);

  const runGenerate = useCallback(() => {
    setCopied(false);
    const n = Number(count);
    setOutput(
      generateLorem({
        unit,
        count: Number.isFinite(n) ? n : limits.min,
        asHtml,
      })
    );
  }, [unit, count, asHtml, limits.min]);

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: asHtml ? 'text/html' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = asHtml ? 'lorem-ipsum.html' : 'lorem-ipsum.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Lorem Ipsum generator</h1>
        <p className="text-xs text-muted-foreground">
          Classical Latin placeholder text for mockups and layouts. Runs entirely in your browser.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        <Card className="flex flex-col gap-4 p-4 overflow-auto">
          <div className="space-y-2">
            <Label
              htmlFor="lorem-unit"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              Output type
            </Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as LoremUnit)}>
              <SelectTrigger id="lorem-unit" className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-sm">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {unitMeta && (
              <p className="text-[11px] text-muted-foreground leading-snug">{unitMeta.hint}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="lorem-count"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              Count ({limits.min}–{limits.max.toLocaleString()})
            </Label>
            <Input
              id="lorem-count"
              type="number"
              min={limits.min}
              max={limits.max}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
            <div className="space-y-0.5">
              <Label htmlFor="lorem-html" className="text-sm font-medium cursor-pointer">
                HTML markup
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Wrap output in paragraphs, or use a list for bullet mode
              </p>
            </div>
            <Switch id="lorem-html" checked={asHtml} onCheckedChange={setAsHtml} />
          </div>

          <Button type="button" onClick={runGenerate} className="gap-1.5 w-fit">
            <RefreshCw className="h-3.5 w-3.5" />
            Generate
          </Button>
        </Card>

        <Card className="flex flex-col overflow-hidden min-h-[280px]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30 gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Output
            </Label>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground tabular-nums mr-1">
                {output ? `${output.length.toLocaleString()} chars` : '—'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleDownload}
                disabled={!output}
                title="Download"
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
                title="Copy"
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
            <textarea
              value={output}
              readOnly
              placeholder='Choose options and click "Generate"…'
              className="absolute inset-0 w-full h-full resize-none bg-transparent p-4 text-sm leading-relaxed focus:outline-none placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
