'use client';

import type { KeywordCase, SqlLanguage } from 'sql-formatter';
import { useCallback, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/components/hooks/use-mobile';
import { IconSql } from '@tabler/icons-react';
import { ToolShell } from '@/components/tools/tool-shell';
import { IOPanel } from '@/components/tools/io-panel';
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs';
import { CopyIconButton } from '@/components/tools/copy-icon-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Trash2, Wand2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import CodeEditor from '@/components/ui/code-editor';

const DIALECTS: { value: SqlLanguage; key: 'mysql' | 'postgresql' | 'sqlite' }[] = [
  { value: 'mysql', key: 'mysql' },
  { value: 'postgresql', key: 'postgresql' },
  { value: 'sqlite', key: 'sqlite' },
];

const KEYWORD_CASES: { value: KeywordCase; key: 'upper' | 'lower' | 'preserve' }[] = [
  { value: 'upper', key: 'upper' },
  { value: 'lower', key: 'lower' },
  { value: 'preserve', key: 'preserve' },
];

const SAMPLE = `select u.id, u.email, count(o.id) as order_count from users u left join orders o on o.user_id = u.id where u.created_at > '2024-01-01' group by u.id, u.email having count(o.id) > 0 order by order_count desc limit 10;`;

const MAX_LEN = 500_000;

export function SqlFormatterLayout() {
  const t = useTranslations('SqlFormatter');
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<'input' | 'output'>('input');
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [dialect, setDialect] = useState<SqlLanguage>('postgresql');
  const [keywordCase, setKeywordCase] = useState<KeywordCase>('upper');
  const [tabWidth, setTabWidth] = useState('2');
  const [error, setError] = useState('');
  const { isCopied: copied, copyToClipboard, reset: resetCopied } = useCopyToClipboard();

  const runFormat = useCallback(async () => {
    setError('');
    resetCopied();
    if (isMobile) setMobileTab('output');
    const q = input;
    if (!q.trim()) {
      setOutput('');
      return;
    }
    if (q.length > MAX_LEN) {
      setError(t('errors.tooLong', { max: MAX_LEN.toLocaleString() }));
      setOutput('');
      return;
    }
    try {
      const tw = Math.min(8, Math.max(1, parseInt(tabWidth, 10) || 2));
      // sql-formatter is ~278KB; load on first format so the tool page paints without it.
      const { format } = await import('sql-formatter');
      setOutput(
        format(q, {
          language: dialect,
          keywordCase,
          tabWidth: tw,
          linesBetweenQueries: 2,
        })
      );
    } catch (e) {
      setOutput('');
      setError(e instanceof Error ? e.message : t('errors.couldNotFormat'));
    }
  }, [input, dialect, keywordCase, tabWidth, t, resetCopied, isMobile]);

  const handleCopy = () => {
    if (!output) return;
    void copyToClipboard(output, { silent: true });
  };

  const toolbar = (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full space-y-2 sm:w-auto sm:min-w-[140px]">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('dialectLabel')}</Label>
          <Select value={dialect} onValueChange={(v) => setDialect(v as SqlLanguage)}>
            <SelectTrigger className="h-9 w-full text-sm sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIALECTS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {t(`dialects.${d.key}` as never)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full space-y-2 sm:w-auto sm:min-w-[120px]">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('keywordsLabel')}</Label>
          <Select value={keywordCase} onValueChange={(v) => setKeywordCase(v as KeywordCase)}>
            <SelectTrigger className="h-9 w-full text-sm sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KEYWORD_CASES.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {t(`keywordCase.${k.key}` as never)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full space-y-2 sm:w-auto sm:min-w-[80px]">
          <Label htmlFor="sql-tab" className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('indentLabel')}
          </Label>
          <Select value={tabWidth} onValueChange={setTabWidth}>
            <SelectTrigger id="sql-tab" className="h-9 w-full text-sm sm:w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['2', '4'].map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 pb-0.5">
          <Button type="button" size="sm" className="h-9 gap-1.5" onClick={runFormat}>
            <Wand2 className="h-3.5 w-3.5" />
            {t('format')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => {
              setInput('');
              setOutput('');
              setError('');
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('clear')}
          </Button>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {t('counter', { current: input.length.toLocaleString(), max: MAX_LEN.toLocaleString() })}
      </p>
    </div>
  );

  return (
    <ToolShell icon={IconSql} title={t('title')} description={t('subtitle')} toolbar={toolbar}>
      {error && (
        <div className="mb-4 flex shrink-0 items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {isMobile && (
        <ToolMobileTabs
          value={mobileTab}
          onValueChange={setMobileTab}
          tabs={[
            { value: 'input', label: t('inputPanel') },
            { value: 'output', label: t('formattedPanel') },
          ]}
        />
      )}

      <div
        className={cn(
          'min-h-0 flex-1',
          isMobile ? 'mt-4 flex flex-col' : 'grid grid-cols-1 gap-4 lg:grid-cols-2',
        )}
      >
        {(!isMobile || mobileTab === 'input') && (
          <IOPanel label={t('inputPanel')} bodyClassName="p-1" className="min-h-[220px] flex-1">
            <CodeEditor value={input} onChange={setInput} language="sql" />
          </IOPanel>
        )}

        {(!isMobile || mobileTab === 'output') && (
          <IOPanel
            label={t('formattedPanel')}
            bodyClassName="p-1"
            className="min-h-[220px] flex-1"
            actions={
              <CopyIconButton onCopy={handleCopy} copied={copied} disabled={!output} label={t('copy')} />
            }
          >
            <CodeEditor value={output} readOnly language="sql" />
          </IOPanel>
        )}
      </div>
    </ToolShell>
  );
}
