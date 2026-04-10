'use client';

import { useCallback, useMemo, useState } from 'react';
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
import { AlertCircle, Copy, Check, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  generateIds,
  MAX_BULK,
  type IdKind,
  type NamespacePreset,
  type GenerateIdsErrorKey,
} from '@/lib/generate-ids';
import { useTranslations } from 'next-intl';

const KIND_OPTIONS: { value: IdKind; label: string }[] = [
  { value: 'ulid', label: 'ULID' },
  { value: 'uuid4', label: 'UUID v4' },
  { value: 'uuid7', label: 'UUID v7' },
  { value: 'uuid1', label: 'UUID v1' },
  { value: 'uuid6', label: 'UUID v6' },
  { value: 'uuid3', label: 'UUID v3' },
  { value: 'uuid5', label: 'UUID v5' },
];

function errorKeyFromGenerateIdsErrorKey(key: GenerateIdsErrorKey): string {
  switch (key) {
    case 'invalidCustomNamespace':
      return 'errors.invalidCustomNamespace';
    case 'missingName':
      return 'errors.missingName';
    default:
      return 'errors.unknown';
  }
}

export function UuidGeneratorLayout() {
  const t = useTranslations('UuidGenerator');
  const [kind, setKind] = useState<IdKind>('uuid4');
  const [count, setCount] = useState(10);
  const [name, setName] = useState('mydevtools');
  const [namespacePreset, setNamespacePreset] = useState<NamespacePreset>('DNS');
  const [customNamespace, setCustomNamespace] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const needsName = kind === 'uuid3' || kind === 'uuid5';
  const kindMeta = useMemo(() => KIND_OPTIONS.find((o) => o.value === kind), [kind]);

  const runGenerate = useCallback(() => {
    setError('');
    setCopied(false);
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
        setOutput('');
        setError(t(errorKeyFromGenerateIdsErrorKey(result.errorKey)));
        return;
      }
      setOutput(result.lines.join('\n'));
    } catch (e) {
      setOutput('');
      setError(t('errors.unknown'));
    }
  }, [kind, count, name, namespacePreset, customNamespace, t]);

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

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">
          {t('subtitle', { max: MAX_BULK.toLocaleString() })}
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        <Card className="flex flex-col gap-4 p-4 overflow-auto">
          <div className="space-y-2">
            <Label htmlFor="id-kind" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('format')}
            </Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as IdKind)}
            >
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
                <Select
                  value={namespacePreset}
                  onValueChange={(v) => setNamespacePreset(v as NamespacePreset)}
                >
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
            <Button type="button" onClick={runGenerate} className="gap-1.5">
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
                {t('lines', { count: output ? output.split('\n').length.toLocaleString() : '0' })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleDownload}
                disabled={!output}
                title={t('download.title')}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
                disabled={!output}
                title={t('copyTitle')}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
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
