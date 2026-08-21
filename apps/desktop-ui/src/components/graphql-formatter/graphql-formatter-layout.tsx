'use client';

import { parse, print, stripIgnoredCharacters } from 'graphql';
import { AlertCircle, Trash2, Wand2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { registerGraphqlMonarch } from '@/components/graphql-formatter/register-graphql-monarch';
import { useIsMobile } from '@/components/hooks/use-mobile';
import { IconBrandGraphql } from '@tabler/icons-react';
import { ToolShell } from '@/components/tools/tool-shell';
import { IOPanel } from '@/components/tools/io-panel';
import { ToolMobileTabs } from '@/components/tools/tool-mobile-tabs';
import { CopyIconButton } from '@/components/tools/copy-icon-button';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
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

type OutputMode = 'pretty' | 'minify';

export function GraphqlFormatterLayout() {
  const t = useTranslations('GraphqlFormatter');
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<'input' | 'output'>('input');
  const [panelTab, setPanelTab] = useState<'format' | 'build'>('format');
  const [input, setInput] = useState(SAMPLE);
  const [output, setOutput] = useState('');
  const [outputMode, setOutputMode] = useState<OutputMode>('pretty');
  const [error, setError] = useState('');
  const { isCopied: copied, copyToClipboard, reset: resetCopied } = useCopyToClipboard();

  const [opType, setOpType] = useState<'query' | 'mutation' | 'subscription'>('query');
  const [opName, setOpName] = useState('MyOperation');
  const [varDefs, setVarDefs] = useState('');
  const [selection, setSelection] = useState(`user(id: $userId) {
  id
  email
}`);

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
  }, [input, outputMode, isMobile, t, resetCopied]);

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

  const handleCopy = () => {
    if (!output) return;
    void copyToClipboard(output, { silent: true });
  };

  const toolbar = (
    <div className="shrink-0 space-y-4 rounded-lg border border-border bg-card p-4">
      <Tabs value={panelTab} onValueChange={(v) => setPanelTab(v as 'format' | 'build')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="format">{t('tabs.format')}</TabsTrigger>
          <TabsTrigger value="build">{t('tabs.build')}</TabsTrigger>
        </TabsList>
        <TabsContent value="format" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full space-y-2 sm:w-auto sm:min-w-[140px]">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('outputModeLabel')}
              </Label>
              <Select value={outputMode} onValueChange={(v) => setOutputMode(v as OutputMode)}>
                <SelectTrigger className="h-9 w-full text-sm sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pretty">{t('outputModes.pretty')}</SelectItem>
                  <SelectItem value="minify">{t('outputModes.minify')}</SelectItem>
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
        </TabsContent>
        <TabsContent value="build" className="mt-4 space-y-4">
          <p className="text-xs text-muted-foreground">{t('builderHint')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
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
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
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
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('builder.variableDefs')}
            </Label>
            <Input
              value={varDefs}
              onChange={(e) => setVarDefs(e.target.value)}
              placeholder={t('builder.variableDefsPlaceholder')}
              className="h-9 font-mono text-sm"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t('builder.selection')}
            </Label>
            <textarea
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
              spellCheck={false}
              rows={6}
              className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
    </div>
  );

  return (
    <ToolShell icon={IconBrandGraphql} title={t('title')} description={t('subtitle')} toolbar={toolbar}>
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
            { value: 'output', label: t('outputPanel') },
          ]}
        />
      )}

      <div
        className={cn(
          'min-h-0 flex-1',
          isMobile ? 'mt-4 flex flex-col gap-4' : 'grid grid-cols-1 gap-4 lg:grid-cols-2',
        )}
      >
        {(!isMobile || mobileTab === 'input') && (
          <IOPanel label={t('inputPanel')} bodyClassName="p-1" className="min-h-[280px] flex-1">
            <CodeEditor
              language="graphql"
              value={input}
              onChange={(v) => setInput(v ?? '')}
              beforeMount={(monaco) => registerGraphqlMonarch(monaco)}
            />
          </IOPanel>
        )}

        {(!isMobile || mobileTab === 'output') && (
          <IOPanel
            label={t('outputPanel')}
            bodyClassName="p-1"
            className="min-h-[280px] flex-1"
            actions={
              <CopyIconButton onCopy={handleCopy} copied={copied} disabled={!output} label={t('copy')} />
            }
          >
            <CodeEditor
              language="graphql"
              value={output}
              beforeMount={(monaco) => registerGraphqlMonarch(monaco)}
              readOnly
            />
          </IOPanel>
        )}
      </div>
    </ToolShell>
  );
}
