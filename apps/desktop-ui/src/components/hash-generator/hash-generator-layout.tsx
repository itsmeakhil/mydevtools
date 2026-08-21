'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { useDebouncedCallback } from 'use-debounce';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Upload, X } from 'lucide-react';
import { HASH_ALGORITHMS, computeHash, verifyBcrypt, type HashAlgorithmId } from '@/lib/hash-digest';
import { compareHashes } from '@/lib/compare-hashes';
import { useBcryptWorker } from '@/hooks/use-bcrypt-worker';
import { cn } from '@/lib/utils';
import { useAutoCopyStore } from '@/store/auto-copy-store';
import { useSearchParams } from 'next/navigation';
import { IconHash } from '@tabler/icons-react';
import { ToolShell } from '@/components/tools/tool-shell';
import { CopyTextButton } from '@/components/tools/copy-text-button';
import { ToolErrorBanner } from '@/components/tools/tool-error-banner';

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
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard();
  const [fileError, setFileError] = useState<string | null>(null);
  const autoCopy = useAutoCopyStore((state) => state.autoCopy);
  const [expectedHash, setExpectedHash] = useState('');
  const [bcryptMatch, setBcryptMatch] = useState<boolean | null>(null);

  const textBytes = useMemo(() => new TextEncoder().encode(text), [text]);
  const { hash: bcryptHash } = useBcryptWorker();

  // With bcrypt on the main thread, computes could never interleave (the tab
  // was frozen). A 15-round worker hash resolves seconds later, so a stale
  // result could overwrite a newer one — latest request wins.
  const computeSeqRef = useRef(0);

  const runCompute = useCallback(async () => {
    const seq = ++computeSeqRef.current;
    if (algorithm === 'BCRYPT') {
      if (!text) {
        setHashOut('');
        return;
      }
      setHashing(true);
      try {
        const result = await bcryptHash(text, bcryptRounds);
        if (seq === computeSeqRef.current) setHashOut(result);
      } catch {
        if (seq === computeSeqRef.current) setHashOut('');
      } finally {
        if (seq === computeSeqRef.current) setHashing(false);
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
      const result = await computeHash(algorithm, data);
      if (seq === computeSeqRef.current) setHashOut(result);
    } catch {
      if (seq === computeSeqRef.current) setHashOut('');
    } finally {
      if (seq === computeSeqRef.current) setHashing(false);
    }
  }, [algorithm, bcryptRounds, text, mode, textBytes, fileBytes, bcryptHash]);

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

  const handleCopy = useCallback(() => {
    if (!hashOut) return;
    void copyToClipboard(hashOut, { silent: true });
  }, [hashOut, copyToClipboard]);

  useEffect(() => {
    if (autoCopy && hashOut) {
      void handleCopy();
    }
  }, [hashOut, autoCopy, handleCopy]);

  const inputSize = mode === 'text' ? textBytes.length : fileBytes?.length ?? 0;
  const isBcrypt = algorithm === 'BCRYPT';

  // Digest verify: plain string compare against the rendered output.
  const digestMatch = useMemo(() => {
    if (isBcrypt || !hashOut || !expectedHash.trim()) return null;
    return compareHashes(expectedHash, hashOut);
  }, [isBcrypt, expectedHash, hashOut]);

  // Bcrypt verify is a different code path: the pasted hash embeds the salt,
  // so the *password in the text input* is checked with bcrypt.compare.
  useEffect(() => {
    if (!isBcrypt) {
      setBcryptMatch(null);
      return;
    }
    const candidate = expectedHash.trim();
    if (!candidate || !text) {
      setBcryptMatch(null);
      return;
    }
    let cancelled = false;
    void verifyBcrypt(text, candidate).then((ok) => {
      if (!cancelled) setBcryptMatch(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [isBcrypt, expectedHash, text]);

  const verifyMatch = isBcrypt ? bcryptMatch : digestMatch;

  return (
    <ToolShell icon={IconHash} title={t('title')} description={t('subtitle')}>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4 overflow-auto rounded-lg border border-border bg-card p-4">
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
              {fileError && <ToolErrorBanner message={fileError} />}
              <p className="text-xs text-muted-foreground">
                {t('fileHint', { maxMb: MAX_FILE_BYTES / (1024 * 1024) })}
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex flex-col gap-3 overflow-auto rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {isBcrypt ? t('outputLabelBcrypt') : t('outputLabel')}
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t('byteCount', { count: inputSize })}
              </span>
              <CopyTextButton
                onCopy={handleCopy}
                copied={copied}
                disabled={!hashOut}
                label={isBcrypt ? t('copyBcrypt') : t('copyHash')}
                copiedLabel={t('copied')}
              />
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
          <div className="space-y-2 border-t pt-3">
            <Label
              htmlFor="hash-verify"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t('verifyLabel')}
            </Label>
            <Input
              id="hash-verify"
              value={expectedHash}
              onChange={(e) => setExpectedHash(e.target.value)}
              placeholder={isBcrypt ? t('verifyPlaceholderBcrypt') : t('verifyPlaceholder')}
              className="font-mono text-sm"
              spellCheck={false}
              autoComplete="off"
            />
            {isBcrypt && expectedHash.trim() !== '' && (
              <p className="text-xs text-muted-foreground">{t('verifyHintBcrypt')}</p>
            )}
            {verifyMatch !== null && (
              <p
                role="status"
                className={cn(
                  'flex items-center gap-1.5 text-sm font-medium',
                  verifyMatch ? 'text-green-600 dark:text-green-500' : 'text-destructive'
                )}
              >
                {verifyMatch ? <Check className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
                {verifyMatch ? t('verifyMatch') : t('verifyMismatch')}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{isBcrypt ? t('securityNoteBcrypt') : t('securityNote')}</p>
        </div>
      </div>
    </ToolShell>
  );
}
