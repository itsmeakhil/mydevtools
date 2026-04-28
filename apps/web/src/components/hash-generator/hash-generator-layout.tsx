'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Upload, X } from 'lucide-react';
import { HASH_ALGORITHMS, computeBcrypt, computeHash, type HashAlgorithmId } from '@/lib/hash-digest';
import { cn } from '@/lib/utils';
import { useAutoCopyStore } from '@/store/auto-copy-store';
import { useSearchParams } from 'next/navigation';
import { SendToMenu } from '@/components/ui/send-to-menu';

const MAX_FILE_BYTES = 32 * 1024 * 1024;

const BCRYPT_ROUND_OPTIONS = [4, 6, 8, 10, 12, 14, 15] as const;

const ALGO_MSG: Record<HashAlgorithmId, string> = {
  MD5: 'md5',
  'SHA-1': 'sha1',
  'SHA-256': 'sha256',
  'SHA-384': 'sha384',
  'SHA-512': 'sha512',
  BCRYPT: 'bcrypt',
};

export function HashGeneratorLayout() {
  const t = useTranslations('HashGenerator');
  const searchParams = useSearchParams();
  const initialInput = searchParams.get('input') || '';
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [algorithm, setAlgorithm] = useState<HashAlgorithmId>('SHA-256');
  const [bcryptRounds, setBcryptRounds] = useState<number>(10);
  const [text, setText] = useState(initialInput);
  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [hashOut, setHashOut] = useState('');
  const [hashing, setHashing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const autoCopy = useAutoCopyStore((state) => state.autoCopy);

  const textBytes = useMemo(() => new TextEncoder().encode(text), [text]);

  const runCompute = useCallback(async () => {
    if (algorithm === 'BCRYPT') {
      if (!text) {
        setHashOut('');
        return;
      }
      setHashing(true);
      try {
        setHashOut(await computeBcrypt(text, bcryptRounds));
      } catch {
        setHashOut('');
      } finally {
        setHashing(false);
      }
      return;
    }

    const data = mode === 'text' ? textBytes : fileBytes;
    if (!data || data.length === 0) {
      setHashOut('');
      return;
    }
    setHashing(true);
    try {
      setHashOut(await computeHash(algorithm, data));
    } catch {
      setHashOut('');
    } finally {
      setHashing(false);
    }
  }, [algorithm, bcryptRounds, text, mode, textBytes, fileBytes]);

  const debouncedCompute = useDebouncedCallback(() => {
    void runCompute();
  }, algorithm === 'BCRYPT' ? 400 : 200);

  useEffect(() => {
    if (algorithm === 'BCRYPT' && mode === 'file') {
      setMode('text');
    }
  }, [algorithm, mode]);

  useEffect(() => {
    if (mode !== 'text') return;
    debouncedCompute();
  }, [mode, textBytes, text, algorithm, bcryptRounds, debouncedCompute]);

  useEffect(() => {
    if (mode !== 'file' || algorithm === 'BCRYPT') return;
    void runCompute();
  }, [mode, fileBytes, algorithm, runCompute]);

  const handleFile = async (f: File | null) => {
    setFileError(null);
    setFile(null);
    setFileBytes(null);
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setFileError(t('errors.fileTooLarge', { maxMb: MAX_FILE_BYTES / (1024 * 1024) }));
      return;
    }
    setFile(f);
    try {
      const ab = await f.arrayBuffer();
      setFileBytes(new Uint8Array(ab));
    } catch {
      setFileError(t('errors.fileReadFailed'));
    }
  };

  const handleCopy = useCallback(async () => {
    if (!hashOut) return;
    try {
      await navigator.clipboard.writeText(hashOut);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [hashOut]);

  useEffect(() => {
    if (autoCopy && hashOut) {
      void handleCopy();
    }
  }, [hashOut, autoCopy, handleCopy]);

  const inputSize = mode === 'text' ? textBytes.length : fileBytes?.length ?? 0;
  const isBcrypt = algorithm === 'BCRYPT';

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="shrink-0 md:hidden">
        <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 overflow-auto p-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('algorithmLabel')}
            </Label>
            <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as HashAlgorithmId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HASH_ALGORITHMS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {t(`algorithms.${ALGO_MSG[a]}` as 'algorithms.md5')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isBcrypt && (
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('bcryptRoundsLabel')}
              </Label>
              <Select
                value={String(bcryptRounds)}
                onValueChange={(v) => setBcryptRounds(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BCRYPT_ROUND_OPTIONS.map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('bcryptRoundsHint')}</p>
            </div>
          )}

          <Tabs value={mode} onValueChange={(v) => setMode(v as 'text' | 'file')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">{t('modeText')}</TabsTrigger>
              <TabsTrigger value="file" disabled={isBcrypt} title={isBcrypt ? t('fileTabDisabledTitle') : undefined}>
                {t('modeFile')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="mt-3 space-y-2 data-[state=inactive]:hidden">
              <Label htmlFor="hash-input">{t('inputLabelText')}</Label>
              <Textarea
                id="hash-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={isBcrypt ? t('placeholderBcrypt') : t('placeholderText')}
                className="min-h-[180px] resize-y font-mono text-sm"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                {t('charCount', { count: text.length })}
              </p>
            </TabsContent>
            <TabsContent value="file" className="mt-3 space-y-2 data-[state=inactive]:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <Upload className="mr-1.5 h-4 w-4" />
                    {t('chooseFile')}
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </Button>
                {file && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => void handleFile(null)}>
                    <X className="mr-1.5 h-4 w-4" />
                    {t('clearFile')}
                  </Button>
                )}
              </div>
              {file && (
                <p className="text-sm text-muted-foreground">
                  {file.name} · {t('byteCount', { count: file.size })}
                </p>
              )}
              {fileError && <p className="text-sm text-destructive">{fileError}</p>}
              <p className="text-xs text-muted-foreground">
                {t('fileHint', { maxMb: MAX_FILE_BYTES / (1024 * 1024) })}
              </p>
            </TabsContent>
          </Tabs>
        </Card>

        <Card className="flex flex-col gap-3 overflow-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {isBcrypt ? t('outputLabelBcrypt') : t('outputLabel')}
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t('byteCount', { count: inputSize })}
              </span>
              <Button type="button" size="sm" variant="secondary" disabled={!hashOut} onClick={handleCopy}>
                {copied ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
                {copied ? t('copied') : isBcrypt ? t('copyBcrypt') : t('copyHash')}
              </Button>
            </div>
          </div>
          <div
            className={cn(
              'min-h-[120px] rounded-md border bg-muted/30 p-3 font-mono text-sm break-all',
              hashing && 'opacity-60'
            )}
          >
            {hashOut || (
              <span className="text-muted-foreground">
                {inputSize === 0 ? (isBcrypt ? t('emptyHintBcrypt') : t('emptyHint')) : '…'}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{isBcrypt ? t('securityNoteBcrypt') : t('securityNote')}</p>
        </Card>
      </div>
    </div>
  );
}
