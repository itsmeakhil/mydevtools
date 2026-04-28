'use client';

import dynamic from 'next/dynamic';
import { parse, print, stripIgnoredCharacters } from 'graphql';
import { AlertCircle, Check, Copy, Trash2, Wand2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { registerGraphqlMonarch } from '@/components/graphql-formatter/register-graphql-monarch';
import { useIsMobile } from '@/components/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import CodeEditor from '@/components/ui/code-editor';

const SAMPLE = `query UserPosts($userId: ID!, $first: Int = 10) {
  user(id: $userId) {
    id
    email
    posts(first: $first) {
      edges {
        node {
          title
          createdAt
        }
      }
    }
  }
}`;

const MAX_LEN = 500_000;

// Editor options are now largely handled by CodeEditor internally.

type OutputMode = 'pretty' | 'minify';

export function GraphqlFormatterLayout() {
  const t = useTranslations('GraphqlFormatter');
  const { resolvedTheme } = useTheme();
  const monacoTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'light';
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<'input' | 'output'>('input');
  const [panelTab, setPanelTab] = useState<'format' | 'build'>('format');
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [outputMode, setOutputMode] = useState<OutputMode>('pretty');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [opType, setOpType] = useState<'query' | 'mutation' | 'subscription'>('query');
  const [opName, setOpName] = useState('MyOperation');
  const [varDefs, setVarDefs] = useState('');
  const [selection, setSelection] = useState(`user(id: $userId) {
  id
  email
}`);

  const runFormat = useCallback(() => {
    setError('');
    setCopied(false);
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
      const doc = parse(q);
      if (outputMode === 'minify') {
        setOutput(stripIgnoredCharacters(print(doc)));
      } else {
        setOutput(print(doc));
      }
    } catch (e) {
      setOutput('');
      setError(e instanceof Error ? e.message : t('errors.couldNotFormat'));
    }
  }, [input, outputMode, isMobile, t]);

  const applyBuilder = useCallback(() => {
    setError('');
    const inner = selection.trim();
    if (!inner) {
      setError(t('errors.emptySelection'));
      return;
    }
    const varsRaw = varDefs.trim();
    let varsPart = '';
    if (varsRaw) {
      const innerVars = varsRaw.startsWith('(') && varsRaw.endsWith(')') ? varsRaw.slice(1, -1).trim() : varsRaw;
      varsPart = `(${innerVars})`;
    }
    let namePart = opName.trim();
    if (varsPart && !namePart) {
      namePart = 'Untitled';
    }
    const head = namePart ? `${opType} ${namePart}` : opType;
    const doc = `${head}${varsPart} {\n  ${inner.replace(/\n/g, '\n  ')}\n}`;
    setInput(doc);
    setPanelTab('format');
  }, [opType, opName, varDefs, selection, t]);

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

      <Card className="p-4 shrink-0 space-y-4">
        <Tabs value={panelTab} onValueChange={(v) => setPanelTab(v as 'format' | 'build')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="format">{t('tabs.format')}</TabsTrigger>
            <TabsTrigger value="build">{t('tabs.build')}</TabsTrigger>
          </TabsList>
          <TabsContent value="format" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2 w-full sm:w-auto sm:min-w-[140px]">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  {t('outputModeLabel')}
                </Label>
                <Select value={outputMode} onValueChange={(v) => setOutputMode(v as OutputMode)}>
                  <SelectTrigger className="h-9 text-sm w-full sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pretty">{t('outputModes.pretty')}</SelectItem>
                    <SelectItem value="minify">{t('outputModes.minify')}</SelectItem>
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
          </TabsContent>
          <TabsContent value="build" className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">{t('builderHint')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  {t('builder.operation')}
                </Label>
                <Select value={opType} onValueChange={(v) => setOpType(v as typeof opType)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="query">{t('builder.operations.query')}</SelectItem>
                    <SelectItem value="mutation">{t('builder.operations.mutation')}</SelectItem>
                    <SelectItem value="subscription">{t('builder.operations.subscription')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  {t('builder.operationName')}
                </Label>
                <Input
                  value={opName}
                  onChange={(e) => setOpName(e.target.value)}
                  placeholder={t('builder.operationNamePlaceholder')}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('builder.variableDefs')}
              </Label>
              <Input
                value={varDefs}
                onChange={(e) => setVarDefs(e.target.value)}
                placeholder={t('builder.variableDefsPlaceholder')}
                className="h-9 text-sm font-mono"
                spellCheck={false}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                {t('builder.selection')}
              </Label>
              <textarea
                value={selection}
                onChange={(e) => setSelection(e.target.value)}
                spellCheck={false}
                rows={6}
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <Button type="button" size="sm" onClick={applyBuilder}>
              {t('builder.apply')}
            </Button>
          </TabsContent>
        </Tabs>
        <p className="text-[11px] text-muted-foreground">
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
        <div className="flex shrink-0 rounded-lg border bg-muted/40 p-1 gap-1">
          <button
            type="button"
            onClick={() => setMobileTab('input')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              mobileTab === 'input'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('inputPanel')}
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('output')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              mobileTab === 'output'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('outputPanel')}
          </button>
        </div>
      )}

      <div
        className={`flex-1 min-h-0 ${isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'}`}
      >
        {(!isMobile || mobileTab === 'input') && (
          <Card className="flex flex-col overflow-hidden min-h-[280px] flex-1">
            <div className="px-4 py-2.5 border-b border-border/50 bg-muted/30">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('inputPanel')}
              </Label>
            </div>
            <div className="flex-1 min-h-[240px] relative p-1">
              <CodeEditor
                language="graphql"
                value={input}
                onChange={(v) => setInput(v ?? '')}
                beforeMount={(monaco) => registerGraphqlMonarch(monaco)}
              />
            </div>
          </Card>
        )}

        {(!isMobile || mobileTab === 'output') && (
          <Card className="flex flex-col overflow-hidden min-h-[280px] flex-1">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30 gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('outputPanel')}
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
            <div className="flex-1 min-h-[240px] relative p-1">
              <CodeEditor
                language="graphql"
                value={output}
                beforeMount={(monaco) => registerGraphqlMonarch(monaco)}
                readOnly
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
