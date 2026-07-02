'use client';

import { useCallback, useMemo, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useIsMobile } from '@/components/hooks/use-mobile';
import { useTranslations } from 'next-intl';
import { AlertCircle, Check, Copy, Download, FileJson, Trash2 } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { triggerDownload } from '@/lib/csv-excel-json-utils';
import { highlightSchemaOutput } from '@/lib/hljs-json-schema-output';
import {
  collectFormats,
  generateFromSchema,
  inferSchema,
  OUTPUT_LANGUAGE_ORDER,
  type OutputLanguage,
  type StringFormat,
} from '@/lib/json-schema-generator';
import { Badge } from '@/components/ui/badge';
import './json-schema-highlighter.css';
import { JsonSchemaInputEditor } from './json-schema-input-editor';

const defaultSample = `{
  "id": 42,
  "name": "demo",
  "tags": ["alpha", "beta"],
  "meta": {
    "version": 1,
    "flags": { "beta": true }
  },
  "scores": [9.5, 8.0]
}`;

const FILE_EXT: Record<OutputLanguage, string> = {
  jsonSchema: 'json',
  python: 'py',
  typescript: 'ts',
  go: 'go',
  rust: 'rs',
  java: 'java',
  csharp: 'cs',
  dart: 'dart',
  swift: 'swift',
};

export function JsonSchemaGeneratorLayout() {
  const t = useTranslations('JsonSchemaGenerator');
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<'input' | 'output'>('input');
  const [input, setInput] = useState(defaultSample);
  const [language, setLanguage] = useState<OutputLanguage>('python');
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard();

  const { output, error, formats } = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      return { output: '', error: null as string | null, formats: [] as [StringFormat, number][] };
    }
    try {
      const parsed: unknown = JSON.parse(trimmed);
      const schema = inferSchema(parsed);
      return {
        output: generateFromSchema(schema, language),
        error: null as string | null,
        formats: [...collectFormats(schema).entries()],
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { output: '', error: msg, formats: [] as [StringFormat, number][] };
    }
  }, [input, language]);

  const highlightedOutput = useMemo(
    () => (error || !output ? '' : highlightSchemaOutput(output, language)),
    [output, language, error]
  );

  const handleCopy = useCallback(() => {
    if (!output) return;
    void copyToClipboard(output, {
      successMessage: t('copied'),
      errorMessage: t('copyFailed'),
    });
  }, [output, t, copyToClipboard]);

  const handleDownload = useCallback(() => {
    if (!output || error) return;
    const ext = FILE_EXT[language];
    const filename = language === 'jsonSchema' ? 'schema.json' : `generated.${ext}`;
    const mime = language === 'jsonSchema' ? 'application/json' : 'text/plain';
    triggerDownload(new Blob([output], { type: `${mime};charset=utf-8` }), filename);
  }, [output, error, language]);

  const handleClear = () => {
    setInput('');
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:hidden">
        <div className="flex items-start gap-2.5">
          <div className="rounded-xl bg-primary/10 p-2 shadow-sm">
            <FileJson className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">{t('title')}</h1>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5 sm:min-w-[240px]">
          <Label htmlFor="json-schema-lang" className="text-xs text-muted-foreground">
            {t('languageLabel')}
          </Label>
          <Select
            value={language}
            onValueChange={(v) => setLanguage(v as OutputLanguage)}
          >
            <SelectTrigger id="json-schema-lang" className="w-full sm:w-[280px]">
              <SelectValue placeholder={t('languageLabel')} />
            </SelectTrigger>
            <SelectContent>
              {OUTPUT_LANGUAGE_ORDER.map((id) => (
                <SelectItem key={id} value={id}>
                  {t(`languages.${id}` as never)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {t('clear')}
          </Button>
          <Button size="sm" onClick={handleCopy} disabled={!output || !!error}>
            {copied ? (
              <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="mr-1.5 h-3.5 w-3.5" />
            )}
            {t('copy')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!output || !!error}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {t('download')}
          </Button>
        </div>
      </div>

      {isMobile && (
        <div className="flex shrink-0 rounded-lg border bg-muted/40 p-1 gap-1">
          {(['input', 'output'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMobileTab(tab)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize transition-all ${
                mobileTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'input' ? t('inputLabel') : t('outputLabel')}
            </button>
          ))}
        </div>
      )}

      <div className={`min-h-0 flex-1 ${isMobile ? 'flex flex-col' : 'grid grid-cols-2 gap-4'}`}>
        {(!isMobile || mobileTab === 'input') && (
          <Card className="flex min-h-[300px] flex-col overflow-hidden">
            <div className="shrink-0 border-b border-border/50 bg-muted/30 px-4 py-2.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('inputLabel')}
              </Label>
            </div>
            <div className="relative min-h-0 min-h-[260px] flex-1">
              <JsonSchemaInputEditor
                value={input}
                onChange={setInput}
                ariaLabel={`${t('inputLabel')}. ${t('inputPlaceholder')}`}
              />
            </div>
          </Card>
        )}

        {(!isMobile || mobileTab === 'output') && (
          <Card
            className={cn(
              'flex min-h-[300px] flex-col overflow-hidden',
              error && 'border-destructive/40'
            )}
          >
            <div className="shrink-0 border-b border-border/50 bg-muted/30 px-4 py-2.5 flex items-center justify-between gap-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('outputLabel')}
              </Label>
              {!error && formats.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t('detectedFormats')}
                  </span>
                  {formats.map(([fmt, count]) => (
                    <Badge key={fmt} variant="secondary" className="text-[10px] font-mono">
                      {fmt}{count > 1 ? ` ×${count}` : ''}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="relative min-h-0 flex-1 min-h-[260px]">
              {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
                  <p className="text-sm text-destructive">{t('parseError')}</p>
                  <p className="max-w-sm font-mono text-xs text-muted-foreground">{error}</p>
                </div>
              ) : (
                <ScrollArea className="absolute inset-0 h-full">
                  <div
                    className="json-schema-hl min-h-full"
                    role="region"
                    aria-label={t('outputLabel')}
                  >
                    {output ? (
                      <pre className="m-0 font-mono">
                        <code
                          className="hljs"
                          dangerouslySetInnerHTML={{ __html: highlightedOutput }}
                        />
                      </pre>
                    ) : (
                      <p className="p-4 text-sm text-muted-foreground">
                        {t('outputPlaceholder')}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
