'use client';

import { useState, useMemo, useCallback } from 'react';
import { useIsMobile } from '@/components/hooks/use-mobile';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { ArrowLeftRight, Copy, Check, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { convert, ALL_FORMATS, FORMAT_LABELS, type Format } from '@/lib/format-converter';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground bg-muted/10 rounded-md">
        Loading editor…
      </div>
    ),
  }
);

const MONACO_LANG: Record<Format, string> = {
  json: 'json',
  yaml: 'yaml',
  toml: 'ini',
  xml: 'xml',
};

const PLACEHOLDERS: Record<Format, string> = {
  json: `{\n  "name": "Alice",\n  "age": 30,\n  "active": true\n}`,
  yaml: `name: Alice\nage: 30\nactive: true`,
  toml: `name = "Alice"\nage = 30\nactive = true`,
  xml: `<root>\n  <name>Alice</name>\n  <age>30</age>\n  <active>true</active>\n</root>`,
};

const EDITOR_OPTIONS_BASE = {
  minimap: { enabled: false },
  fontSize: 13,
  lineNumbers: 'on' as const,
  glyphMargin: false,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  insertSpaces: true,
  detectIndentation: false,
  wordWrap: 'on' as const,
  folding: true,
  padding: { top: 12, bottom: 12 },
  scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
};

export function FormatConverterLayout() {
  const t = useTranslations('FormatConverter');
  const { resolvedTheme } = useTheme();
  const monacoTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'light';
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<'input' | 'output'>('input');

  const [from, setFrom] = useState<Format>('json');
  const [to, setTo] = useState<Format>('yaml');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const { output, error } = useMemo<{ output: string; error: string }>(() => {
    if (!input.trim()) return { output: '', error: '' };
    try {
      return { output: convert(input, from, to), error: '' };
    } catch (e) {
      return { output: '', error: e instanceof Error ? e.message : String(e) };
    }
  }, [input, from, to]);

  const handleSwap = useCallback(() => {
    setFrom(to);
    setTo(from);
    setInput(output || input);
  }, [from, to, input, output]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [output]);

  const toFormats = ALL_FORMATS.filter((f) => f !== from);

  const handleFromChange = useCallback((val: Format) => {
    setFrom(val);
    if (val === to) setTo(ALL_FORMATS.find((f) => f !== val)!);
  }, [to]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
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
              {tab === 'input' ? t('fromLabel') : t('toLabel')}
            </button>
          ))}
        </div>
      )}

      <div className={`min-h-0 flex-1 ${isMobile ? 'flex flex-col' : 'grid grid-cols-2 gap-4'}`}>
        {/* Input */}
        {(!isMobile || mobileTab === 'input') && (
          <Card className="flex flex-col gap-3 overflow-hidden p-4 flex-1">
            <div className="flex shrink-0 items-center gap-3">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('fromLabel')}
              </Label>
              <Select value={from} onValueChange={(v) => handleFromChange(v as Format)}>
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_FORMATS.map((f) => (
                    <SelectItem key={f} value={f} className="text-xs">
                      {FORMAT_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex-1 min-h-[300px]">
              <MonacoEditor
                height="100%"
                className="absolute inset-0"
                language={MONACO_LANG[from]}
                value={input}
                onChange={(v) => {
                  setInput(v ?? '');
                  if (isMobile && (v ?? '').trim()) setMobileTab('output');
                }}
                theme={monacoTheme}
                options={{
                  ...EDITOR_OPTIONS_BASE,
                  formatOnPaste: true,
                  formatOnType: true,
                  placeholder: PLACEHOLDERS[from],
                }}
              />
            </div>

            <p className="shrink-0 text-xs text-muted-foreground">
              {t('charCount', { count: input.length })}
            </p>
          </Card>
        )}

        {/* Output */}
        {(!isMobile || mobileTab === 'output') && (
          <Card className="flex flex-col gap-3 overflow-hidden p-4 flex-1">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('toLabel')}
                </Label>
                <Select value={to} onValueChange={(v) => setTo(v as Format)}>
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {toFormats.map((f) => (
                      <SelectItem key={f} value={f} className="text-xs">
                        {FORMAT_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSwap}
                  disabled={!output}
                  title={t('swapTitle')}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  {t('swap')}
                </Button>
                <Button size="sm" variant="secondary" disabled={!output} onClick={handleCopy}>
                  {copied
                    ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" />
                    : <Copy className="mr-1.5 h-4 w-4" />}
                  {copied ? t('copied') : t('copy')}
                </Button>
              </div>
            </div>

            {error ? (
              <div className="flex flex-1 min-h-[300px] gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span className="font-mono text-xs text-destructive break-all">{error}</span>
              </div>
            ) : (
              <div className="relative flex-1 min-h-[300px]">
                <MonacoEditor
                  height="100%"
                  className="absolute inset-0"
                  language={MONACO_LANG[to]}
                  value={output}
                  theme={monacoTheme}
                  options={{
                    ...EDITOR_OPTIONS_BASE,
                    readOnly: true,
                    domReadOnly: true,
                    cursorStyle: 'line' as const,
                    renderLineHighlight: 'none' as const,
                  }}
                />
              </div>
            )}

            <p className="shrink-0 text-xs text-muted-foreground">{t('localNote')}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
