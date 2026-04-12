'use client';

import { format, type KeywordCase, type SqlLanguage } from 'sql-formatter';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Check, Copy, Trash2, Wand2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [dialect, setDialect] = useState<SqlLanguage>('postgresql');
  const [keywordCase, setKeywordCase] = useState<KeywordCase>('upper');
  const [tabWidth, setTabWidth] = useState('2');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const runFormat = useCallback(() => {
    setError('');
    setCopied(false);
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
  }, [input, dialect, keywordCase, tabWidth, t]);

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard failures
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

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
            <Button type="button" size="sm" className="gap-1.5 h-9" onClick={runFormat}>
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        <Card className="flex flex-col overflow-hidden min-h-[220px]">
          <div className="px-4 py-2.5 border-b border-border/50 bg-muted/30">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('inputPanel')}
            </Label>
          </div>
          <div className="flex-1 min-h-0 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              className="absolute inset-0 w-full h-full resize-none bg-transparent p-4 text-sm font-mono focus:outline-none placeholder:text-muted-foreground/50"
              placeholder={t('inputPlaceholder')}
            />
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden min-h-[220px]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30 gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('formattedPanel')}
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              disabled={!output}
              title={t('copy')}
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <div className="flex-1 min-h-0 relative">
            <textarea
              value={output}
              readOnly
              placeholder={t('outputPlaceholder')}
              spellCheck={false}
              className="absolute inset-0 w-full h-full resize-none bg-transparent p-4 text-sm font-mono focus:outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
