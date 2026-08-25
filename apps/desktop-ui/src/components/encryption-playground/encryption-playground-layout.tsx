'use client';

import { useCallback, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Copy, Check } from 'lucide-react';
import {
  PBKDF2_ITER_DEFAULT,
  bundleToPrettyJson,
  decryptAesGcmPlayground,
  encryptAesGcmPlayground,
  parseEncryptedBundle,
  type AesBits,
  type RawKeyEncoding,
} from '@/lib/aes-gcm-playground';
import { cn } from '@/lib/utils';
import { mapEncryptError, mapDecryptError } from './error-mapping';
import { IconShieldLock } from '@tabler/icons-react';
import { ToolShell } from '@/components/tools/tool-shell';
import { ToolPanels, IOPanel, ToolTextArea } from '@/components/tools/io-panel';

const AES_BITS: AesBits[] = [128, 192, 256];

export function EncryptionPlaygroundLayout() {
  const t = useTranslations('EncryptionPlayground');
  const [tab, setTab] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [mode, setMode] = useState<'raw' | 'passphrase'>('passphrase');
  const [aesBits, setAesBits] = useState<AesBits>(256);
  const [rawKeyEncoding, setRawKeyEncoding] = useState<RawKeyEncoding>('auto');
  const [rawKeyInput, setRawKeyInput] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [pbkdf2Iter, setPbkdf2Iter] = useState(String(PBKDF2_ITER_DEFAULT));
  const [plaintext, setPlaintext] = useState('');
  const [decryptBundleInput, setDecryptBundleInput] = useState('');
  const [bundleJson, setBundleJson] = useState('');
  const [decryptedOut, setDecryptedOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [errEncrypt, setErrEncrypt] = useState<string | null>(null);
  const [errDecrypt, setErrDecrypt] = useState<string | null>(null);
  const { isCopied: copiedEnc, copyToClipboard: copyEncFn } = useCopyToClipboard();
  const { isCopied: copiedDec, copyToClipboard: copyDecFn } = useCopyToClipboard();

  const iterNum = Math.max(0, Math.floor(Number(pbkdf2Iter) || 0));

  const runEncrypt = useCallback(async () => {
    setErrEncrypt(null);
    setBusy(true);
    try {
      if (mode === 'raw' && !rawKeyInput.trim()) {
        setErrEncrypt(t('errors.emptyKey'));
        return;
      }
      if (mode === 'passphrase' && !passphrase) {
        setErrEncrypt(t('errors.emptyPassphrase'));
        return;
      }
      const b = await encryptAesGcmPlayground({
        plaintext,
        mode,
        rawKeyInput,
        rawKeyEncoding,
        passphrase,
        aesBits,
        pbkdf2Iter: iterNum || PBKDF2_ITER_DEFAULT,
      });
      setBundleJson(bundleToPrettyJson(b));
    } catch (e) {
      const code = e instanceof Error ? e.message : 'unknown';
      setBundleJson('');
      setErrEncrypt(mapEncryptError(t, code));
    } finally {
      setBusy(false);
    }
  }, [plaintext, mode, rawKeyInput, rawKeyEncoding, passphrase, aesBits, iterNum, t]);

  const runDecrypt = useCallback(async () => {
    setErrDecrypt(null);
    setDecryptedOut('');
    setBusy(true);
    try {
      const bundle = parseEncryptedBundle(decryptBundleInput);
      const text = await decryptAesGcmPlayground(bundle, {
        rawKeyInput,
        rawKeyEncoding,
        passphrase,
      });
      setDecryptedOut(text);
    } catch (e) {
      const code = e instanceof Error ? e.message : 'unknown';
      setErrDecrypt(mapDecryptError(t, code));
    } finally {
      setBusy(false);
    }
  }, [decryptBundleInput, rawKeyInput, rawKeyEncoding, passphrase, t]);

  const copyEnc = () => {
    if (!bundleJson) return;
    void copyEncFn(bundleJson, { silent: true });
  };

  const copyDec = () => {
    if (!decryptedOut) return;
    void copyDecFn(decryptedOut, { silent: true });
  };

  const copyEncAction = (
    <Button type="button" size="sm" variant="secondary" className="h-7" disabled={!bundleJson} onClick={copyEnc}>
      {copiedEnc ? (
        <Check className="mr-1.5 h-4 w-4 text-emerald-600" />
      ) : (
        <Copy className="mr-1.5 h-4 w-4" />
      )}
      {copiedEnc ? t('copied') : t('copyBundle')}
    </Button>
  );

  const copyDecAction = (
    <Button type="button" size="sm" variant="secondary" className="h-7" disabled={!decryptedOut} onClick={copyDec}>
      {copiedDec ? (
        <Check className="mr-1.5 h-4 w-4 text-emerald-600" />
      ) : (
        <Copy className="mr-1.5 h-4 w-4" />
      )}
      {copiedDec ? t('copied') : t('copyPlaintext')}
    </Button>
  );

  return (
    <ToolShell icon={IconShieldLock} title={t('title')} description={t('subtitle')}>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as 'encrypt' | 'decrypt')}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <TabsList className="grid w-full max-w-md shrink-0 grid-cols-2">
          <TabsTrigger value="encrypt">{t('tabEncrypt')}</TabsTrigger>
          <TabsTrigger value="decrypt">{t('tabDecrypt')}</TabsTrigger>
        </TabsList>

        {tab === 'encrypt' ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="shrink-0 space-y-4 overflow-auto rounded-lg border border-border bg-card p-4">
              <div className="space-y-3">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('keyModeLabel')}
                </Label>
                <RadioGroup
                  value={mode}
                  onValueChange={(v) => setMode(v as 'raw' | 'passphrase')}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="passphrase" id="mode-pass" />
                    <Label htmlFor="mode-pass" className="cursor-pointer font-normal">
                      {t('modePassphrase')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="raw" id="mode-raw" />
                    <Label htmlFor="mode-raw" className="cursor-pointer font-normal">
                      {t('modeRawKey')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {mode === 'raw' ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t('aesBitsLabel')}
                    </Label>
                    <Select value={String(aesBits)} onValueChange={(v) => setAesBits(Number(v) as AesBits)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AES_BITS.map((b) => (
                          <SelectItem key={b} value={String(b)}>
                            {t(`aesBits.${b}` as 'aesBits.256')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t('rawEncodingLabel')}
                    </Label>
                    <Select
                      value={rawKeyEncoding}
                      onValueChange={(v) => setRawKeyEncoding(v as RawKeyEncoding)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">{t('encodingAuto')}</SelectItem>
                        <SelectItem value="hex">{t('encodingHex')}</SelectItem>
                        <SelectItem value="base64">{t('encodingBase64')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ep-raw-key">{t('rawKeyLabel')}</Label>
                    <Textarea
                      id="ep-raw-key"
                      value={rawKeyInput}
                      onChange={(e) => setRawKeyInput(e.target.value)}
                      placeholder={t('rawKeyPlaceholder')}
                      className="min-h-[88px] resize-y font-mono text-sm"
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t('aesBitsLabel')}
                    </Label>
                    <Select value={String(aesBits)} onValueChange={(v) => setAesBits(Number(v) as AesBits)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AES_BITS.map((b) => (
                          <SelectItem key={b} value={String(b)}>
                            {t(`aesBits.${b}` as 'aesBits.256')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ep-pass">{t('passphraseLabel')}</Label>
                    <Input
                      id="ep-pass"
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder={t('passphrasePlaceholder')}
                      autoComplete="off"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ep-iter">{t('pbkdf2IterLabel')}</Label>
                    <Input
                      id="ep-iter"
                      type="number"
                      min={10_000}
                      max={2_000_000}
                      value={pbkdf2Iter}
                      onChange={(e) => setPbkdf2Iter(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">{t('pbkdf2Hint')}</p>
                  </div>
                </>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => void runEncrypt()} disabled={busy}>
                  {t('encryptButton')}
                </Button>
                {errEncrypt && <p className="text-sm text-destructive">{errEncrypt}</p>}
              </div>
            </div>

            <ToolPanels className="lg:grid-cols-2">
              <IOPanel label={t('plaintextLabel')}>
                <ToolTextArea
                  id="ep-plain"
                  value={plaintext}
                  onChange={(e) => setPlaintext(e.target.value)}
                  placeholder={t('plaintextPlaceholder')}
                  spellCheck
                />
              </IOPanel>

              <IOPanel label={t('bundleOutputLabel')} actions={copyEncAction}>
                <ToolTextArea
                  readOnly
                  value={bundleJson}
                  placeholder={t('emptyBundleHint')}
                  className={cn('text-xs', busy && 'opacity-60')}
                />
              </IOPanel>
            </ToolPanels>

            <p className="shrink-0 text-xs text-muted-foreground">{t('securityNote')}</p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="shrink-0 space-y-4 overflow-auto rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{t('decryptKeyHint')}</p>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('rawEncodingLabel')}
                </Label>
                <Select
                  value={rawKeyEncoding}
                  onValueChange={(v) => setRawKeyEncoding(v as RawKeyEncoding)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t('encodingAuto')}</SelectItem>
                    <SelectItem value="hex">{t('encodingHex')}</SelectItem>
                    <SelectItem value="base64">{t('encodingBase64')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-raw-key-dec">{t('rawKeyLabel')}</Label>
                <Textarea
                  id="ep-raw-key-dec"
                  value={rawKeyInput}
                  onChange={(e) => setRawKeyInput(e.target.value)}
                  placeholder={t('rawKeyPlaceholderDecrypt')}
                  className="min-h-[72px] resize-y font-mono text-sm"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-pass-dec">{t('passphraseLabel')}</Label>
                <Input
                  id="ep-pass-dec"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder={t('passphrasePlaceholderDecrypt')}
                  autoComplete="off"
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => void runDecrypt()} disabled={busy}>
                  {t('decryptButton')}
                </Button>
                {errDecrypt && <p className="text-sm text-destructive">{errDecrypt}</p>}
              </div>
            </div>

            <ToolPanels className="lg:grid-cols-2">
              <IOPanel label={t('bundleInputLabel')}>
                <ToolTextArea
                  id="ep-bundle-in"
                  value={decryptBundleInput}
                  onChange={(e) => setDecryptBundleInput(e.target.value)}
                  placeholder={t('bundlePlaceholder')}
                  className="text-xs"
                />
              </IOPanel>

              <IOPanel label={t('plaintextOutputLabel')} actions={copyDecAction}>
                <ToolTextArea
                  readOnly
                  value={decryptedOut}
                  placeholder={t('emptyDecryptHint')}
                  className={cn(busy && 'opacity-60')}
                />
              </IOPanel>
            </ToolPanels>

            <p className="shrink-0 text-xs text-muted-foreground">{t('securityNote')}</p>
          </div>
        )}
      </Tabs>
    </ToolShell>
  );
}

