'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  buildFlagString,
  findMatchRanges,
  mergeRanges,
  MAX_TEST_TEXT_LENGTH,
} from '@/lib/regex-tester';
import { cn } from '@/lib/utils';
import { AlertCircle, Trash2 } from 'lucide-react';

function HighlightedText({
  text,
  mergedRanges,
}: {
  text: string;
  mergedRanges: { start: number; end: number }[];
}): ReactNode {
  if (mergedRanges.length === 0) {
    return text.length > 0 ? text : '\u00a0';
  }

  const parts: ReactNode[] = [];
  let i = 0;
  let key = 0;

  for (const r of mergedRanges) {
    if (r.start > i) {
      parts.push(<span key={key++}>{text.slice(i, r.start)}</span>);
    }
    parts.push(
      <mark
        key={key++}
        className="rounded-sm bg-amber-300/90 px-0.5 text-foreground dark:bg-amber-500/45"
      >
        {text.slice(r.start, r.end)}
      </mark>
    );
    i = r.end;
  }

  if (i < text.length) {
    parts.push(<span key={key++}>{text.slice(i)}</span>);
  }

  return parts;
}

export function RegexTesterLayout() {
  const [pattern, setPattern] = useState('');
  const [testText, setTestText] = useState(
    'The quick brown fox jumps over the lazy dog.\nEmail: test@example.com\nIDs: abc-123, xyz_456'
  );
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const [global, setGlobal] = useState(true);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [multiline, setMultiline] = useState(false);
  const [dotAll, setDotAll] = useState(false);
  const [unicode, setUnicode] = useState(true);

  const flagString = useMemo(
    () =>
      buildFlagString({
        global,
        ignoreCase,
        multiline,
        dotAll,
        unicode,
      }),
    [global, ignoreCase, multiline, dotAll, unicode]
  );

  const result = useMemo(
    () => findMatchRanges(testText, pattern, flagString),
    [testText, pattern, flagString]
  );

  const mergedRanges = useMemo(() => {
    if (result.ok !== true) return [];
    return mergeRanges(result.ranges);
  }, [result]);

  const overLimit = testText.length > MAX_TEST_TEXT_LENGTH;

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Regex tester</h1>
        <p className="text-xs text-muted-foreground">
          Live JavaScript-style regex against your text. Matches are highlighted in the editor; nothing
          leaves your browser.
        </p>
      </div>

      <Card className="p-4 space-y-3 shrink-0">
        <div className="space-y-2">
          <Label htmlFor="regex-pattern" className="text-xs text-muted-foreground uppercase tracking-wider">
            Pattern
          </Label>
          <Input
            id="regex-pattern"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="[\w.-]+@[\w.-]+\.\w+"
            spellCheck={false}
            className="font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <FlagBox id="flg-g" checked={global} onCheckedChange={setGlobal} label="g global" />
          <FlagBox id="flg-i" checked={ignoreCase} onCheckedChange={setIgnoreCase} label="i ignore case" />
          <FlagBox id="flg-m" checked={multiline} onCheckedChange={setMultiline} label="m multiline" />
          <FlagBox id="flg-s" checked={dotAll} onCheckedChange={setDotAll} label="s dotAll" />
          <FlagBox id="flg-u" checked={unicode} onCheckedChange={setUnicode} label="u unicode" />
        </div>

        <p className="text-[11px] text-muted-foreground font-mono">
          /{pattern || '(empty)'}/{flagString || '—'}
        </p>

        {result.ok === false && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{result.error}</p>
          </div>
        )}

        {result.ok && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{result.matchCount}</span> match
            {result.matchCount === 1 ? '' : 'es'}
          </p>
        )}
      </Card>

      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30 shrink-0">
          <Label htmlFor="regex-text" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Test text
          </Label>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'text-[10px] tabular-nums',
                overLimit ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {testText.length.toLocaleString()} / {MAX_TEST_TEXT_LENGTH.toLocaleString()}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setTestText('')}
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </Button>
          </div>
        </div>

        <div className="relative flex-1 min-h-[220px] font-mono text-sm leading-6">
          <div
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-b-lg"
            aria-hidden
          >
            <div
              className="box-border min-h-full whitespace-pre-wrap break-words p-3 text-foreground leading-6"
              style={{
                transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
              }}
            >
              <HighlightedText text={testText} mergedRanges={mergedRanges} />
            </div>
          </div>
          <textarea
            id="regex-text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            onScroll={(e) => {
              setScrollTop(e.currentTarget.scrollTop);
              setScrollLeft(e.currentTarget.scrollLeft);
            }}
            spellCheck={false}
            className="relative z-10 box-border h-full min-h-[220px] w-full resize-none bg-transparent p-3 text-transparent caret-foreground selection:bg-primary/25 focus:outline-none leading-6"
          />
        </div>
      </Card>
    </div>
  );
}

function FlagBox({
  id,
  checked,
  onCheckedChange,
  label,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
      />
      <Label htmlFor={id} className="text-xs font-normal cursor-pointer">
        {label}
      </Label>
    </div>
  );
}
