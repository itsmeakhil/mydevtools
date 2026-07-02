'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  buildFlagString,
  findMatchRanges,
  mergeRanges,
  MAX_TEST_TEXT_LENGTH,
} from '@/lib/regex-tester';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { IconRegex } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('RegexTester');
  const [pattern, setPattern] = useState('');
  const [testText, setTestText] = useState(
    t('sampleText')
  );
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [activeMatch, setActiveMatch] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  const totalMatches = result.ok ? result.ranges.length : 0;
  const clampedActiveMatch = totalMatches > 0 ? Math.min(activeMatch, totalMatches - 1) : 0;

  // Reset match navigation when the search changes — React's "adjust state during render" pattern, not an effect.
  const resetKey = `${pattern}\u0000${flagString}\u0000${testText}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    if (activeMatch !== 0) setActiveMatch(0);
  }

  const goToMatch = (index: number) => {
    if (!result.ok || totalMatches === 0) return;
    const next = (index + totalMatches) % totalMatches;
    setActiveMatch(next);
    const range = result.ranges[next]!;
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(range.start, range.end);
    }
  };

  return (
    <div className="relative flex flex-col h-full gap-4 min-h-0 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader icon={IconRegex} title={t('title')} description={t('subtitle')} />
      </RevealItem>

      <Card className="p-4 space-y-3 shrink-0">
        <div className="space-y-2">
          <Label htmlFor="regex-pattern" className="text-xs text-muted-foreground uppercase tracking-wider">
            {t('patternLabel')}
          </Label>
          <Input
            id="regex-pattern"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder={t('patternPlaceholder')}
            spellCheck={false}
            className="font-mono text-sm"
          />
        </div>

        <TooltipProvider>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <FlagBox id="flg-g" checked={global} onCheckedChange={setGlobal} label={t('flags.g')} title={t('flags.gTitle')} />
            <FlagBox id="flg-i" checked={ignoreCase} onCheckedChange={setIgnoreCase} label={t('flags.i')} title={t('flags.iTitle')} />
            <FlagBox id="flg-m" checked={multiline} onCheckedChange={setMultiline} label={t('flags.m')} title={t('flags.mTitle')} />
            <FlagBox id="flg-s" checked={dotAll} onCheckedChange={setDotAll} label={t('flags.s')} title={t('flags.sTitle')} />
            <FlagBox id="flg-u" checked={unicode} onCheckedChange={setUnicode} label={t('flags.u')} title={t('flags.uTitle')} />
          </div>
        </TooltipProvider>

        <p className="text-[11px] text-muted-foreground font-mono">
          /{pattern || t('emptyPattern')}/{flagString || t('noFlags')}
        </p>

        {result.ok === false && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              {result.errorKey === 'invalid'
                ? t('errors.invalid')
                : t(`errors.${result.errorKey}` as never, result.errorVars as never)}
            </p>
            {result.errorKey === 'invalid' && result.detail ? (
              <p className="text-xs text-destructive/80 font-mono mt-1">{result.detail}</p>
            ) : null}
          </div>
        )}

        {result.ok && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground tabular-nums">{result.matchCount}</span>{' '}
              {t('matches', { count: result.matchCount })}
            </p>
            {totalMatches > 1 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t('matchNav.position', { current: clampedActiveMatch + 1, total: totalMatches })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label={t('matchNav.prev')}
                  onClick={() => goToMatch(clampedActiveMatch - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label={t('matchNav.next')}
                  onClick={() => goToMatch(clampedActiveMatch + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30 shrink-0">
          <Label htmlFor="regex-text" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('testTextLabel')}
          </Label>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'text-[10px] tabular-nums',
                overLimit ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {t('counter', {
                current: testText.length.toLocaleString(),
                max: MAX_TEST_TEXT_LENGTH.toLocaleString(),
              })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setTestText('')}
            >
              <Trash2 className="h-3 w-3" />
              {t('clear')}
            </Button>
          </div>
        </div>

        <div className="relative flex-1 min-h-[140px] sm:min-h-[220px] font-mono text-sm leading-6">
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
            ref={textareaRef}
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            onScroll={(e) => {
              setScrollTop(e.currentTarget.scrollTop);
              setScrollLeft(e.currentTarget.scrollLeft);
            }}
            spellCheck={false}
            className="relative z-10 box-border h-full min-h-[140px] sm:min-h-[220px] w-full resize-none bg-transparent p-3 text-transparent caret-foreground selection:bg-primary/25 focus:outline-none leading-6"
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
  title,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  title: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
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
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}
