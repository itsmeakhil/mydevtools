'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  ArrowRightLeft,
  Copy,
  Check,
  Trash2,
  Upload,
  Download,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { SendToMenu } from '@/components/ui/send-to-menu';

type Mode = 'encode' | 'decode';

export function Base64Layout() {
  const t = useTranslations('Base64');
  const searchParams = useSearchParams();
  const initialInput = searchParams.get('input') || '';
  const [input, setInput] = useState(initialInput);
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<Mode>('encode');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processInput = useCallback(
    (text: string, currentMode: Mode) => {
      setInput(text);
      setError('');

      if (!text.trim()) {
        setOutput('');
        return;
      }

      try {
        if (currentMode === 'encode') {
          // Encode: handle UTF-8 properly
          const encoded = btoa(
            encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, p1) =>
              String.fromCharCode(parseInt(p1, 16))
            )
          );
          setOutput(encoded);
        } else {
          // Decode: handle UTF-8 properly
          const decoded = decodeURIComponent(
            Array.from(atob(text.trim()), (c) =>
              '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
          );
          setOutput(decoded);
        }
      } catch {
        setError(currentMode === 'decode' ? t('errors.invalidBase64') : t('errors.encodeFailed'));
        setOutput('');
      }
    },
    [t]
  );

  React.useEffect(() => {
    if (initialInput) {
      processInput(initialInput, 'encode');
    }
  }, [initialInput, processInput]);

  const handleInputChange = (value: string) => {
    processInput(value, mode);
  };

  const toggleMode = () => {
    const newMode = mode === 'encode' ? 'decode' : 'encode';
    setMode(newMode);
    // Swap: use the current output as new input
    if (output) {
      processInput(output, newMode);
    } else {
      processInput(input, newMode);
    }
  };

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

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError('');
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    if (mode === 'encode') {
      // Read as text for encoding
      reader.onload = (e) => {
        const text = e.target?.result as string;
        processInput(text, mode);
      };
      reader.readAsText(file);
    } else {
      // Read as text for decoding
      reader.onload = (e) => {
        const text = e.target?.result as string;
        processInput(text, mode);
      };
      reader.readAsText(file);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'encode' ? t('download.encodedFilename') : t('download.decodedFilename');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const charCount = input.length;
  const outputCharCount = output.length;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 md:hidden">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {t('upload')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.b64,.base64,.json,.xml,.html,.css,.js,.ts,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
          />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5" />
            {t('clear')}
          </Button>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center justify-center shrink-0">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/50">
          <button
            onClick={() => {
              if (mode !== 'encode') {
                setMode('encode');
                processInput(input, 'encode');
              }
            }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              mode === 'encode'
                ? 'bg-background shadow-sm text-foreground border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('modes.encode')}
          </button>
          <button
            onClick={toggleMode}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
            title={t('swapTitle')}
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (mode !== 'decode') {
                setMode('decode');
                processInput(input, 'decode');
              }
            }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              mode === 'decode'
                ? 'bg-background shadow-sm text-foreground border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('modes.decode')}
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
        {/* Input */}
        <Card
          className={cn(
            'flex flex-col overflow-hidden transition-colors',
            isDragging && 'border-primary/50 bg-primary/5'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {mode === 'encode' ? t('panels.plainText') : t('panels.base64Input')}
              </Label>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {t('charCount', { count: charCount.toLocaleString() })}
            </span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={
                mode === 'encode'
                  ? t('placeholders.encode')
                  : t('placeholders.decode')
              }
              className="absolute inset-0 w-full h-full resize-none bg-transparent p-4 text-sm font-mono focus:outline-none placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/5 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2 text-primary">
                  <Upload className="h-8 w-8" />
                  <span className="text-sm font-medium">{t('dropHere')}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Output */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {mode === 'encode' ? t('panels.base64Output') : t('panels.decodedText')}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {t('charCount', { count: outputCharCount.toLocaleString() })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleDownload}
                disabled={!output}
                title={t('download.title')}
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopy}
                disabled={!output}
                title={t('copyTitle')}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <div className="ml-2 border-l pl-2 border-border/50">
                <SendToMenu content={output} disabled={!output} />
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-2 text-destructive">
                  <AlertCircle className="h-6 w-6" />
                  <p className="text-sm text-center">{error}</p>
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
