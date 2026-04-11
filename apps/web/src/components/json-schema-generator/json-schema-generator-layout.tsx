'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Check, Copy, FileJson, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { highlightSchemaOutput } from '@/lib/hljs-json-schema-output';
import {
  generateFromSchema,
  inferSchema,
  OUTPUT_LANGUAGE_ORDER,
  type OutputLanguage,
} from '@/lib/json-schema-generator';
import './json-schema-highlighter.css';

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

export function JsonSchemaGeneratorLayout() {
  const t = useTranslations('JsonSchemaGenerator');
  const [input, setInput] = useState(defaultSample);
  const [language, setLanguage] = useState<OutputLanguage>('python');
  const [copied, setCopied] = useState(false);

  const { output, error } = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      return { output: '', error: null as string | null };
    }
    try {
      const parsed: unknown = JSON.parse(trimmed);
      const schema = inferSchema(parsed);
      return {
        output: generateFromSchema(schema, language),
        error: null as string | null,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { output: '', error: msg };
    }
  }, [input, language]);

  const highlightedOutput = useMemo(
    () => (error || !output ? '' : highlightSchemaOutput(output, language)),
    [output, language, error]
  );

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success(t('copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('copyFailed'));
    }
  }, [output, t]);

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
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="flex min-h-[280px] flex-col overflow-hidden md:min-h-[420px]">
          <div className="shrink-0 border-b border-border/50 bg-muted/30 px-4 py-2.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('inputLabel')}
            </Label>
          </div>
          <div className="relative min-h-0 flex-1 min-h-[200px]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('inputPlaceholder')}
              spellCheck={false}
              className="absolute inset-0 h-full w-full resize-none bg-transparent p-4 font-mono text-sm focus:outline-none placeholder:text-muted-foreground/50"
              aria-label={t('inputLabel')}
            />
          </div>
        </Card>

        <Card
          className={cn(
            'flex min-h-[280px] flex-col overflow-hidden md:min-h-[420px]',
            error && 'border-destructive/40'
          )}
        >
          <div className="shrink-0 border-b border-border/50 bg-muted/30 px-4 py-2.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('outputLabel')}
            </Label>
          </div>
          <div className="relative min-h-0 flex-1 min-h-[200px]">
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
      </div>
    </div>
  );
}
