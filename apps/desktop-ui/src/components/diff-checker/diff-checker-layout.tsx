'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  buildLineDiffRows,
  countDiffRows,
  DIFF_MAX_INPUT_CHARS,
  DIFF_MAX_ROWS,
} from '@/lib/text-diff';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useIsMobile } from '@/components/hooks/use-mobile';
import { IconGitCompare } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';

const SAMPLE_A = `function greet(name) {
  console.log("Hello, " + name);
  return true;
}`;

const SAMPLE_B = `function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return false;
}`;

function rowBg(kind: string) {
  if (kind === 'removed') return 'bg-rose-500/12 dark:bg-rose-500/20';
  if (kind === 'added') return 'bg-emerald-500/12 dark:bg-emerald-500/20';
  return 'bg-transparent';
}

export function DiffCheckerLayout() {
  const t = useTranslations('DiffChecker');
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<'original' | 'modified' | 'diff'>('original');
  const [leftText, setLeftText] = useState(SAMPLE_A);
  const [rightText, setRightText] = useState(SAMPLE_B);

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const syncLock = useRef(false);

  const syncScroll = useCallback((source: 'left' | 'right', scrollTop: number) => {
    if (syncLock.current) return;
    syncLock.current = true;
    const other = source === 'left' ? rightScrollRef.current : leftScrollRef.current;
    if (other) other.scrollTop = scrollTop;
    requestAnimationFrame(() => {
      syncLock.current = false;
    });
  }, []);

  const overLimit = leftText.length > DIFF_MAX_INPUT_CHARS || rightText.length > DIFF_MAX_INPUT_CHARS;

  const { rows, truncated, stats } = useMemo(() => {
    if (overLimit) {
      return { rows: [], truncated: false, stats: { added: 0, removed: 0 } };
    }
    const all = buildLineDiffRows(leftText, rightText);
    const statsFull = countDiffRows(all);
    const truncatedInner = all.length > DIFF_MAX_ROWS;
    const slice = truncatedInner ? all.slice(0, DIFF_MAX_ROWS) : all;
    return {
      rows: slice,
      truncated: truncatedInner,
      stats: statsFull,
    };
  }, [leftText, rightText, overLimit]);

  const clearAll = () => {
    setLeftText('');
    setRightText('');
  };

  const statsBadge = !overLimit && rows.length > 0 && (
    <span className="text-muted-foreground">
      <span className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
        +{stats.added}
      </span>
      {' · '}
      <span className="text-rose-600 dark:text-rose-400 font-medium tabular-nums">
        −{stats.removed}
      </span>
    </span>
  );

  const diffPanel = (
    <Card className="flex flex-col flex-1 min-h-[280px] overflow-hidden p-0">
      <div className="px-3 py-2 border-b border-border/50 bg-muted/30 shrink-0 flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('comparisonLabel')}
        </Label>
        {statsBadge}
      </div>
      <div className="flex flex-col md:flex-row flex-1 min-h-0 divide-y md:divide-y-0 md:divide-x divide-border">
        <div
          ref={leftScrollRef}
          onScroll={(e) => syncScroll('left', e.currentTarget.scrollTop)}
          className="flex-1 min-w-0 overflow-auto font-mono text-xs leading-5"
        >
          {rows.map((row, i) => (
            <div
              key={`l-${i}`}
              className={cn(
                'flex border-b border-border/30',
                rowBg(row.kind === 'added' ? 'equal' : row.kind)
              )}
            >
              <span className="w-9 shrink-0 select-none text-right pr-2 py-0.5 text-muted-foreground/60 border-r border-border/30 bg-muted/20 tabular-nums">
                {i + 1}
              </span>
              <pre className="flex-1 py-0.5 pl-2 pr-2 whitespace-pre-wrap break-all m-0 bg-transparent">
                {row.left === '' ? '\u00a0' : row.left}
              </pre>
            </div>
          ))}
          {!overLimit && rows.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">{t('emptyState')}</p>
          )}
        </div>
        <div
          ref={rightScrollRef}
          onScroll={(e) => syncScroll('right', e.currentTarget.scrollTop)}
          className="flex-1 min-w-0 overflow-auto font-mono text-xs leading-5"
        >
          {rows.map((row, i) => (
            <div
              key={`r-${i}`}
              className={cn(
                'flex border-b border-border/30',
                rowBg(row.kind === 'removed' ? 'equal' : row.kind)
              )}
            >
              <span className="w-9 shrink-0 select-none text-right pr-2 py-0.5 text-muted-foreground/60 border-r border-border/30 bg-muted/20 tabular-nums">
                {i + 1}
              </span>
              <pre className="flex-1 py-0.5 pl-2 pr-2 whitespace-pre-wrap break-all m-0 bg-transparent">
                {row.right === '' ? '\u00a0' : row.right}
              </pre>
            </div>
          ))}
          {!overLimit && rows.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">{t('emptyState')}</p>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="relative flex flex-col h-full gap-4 min-h-0 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader icon={IconGitCompare} title={t('title')} description={t('subtitle')} offline={false} />
      </RevealItem>

      {/* Status + clear row */}
      <div className="flex flex-wrap items-center gap-3 text-xs shrink-0">
        {truncated && (
          <span className="text-amber-600 dark:text-amber-400">
            {t('truncatedWarning', { max: DIFF_MAX_ROWS.toLocaleString() })}
          </span>
        )}
        {overLimit && (
          <span className="text-destructive">
            {t('limitExceeded', { max: DIFF_MAX_INPUT_CHARS.toLocaleString() })}
          </span>
        )}
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1 ml-auto" onClick={clearAll}>
          <Trash2 className="h-3 w-3" />
          {t('clearBoth')}
        </Button>
      </div>

      {isMobile ? (
        /* ── Mobile: 3-tab layout (Original / Modified / Diff) ── */
        <>
          <ToolMobileTabs
            value={mobileTab}
            onValueChange={setMobileTab}
            tabs={[
              { value: 'original', label: t('original') },
              { value: 'modified', label: t('modified') },
              { value: 'diff', label: t('comparisonLabel') },
            ]}
          />

          <div className="flex-1 min-h-0 flex flex-col">
            {mobileTab === 'original' && (
              <Card className="flex flex-col flex-1 overflow-hidden">
                <textarea
                  id="diff-left"
                  value={leftText}
                  onChange={(e) => setLeftText(e.target.value)}
                  spellCheck={false}
                  className="flex-1 resize-none w-full bg-transparent p-3 text-sm font-mono focus:outline-none"
                  placeholder={t('originalPlaceholder')}
                />
              </Card>
            )}
            {mobileTab === 'modified' && (
              <Card className="flex flex-col flex-1 overflow-hidden">
                <textarea
                  id="diff-right"
                  value={rightText}
                  onChange={(e) => setRightText(e.target.value)}
                  spellCheck={false}
                  className="flex-1 resize-none w-full bg-transparent p-3 text-sm font-mono focus:outline-none"
                  placeholder={t('modifiedPlaceholder')}
                />
              </Card>
            )}
            {mobileTab === 'diff' && diffPanel}
          </div>
        </>
      ) : (
        /* ── Desktop: stacked inputs + full diff below ── */
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0 min-h-[160px]">
            <Card className="flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
                <Label htmlFor="diff-left" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('original')}
                </Label>
              </div>
              <textarea
                id="diff-left"
                value={leftText}
                onChange={(e) => setLeftText(e.target.value)}
                spellCheck={false}
                className="min-h-[160px] flex-1 resize-y w-full bg-transparent p-3 text-sm font-mono focus:outline-none"
                placeholder={t('originalPlaceholder')}
              />
            </Card>
            <Card className="flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
                <Label htmlFor="diff-right" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('modified')}
                </Label>
              </div>
              <textarea
                id="diff-right"
                value={rightText}
                onChange={(e) => setRightText(e.target.value)}
                spellCheck={false}
                className="min-h-[160px] flex-1 resize-y w-full bg-transparent p-3 text-sm font-mono focus:outline-none"
                placeholder={t('modifiedPlaceholder')}
              />
            </Card>
          </div>
          {diffPanel}
        </>
      )}
    </div>
  );
}
