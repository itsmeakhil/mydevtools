'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs';
import { ToolShell } from '@/components/tools/tool-shell';
import { ToolPanels, IOPanel, ToolTextArea } from '@/components/tools/io-panel';

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

  const diffResult = (
    <IOPanel
      label={t('comparisonLabel')}
      actions={statsBadge || undefined}
      className="flex-1 min-h-[280px]"
      bodyClassName="flex min-h-0 flex-col overflow-hidden"
    >
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
                {row.left === '' ? ' ' : row.left}
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
                {row.right === '' ? ' ' : row.right}
              </pre>
            </div>
          ))}
          {!overLimit && rows.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">{t('emptyState')}</p>
          )}
        </div>
      </div>
    </IOPanel>
  );

  const toolbar = (
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
  );

  return (
    <ToolShell
      icon={IconGitCompare}
      title={t('title')}
      description={t('subtitle')}
      toolbar={toolbar}
    >
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
              <IOPanel label={t('original')} className="flex-1">
                <ToolTextArea
                  id="diff-left"
                  value={leftText}
                  onChange={(e) => setLeftText(e.target.value)}
                  placeholder={t('originalPlaceholder')}
                />
              </IOPanel>
            )}
            {mobileTab === 'modified' && (
              <IOPanel label={t('modified')} className="flex-1">
                <ToolTextArea
                  id="diff-right"
                  value={rightText}
                  onChange={(e) => setRightText(e.target.value)}
                  placeholder={t('modifiedPlaceholder')}
                />
              </IOPanel>
            )}
            {mobileTab === 'diff' && diffResult}
          </div>
        </>
      ) : (
        /* ── Desktop: stacked inputs + full diff below ── */
        <>
          <ToolPanels className="lg:grid-cols-2 flex-none shrink-0 min-h-[160px]">
            <IOPanel label={t('original')}>
              <ToolTextArea
                id="diff-left"
                value={leftText}
                onChange={(e) => setLeftText(e.target.value)}
                placeholder={t('originalPlaceholder')}
              />
            </IOPanel>
            <IOPanel label={t('modified')}>
              <ToolTextArea
                id="diff-right"
                value={rightText}
                onChange={(e) => setRightText(e.target.value)}
                placeholder={t('modifiedPlaceholder')}
              />
            </IOPanel>
          </ToolPanels>
          {diffResult}
        </>
      )}
    </ToolShell>
  );
}
