'use client';

import { useCallback, useMemo, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { IdRow } from './id-row';
import { errorKeyFromGenerateIdsErrorKey } from './error-mapping';
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
import { AlertCircle, Copy, Check, Download, RefreshCw, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  generateIds,
  MAX_BULK,
  type IdKind,
  type NamespacePreset,
  type GenerateIdsErrorKey,
} from '@/lib/generate-ids';
import { useTranslations } from 'next-intl';
import { useIsMobile } from '@/components/hooks/use-mobile';
import { useAutoCopyStore } from '@/store/auto-copy-store';
import { useEffect } from 'react';

const KIND_OPTIONS: { value: IdKind; label: string }[] = [
  { value: 'ulid', label: 'ULID' },
  { value: 'uuid4', label: 'UUID v4' },
  { value: 'uuid7', label: 'UUID v7' },
  { value: 'uuid1', label: 'UUID v1' },
  { value: 'uuid6', label: 'UUID v6' },
  { value: 'uuid3', label: 'UUID v3' },
  { value: 'uuid5', label: 'UUID v5' },
];


export function UuidGeneratorLayout() {
  const t = useTranslations('UuidGenerator');
  const isMobile = useIsMobile();

  const [kind, setKind] = useState<IdKind>('uuid4');
  const [count, setCount] = useState(10);
  const [name, setName] = useState('mydevtools');
  const [namespacePreset, setNamespacePreset] = useState<NamespacePreset>('DNS');
  const [customNamespace, setCustomNamespace] = useState('');
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [error, setError] = useState('');
  const { isCopied: copied, copyToClipboard: copyAllFn, reset: resetCopied } = useCopyToClipboard();
  const autoCopy = useAutoCopyStore((state) => state.autoCopy);

  const needsName = kind === 'uuid3' || kind === 'uuid5';
  const kindMeta = useMemo(() => KIND_OPTIONS.find((o) => o.value === kind), [kind]);

  const runGenerate = useCallback(() => {
    setError('');
    resetCopied();
    try {
      const n = Number(count);
      const result = generateIds({
        kind,
        count: Number.isFinite(n) ? n : 1,
        name,
        namespacePreset,
        customNamespace,
      });
      if (!result.ok) {
        setOutputLines([]);
        setError(t(errorKeyFromGenerateIdsErrorKey(result.errorKey)));
        return;
      }
      setOutputLines(result.lines);
    } catch {
      setOutputLines([]);
      setError(t('errors.unknown'));
    }
  }, [kind, count, name, namespacePreset, customNamespace, t, resetCopied]);

  const output = outputLines.join('\n');

  const handleCopyAll = useCallback(() => {
    if (!output) return;
    void copyAllFn(output, { silent: true });
  }, [output, copyAllFn]);

  useEffect(() => {
    if (autoCopy && output) {
      void handleCopyAll();
    }
  }, [output, autoCopy, handleCopyAll]);

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t('download.filename', { kind });
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b shrink-0 px-4 pb-4 pt-2">
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('subtitle', { max: MAX_BULK.toLocaleString() })}
          </p>

          {/* Format chips */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {KIND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setKind(opt.value)}
                className={cn(
                  'shrink-0 h-8 rounded-full px-4 text-xs font-medium transition-all border',
                  kind === opt.value
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Kind hint */}
          {kindMeta && (
            <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
              {t(`kindHints.${kindMeta.value}`)}
            </p>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-36">
          <div className="px-4 py-4 space-y-5">
            {/* Count stepper */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('countLabel', { max: MAX_BULK.toLocaleString() })}
              </Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  className="h-10 w-10 shrink-0 rounded-xl border bg-muted/40 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 h-10 rounded-xl border bg-muted/40 flex items-center justify-center">
                  <span className="text-lg font-semibold tabular-nums">{count}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCount((c) => Math.min(MAX_BULK, c + 1))}
                  className="h-10 w-10 shrink-0 rounded-xl border bg-muted/40 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {/* Quick count pills */}
              <div className="flex gap-2">
                {[1, 5, 10, 25, 50].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className={cn(
                      'h-7 rounded-full px-3 text-xs font-medium border transition-all',
                      count === n
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-muted/50 text-muted-foreground border-transparent'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* v3/v5 name fields */}
            {needsName && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="id-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('nameLabel')}
                  </Label>
                  <Input
                    id="id-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('namePlaceholder')}
                    className="font-mono text-sm rounded-xl bg-muted/40 border-border/60"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t.rich('bulkHint', {
                      code: (chunks) => <code className="text-foreground">{chunks}</code>,
                    })}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('namespace')}
                  </Label>
                  <Select value={namespacePreset} onValueChange={(v) => setNamespacePreset(v as NamespacePreset)}>
                    <SelectTrigger className="font-mono text-sm rounded-xl bg-muted/40 border-border/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DNS">{t('namespaceOptions.dns')}</SelectItem>
                      <SelectItem value="URL">{t('namespaceOptions.url')}</SelectItem>
                      <SelectItem value="custom">{t('namespaceOptions.custom')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {namespacePreset === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="id-ns-custom" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t('customNamespaceLabel')}
                    </Label>
                    <Input
                      id="id-ns-custom"
                      value={customNamespace}
                      onChange={(e) => setCustomNamespace(e.target.value)}
                      placeholder={t('customNamespacePlaceholder')}
                      className="font-mono text-sm rounded-xl bg-muted/40 border-border/60"
                    />
                  </div>
                )}
              </>
            )}

            {/* Output list */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {outputLines.length > 0 && (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('lines', { count: outputLines.length.toLocaleString() })}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label={t('download.title')}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyAll}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label={t('copyTitle')}
                    >
                      {copied
                        ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                        : <Copy className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                </div>
                <div>
                  {outputLines.map((id, i) => (
                    <IdRow key={i} id={id} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky generate CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-xl border-t px-4 py-3 mobile-nav-offset">
          <Button
            type="button"
            onClick={runGenerate}
            className="w-full h-12 rounded-xl text-base font-semibold gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('generate')}
          </Button>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        <Card className="flex flex-col gap-4 p-4 overflow-auto">
          <div className="space-y-2">
            <Label htmlFor="id-kind" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('format')}
            </Label>
            <Select value={kind} onValueChange={(v) => setKind(v as IdKind)}>
              <SelectTrigger id="id-kind" className="font-mono text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="font-mono text-sm">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {kindMeta && (
              <p className="text-[11px] text-muted-foreground leading-snug">
                {t(`kindHints.${kindMeta.value}`)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="id-count" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('countLabel', { max: MAX_BULK.toLocaleString() })}
            </Label>
            <Input
              id="id-count"
              type="number"
              min={1}
              max={MAX_BULK}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="font-mono text-sm"
            />
          </div>

          {needsName && (
            <>
              <div className="space-y-2">
                <Label htmlFor="id-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('nameLabel')}
                </Label>
                <Input
                  id="id-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  {t.rich('bulkHint', {
                    code: (chunks) => <code className="text-foreground">{chunks}</code>,
                  })}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('namespace')}
                </Label>
                <Select value={namespacePreset} onValueChange={(v) => setNamespacePreset(v as NamespacePreset)}>
                  <SelectTrigger className="font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DNS">{t('namespaceOptions.dns')}</SelectItem>
                    <SelectItem value="URL">{t('namespaceOptions.url')}</SelectItem>
                    <SelectItem value="custom">{t('namespaceOptions.custom')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {namespacePreset === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="id-ns-custom" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('customNamespaceLabel')}
                  </Label>
                  <Input
                    id="id-ns-custom"
                    value={customNamespace}
                    onChange={(e) => setCustomNamespace(e.target.value)}
                    placeholder={t('customNamespacePlaceholder')}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" onClick={runGenerate} className="gap-1.5 w-full sm:w-auto">
              <RefreshCw className="h-3.5 w-3.5" />
              {t('generate')}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden min-h-[280px]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30 gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('output')}
            </Label>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground tabular-nums mr-1">
                {t('lines', { count: outputLines.length > 0 ? outputLines.length.toLocaleString() : '0' })}
              </span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                onClick={handleDownload} disabled={!output} title={t('download.title')}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                onClick={handleCopyAll} disabled={!output} title={t('copyTitle')}>
                {copied
                  ? <Check className="h-3.5 w-3.5 text-green-500" />
                  : <Copy className="h-3.5 w-3.5" />
                }
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className={cn('flex flex-col items-center gap-2 text-destructive max-w-sm text-center')}>
                  <AlertCircle className="h-6 w-6 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            ) : (
              <textarea
                value={output}
                readOnly
                placeholder={t('outputPlaceholder')}
                className="absolute inset-0 w-full h-full resize-none bg-transparent p-4 text-sm font-mono focus:outline-none placeholder:text-muted-foreground/50"
                spellCheck={false}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
