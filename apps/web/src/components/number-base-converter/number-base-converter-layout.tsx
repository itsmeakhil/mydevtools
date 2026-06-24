'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { useDebouncedCallback } from 'use-debounce';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Check, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  NUMBER_BASES,
  formatIntegerInBase,
  parseIntegerInBase,
  type NumberBase,
} from '@/lib/number-base';

export function NumberBaseConverterLayout() {
  const t = useTranslations('NumberBaseConverter');
  const [inputBase, setInputBase] = useState<NumberBase>(10);
  const [outputBase, setOutputBase] = useState<NumberBase>(16);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard();

  const inputBytes = useMemo(() => new TextEncoder().encode(input).length, [input]);

  const run = useCallback(() => {
    setError(null);
    if (!input.trim()) {
      setOutput('');
      return;
    }
    setWorking(true);
    try {
      const n = parseIntegerInBase(input, inputBase);
      setOutput(formatIntegerInBase(n, outputBase));
    } catch {
      setOutput('');
      setError(t('errors.invalidNumber'));
    } finally {
      setWorking(false);
    }
  }, [input, inputBase, outputBase, t]);

  const debounced = useDebouncedCallback(() => {
    run();
  }, 200);

  useEffect(() => {
    debounced();
  }, [input, inputBase, outputBase, debounced]);

  const handleCopy = () => {
    if (!output) return;
    void copyToClipboard(output, { silent: true });
  };

  const handleSwap = () => {
    setInputBase(outputBase);
    setOutputBase(inputBase);
    if (output) setInput(output);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 overflow-auto p-4">
          <div className="grid items-end gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('inputBaseLabel')}
              </Label>
              <Select value={String(inputBase)} onValueChange={(v) => setInputBase(Number(v) as NumberBase)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NUMBER_BASES.map((b) => (
                    <SelectItem key={b} value={String(b)}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-1 flex justify-center">
              <Button type="button" variant="outline" size="sm" onClick={handleSwap}>
                <ArrowRightLeft className="mr-1.5 h-4 w-4" />
                {t('swap')}
              </Button>
            </div>

            <div className="space-y-2 sm:col-span-1">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('outputBaseLabel')}
              </Label>
              <Select value={String(outputBase)} onValueChange={(v) => setOutputBase(Number(v) as NumberBase)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NUMBER_BASES.map((b) => (
                    <SelectItem key={b} value={String(b)}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nbc-input">{t('inputLabel')}</Label>
            <Textarea
              id="nbc-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('placeholderInput')}
              className="min-h-[200px] resize-y font-mono text-sm"
              spellCheck={false}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">{t('byteCountHint', { count: inputBytes })}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </Card>

        <Card className="flex flex-col gap-3 overflow-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('outputLabel')}
            </Label>
            <Button type="button" size="sm" variant="secondary" disabled={!output} onClick={handleCopy}>
              {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? t('copied') : t('copyOutput')}
            </Button>
          </div>

          <div
            className={cn(
              'min-h-[120px] rounded-md border bg-muted/30 p-3 font-mono text-sm break-all',
              working && 'opacity-60'
            )}
          >
            {output || (
              <span className="text-muted-foreground">{input.trim() ? '…' : t('emptyHint')}</span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{t('note')}</p>
        </Card>
      </div>
    </div>
  );
}

