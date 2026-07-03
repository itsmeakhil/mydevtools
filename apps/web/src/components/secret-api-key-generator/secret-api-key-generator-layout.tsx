'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { Download, RefreshCw } from 'lucide-react';
import { IconCircleKeyFilled } from '@tabler/icons-react';
import { CATEGORY_ACCENT } from '@/components/dashboard/types';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { CopyIconButton } from '@/components/tools/copy-icon-button';
import { ToolErrorBanner } from '@/components/tools/tool-error-banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  dedupeAlphabet,
  generateSecretStrings,
  MAX_ALPHABET_UNIQUE,
  MAX_SECRET_BULK,
  MAX_SECRET_LENGTH,
  type GenerateSecretStringsErrorKey,
} from '@/lib/generate-secret-strings';

const PRESET_BASE64URL =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const PRESET_ALPHANUMERIC =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const PRESET_HEX = '0123456789abcdef';
const PRESET_ASCII_PRINTABLE = Array.from({ length: 94 }, (_, i) =>
  String.fromCharCode(33 + i)
).join('');

type PresetId = 'base64url' | 'alphanumeric' | 'hex' | 'asciiPrintable';

const PRESETS: { id: PresetId; value: string }[] = [
  { id: 'base64url', value: PRESET_BASE64URL },
  { id: 'alphanumeric', value: PRESET_ALPHANUMERIC },
  { id: 'hex', value: PRESET_HEX },
  { id: 'asciiPrintable', value: PRESET_ASCII_PRINTABLE },
];

function formatGenerateError(
  t: ReturnType<typeof useTranslations<'SecretApiKeyGenerator'>>,
  key: GenerateSecretStringsErrorKey
): string {
  const maxAlpha = MAX_ALPHABET_UNIQUE.toLocaleString();
  const maxLen = MAX_SECRET_LENGTH.toLocaleString();
  const maxBulk = MAX_SECRET_BULK.toLocaleString();
  switch (key) {
    case 'emptyAlphabet':
      return t('errors.emptyAlphabet');
    case 'alphabetTooLong':
      return t('errors.alphabetTooLong', { maxAlpha });
    case 'lengthOutOfRange':
      return t('errors.lengthOutOfRange', { maxLen });
    case 'countOutOfRange':
      return t('errors.countOutOfRange', { maxBulk });
    default:
      return t('errors.unknown');
  }
}

export function SecretApiKeyGeneratorLayout() {
  const t = useTranslations('SecretApiKeyGenerator');
  const [alphabet, setAlphabet] = useState(PRESET_ALPHANUMERIC);
  const [length, setLength] = useState(32);
  const [count, setCount] = useState(5);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const { isCopied: copied, copyToClipboard, reset: resetCopied } = useCopyToClipboard();

  const dedupedPreview = useMemo(() => dedupeAlphabet(alphabet), [alphabet]);

  const applyPreset = useCallback((value: string) => {
    setAlphabet(value);
  }, []);

  const runGenerate = useCallback(() => {
    setError('');
    resetCopied();
    try {
      const result = generateSecretStrings({
        alphabet,
        length: Number(length),
        count: Number(count),
      });
      if (!result.ok) {
        setOutput('');
        setError(formatGenerateError(t, result.errorKey));
        return;
      }
      setOutput(result.lines.join('\n'));
    } catch {
      setOutput('');
      setError(t('errors.unknown'));
    }
  }, [alphabet, length, count, t, resetCopied]);

  const handleCopy = () => {
    if (!output) return;
    void copyToClipboard(output, { silent: true });
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t('download.filename');
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />
      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconCircleKeyFilled}
          title={t('title')}
          description={t.rich('subtitle', {
            max: MAX_SECRET_BULK.toLocaleString(),
            uuid: (chunks) => (
              <Link
                href="/app/uuid-generator"
                className="font-medium text-primary underline underline-offset-2 hover:no-underline"
              >
                {chunks}
              </Link>
            ),
          })}
          accent={CATEGORY_ACCENT.Generators}
        />
      </RevealItem>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 overflow-auto p-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('presetsLabel')}
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => applyPreset(p.value)}
                >
                  {t(`preset.${p.id}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor="secret-alphabet"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {t('alphabetLabel')}
              </Label>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {t('alphabetCount', { count: dedupedPreview.length.toLocaleString() })}
              </span>
            </div>
            <Textarea
              id="secret-alphabet"
              value={alphabet}
              onChange={(e) => setAlphabet(e.target.value)}
              spellCheck={false}
              rows={4}
              className="min-h-[88px] resize-y font-mono text-sm"
            />
            <p className="text-[11px] leading-snug text-muted-foreground">{t('alphabetHint')}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="secret-length"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {t('lengthLabel', { maxLen: MAX_SECRET_LENGTH.toLocaleString() })}
              </Label>
              <Input
                id="secret-length"
                type="number"
                min={1}
                max={MAX_SECRET_LENGTH}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="secret-count"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {t('countLabel', { maxBulk: MAX_SECRET_BULK.toLocaleString() })}
              </Label>
              <Input
                id="secret-count"
                type="number"
                min={1}
                max={MAX_SECRET_BULK}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="gradient" onClick={runGenerate} className="w-full gap-1.5 sm:w-auto">
              <RefreshCw className="h-3.5 w-3.5" />
              {t('generate')}
            </Button>
          </div>
        </Card>

        <Card className="flex min-h-[280px] flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-4 py-2.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('output')}
            </Label>
            <div className="flex shrink-0 items-center gap-1">
              <span className="mr-1 text-[10px] tabular-nums text-muted-foreground">
                {t('lines', {
                  count: output ? output.split('\n').length.toLocaleString() : '0',
                })}
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
              <CopyIconButton
                onCopy={handleCopy}
                copied={copied}
                disabled={!output}
                label={t('copyTitle')}
                className="h-7 w-7"
              />
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            {error ? (
              <div className="p-4">
                <ToolErrorBanner message={error} />
              </div>
            ) : (
              <textarea
                value={output}
                readOnly
                placeholder={t('outputPlaceholder')}
                className="absolute inset-0 h-full w-full resize-none bg-transparent p-4 font-mono text-sm placeholder:text-muted-foreground/50 focus:outline-none"
                spellCheck={false}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
