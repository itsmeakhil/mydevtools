'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { useDebouncedCallback } from 'use-debounce';
import { Label } from '@/components/ui/label';
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
import { IconArrowsExchange } from '@tabler/icons-react';
import { ToolShell } from '@/components/tools/tool-shell';
import { ToolPanels, IOPanel, ToolTextArea } from '@/components/tools/io-panel';

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

  const toolbar = (
    <div className="grid items-end gap-4 rounded-lg border border-border bg-card px-4 py-3 sm:grid-cols-3">
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

      <div className="flex justify-center sm:col-span-1">
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
  );

  return (
    <ToolShell
      icon={IconArrowsExchange}
      title={t('title')}
      description={t('subtitle')}
      toolbar={toolbar}
    >
      <ToolPanels className="lg:grid-cols-2">
        <IOPanel
          label={t('inputLabel')}
          bodyClassName="flex flex-col"
          actions={
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {t('byteCountHint', { count: inputBytes })}
            </span>
          }
        >
          <div className="relative min-h-0 flex-1">
            <ToolTextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('placeholderInput')}
              autoComplete="off"
            />
          </div>
          {error && (
            <p className="shrink-0 border-t border-border/50 px-3 py-1.5 text-sm text-destructive">
              {error}
            </p>
          )}
        </IOPanel>

        <IOPanel
          label={t('outputLabel')}
          bodyClassName="flex flex-col"
          actions={
            <Button type="button" size="sm" variant="secondary" className="h-7" disabled={!output} onClick={handleCopy}>
              {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
              {copied ? t('copied') : t('copyOutput')}
            </Button>
          }
        >
          <div
            className={cn(
              'min-h-0 flex-1 overflow-auto break-all p-3 font-mono text-sm',
              working && 'opacity-60'
            )}
          >
            {output || (
              <span className="text-muted-foreground">{input.trim() ? '…' : t('emptyHint')}</span>
            )}
          </div>
          <p className="shrink-0 border-t border-border/50 px-3 py-1.5 text-xs text-muted-foreground">
            {t('note')}
          </p>
        </IOPanel>
      </ToolPanels>
    </ToolShell>
  );
}
