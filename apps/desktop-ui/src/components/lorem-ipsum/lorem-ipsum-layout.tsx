'use client';

import { useCallback, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
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
import { Switch } from '@/components/ui/switch';
import { Download, RefreshCw } from 'lucide-react';
import { IconQuote } from '@tabler/icons-react';
import { CATEGORY_ACCENT } from '@/components/dashboard/types';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { CopyIconButton } from '@/components/tools/copy-icon-button';
import {
  generateLorem,
  LOREM_LIMITS,
  type LoremUnit,
} from '@/lib/lorem-ipsum';
import { useTranslations } from 'next-intl';

const UNIT_VALUES: LoremUnit[] = ['paragraphs', 'sentences', 'words', 'list'];

type LoremUnitKey = 'paragraphs' | 'sentences' | 'words' | 'bulletList';
const UNIT_KEY_MAP: Record<LoremUnit, LoremUnitKey> = {
  paragraphs: 'paragraphs',
  sentences: 'sentences',
  words: 'words',
  list: 'bulletList',
};

export function LoremIpsumLayout() {
  const t = useTranslations('LoremIpsum');
  const [unit, setUnit] = useState<LoremUnit>('paragraphs');
  const [count, setCount] = useState(3);
  const [asHtml, setAsHtml] = useState(false);
  const [output, setOutput] = useState('');
  const { isCopied: copied, copyToClipboard, reset: resetCopied } = useCopyToClipboard();

  const limits = LOREM_LIMITS[unit];

  const runGenerate = useCallback(() => {
    resetCopied();
    const n = Number(count);
    setOutput(
      generateLorem({
        unit,
        count: Number.isFinite(n) ? n : limits.min,
        asHtml,
      })
    );
  }, [unit, count, asHtml, limits.min, resetCopied]);

  const handleCopy = () => {
    if (!output) return;
    void copyToClipboard(output, { silent: true });
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: asHtml ? 'text/html' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = asHtml ? 'lorem-ipsum.html' : 'lorem-ipsum.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative flex flex-col h-full gap-4 min-h-0 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconQuote}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Generators}
        />
      </RevealItem>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        <Card className="flex flex-col gap-4 p-4 overflow-auto">
          <div className="space-y-2">
            <Label
              htmlFor="lorem-unit"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              {t('outputType')}
            </Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as LoremUnit)}>
              <SelectTrigger id="lorem-unit" className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_VALUES.map((value) => (
                  <SelectItem key={value} value={value} className="text-sm">
                    {t(UNIT_KEY_MAP[value])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="lorem-count"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              {t('count')} ({limits.min}–{limits.max.toLocaleString()})
            </Label>
            <Input
              id="lorem-count"
              type="number"
              min={limits.min}
              max={limits.max}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
            <div className="space-y-0.5">
              <Label htmlFor="lorem-html" className="text-sm font-medium cursor-pointer">
                {t('htmlMarkup')}
              </Label>
              <p className="text-[11px] text-muted-foreground">
                {t('htmlMarkupHint')}
              </p>
            </div>
            <Switch id="lorem-html" checked={asHtml} onCheckedChange={setAsHtml} />
          </div>

          <Button type="button" onClick={runGenerate} className="gap-1.5 w-full sm:w-fit">
            <RefreshCw className="h-3.5 w-3.5" />
            {t('generate')}
          </Button>
        </Card>

        <Card className="flex flex-col overflow-hidden min-h-[280px]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30 gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('output')}
            </Label>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground tabular-nums mr-1">
                {output ? `${output.length.toLocaleString()} chars` : '—'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleDownload}
                disabled={!output}
                title={t('download')}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <CopyIconButton
                onCopy={handleCopy}
                copied={copied}
                disabled={!output}
                label={t('copy')}
                className="h-7 w-7"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            <textarea
              value={output}
              readOnly
              placeholder={t('outputPlaceholder')}
              className="absolute inset-0 w-full h-full resize-none bg-transparent p-4 text-sm leading-relaxed focus:outline-none placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
