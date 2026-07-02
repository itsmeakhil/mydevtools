'use client';

import { format, type KeywordCase, type SqlLanguage } from 'sql-formatter';
import { useCallback, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/components/hooks/use-mobile';
import { IconSql } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs';
import { CopyIconButton } from '@/components/tools/copy-icon-button';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Trash2, Wand2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
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

  const runFormat = useCallback(() => {
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

  return (
    <div className="relative flex flex-col h-full gap-4 min-h-0 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader icon={IconSql} title={t('title')} description={t('subtitle')} />
      </RevealItem>

      <Card className="p-4 shrink-0">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2 w-full sm:w-auto sm:min-w-[140px]">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t('dialectLabel')}</Label>
            <Select value={dialect} onValueChange={(v) => setDialect(v as SqlLanguage)}>
              <SelectTrigger className="h-9 text-sm w-full sm:w-[180px]">
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
          <div className="space-y-2 w-full sm:w-auto sm:min-w-[120px]">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t('keywordsLabel')}</Label>
            <Select value={keywordCase} onValueChange={(v) => setKeywordCase(v as KeywordCase)}>
              <SelectTrigger className="h-9 text-sm w-full sm:w-[140px]">
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
          <div className="space-y-2 w-full sm:w-auto sm:min-w-[80px]">
            <Label htmlFor="sql-tab" className="text-xs text-muted-foreground uppercase tracking-wider">
              {t('indentLabel')}
            </Label>
            <Select value={tabWidth} onValueChange={setTabWidth}>
              <SelectTrigger id="sql-tab" className="h-9 text-sm w-full sm:w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['2', '4'].map((n) => (
                  <SelectItem key={n} value={n}>
                    {t('spaces', { n })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 pb-0.5">
            <Button type="button" variant="gradient" size="sm" className="gap-1.5 h-9" onClick={runFormat}>
              <Wand2 className="h-3.5 w-3.5" />
              {t('format')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
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
        <p className="text-[11px] text-muted-foreground mt-3">
          {t('counter', { current: input.length.toLocaleString(), max: MAX_LEN.toLocaleString() })}
        </p>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive shrink-0">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
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

      <div className={`flex-1 ${isMobile ? 'flex flex-col min-h-0' : 'grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0'}`}>
        {(!isMobile || mobileTab === 'input') && (
          <Card className="flex flex-col overflow-hidden min-h-[220px] flex-1">
            <div className="px-4 py-2.5 border-b border-border/50 bg-muted/30">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('inputPanel')}
              </Label>
            </div>
            <div className="flex-1 min-h-0 relative p-1">
              <CodeEditor
                value={input}
                onChange={setInput}
                language="sql"
              />
            </div>
          </Card>
        )}

        {(!isMobile || mobileTab === 'output') && (
          <Card className="flex flex-col overflow-hidden min-h-[220px] flex-1">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30 gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('formattedPanel')}
              </Label>
              <CopyIconButton onCopy={handleCopy} copied={copied} disabled={!output} label={t('copy')} />
            </div>
            <div className="flex-1 min-h-0 relative p-1">
              <CodeEditor
                value={output}
                readOnly
                language="sql"
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
