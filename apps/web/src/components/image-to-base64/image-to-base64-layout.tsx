'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Copy,
  Check,
  Trash2,
  Upload,
  Download,
  Image as ImageIcon,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { IconPhoto } from '@tabler/icons-react';
import { ToolPageHeader } from '@/components/tools/tool-page-header';
import { RevealItem } from '@/components/dashboard/dashboard-reveal';
import { CATEGORY_ACCENT } from '@/components/dashboard/types';

type Mode = 'dataUri' | 'rawString';

export function ImageToBase64Layout() {
  const t = useTranslations('ImageToBase64');
  const [output, setOutput] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('dataUri');
  const [error, setError] = useState('');
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    // Basic file size check, say 5MB, to prevent browser freeze
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(t('fileTooLarge'));
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target?.result as string;
      setPreviewUrl(dataUri);
      setOutput(dataUri);
    };
    reader.onerror = () => {
      setError('Error reading file');
    };
    reader.readAsDataURL(file);
  }, [t]);

  const handleClear = () => {
    setOutput('');
    setPreviewUrl(null);
    setError('');
  };

  const handleCopy = () => {
    const textToCopy = mode === 'rawString' ? output.replace(/^data:image\/[a-z]+;base64,/, '') : output;
    if (!textToCopy) return;
    void copyToClipboard(textToCopy, { silent: true });
  };

  const handleDownload = () => {
    const textToDownload = mode === 'rawString' ? output.replace(/^data:image\/[a-z]+;base64,/, '') : output;
    if (!textToDownload) return;
    const blob = new Blob([textToDownload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t('download.filename');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const currentOutput = output ? (mode === 'rawString' ? output.replace(/^data:image\/\w+;base64,/, '') : output) : '';
  const outputCharCount = currentOutput.length;

  return (
    <div className="relative flex flex-col h-full gap-4 overflow-hidden dashboard-grid-bg">
      <div className="dash-ambient -z-10" aria-hidden />

      <RevealItem index={0}>
        <ToolPageHeader
          icon={IconPhoto}
          title={t('title')}
          description={t('subtitle')}
          accent={CATEGORY_ACCENT.Converters}
        />
      </RevealItem>

      {/* Mobile upload/clear actions */}
      <div className="flex items-center gap-2 shrink-0 md:hidden">
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
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && file.type.startsWith('image/')) processFile(file);
            e.target.value = '';
          }}
        />
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleClear}>
          <Trash2 className="h-3.5 w-3.5" />
          {t('clear')}
        </Button>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center justify-center shrink-0">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/50">
          <button
            onClick={() => setMode('dataUri')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              mode === 'dataUri'
                ? 'bg-background shadow-sm text-foreground border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('modes.dataUri')}
          </button>
          <button
            onClick={() => setMode('rawString')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              mode === 'rawString'
                ? 'bg-background shadow-sm text-foreground border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('modes.rawString')}
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
        {/* Input */}
        <Card
          className={cn(
            'flex flex-col overflow-hidden transition-colors relative',
            isDragging && 'border-primary/50 bg-primary/5',
            !previewUrl && 'border-dashed'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('panels.imageInput')}
              </Label>
            </div>
            {previewUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-2"
                onClick={handleClear}
                title={t('clear')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0 relative flex items-center justify-center p-4">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-full object-contain rounded-md"
              />
            ) : (
              <div 
                className="flex flex-col items-center gap-4 text-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-4 rounded-full bg-muted/50">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{t('dropHere')}</p>
                  <p className="text-xs text-muted-foreground">{t('placeholders.uploadImage')}</p>
                </div>
                {error && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive mt-2">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Overlay when dragging */}
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-2 text-primary">
                  <Upload className="h-8 w-8 animate-bounce" />
                  <span className="text-sm font-medium">{t('dropHere')}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Output */}
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('panels.output')}
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
                disabled={!currentOutput}
                title={t('download.title')}
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopy}
                disabled={!currentOutput}
                title={t('copyTitle')}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            <textarea
              value={currentOutput}
              readOnly
              className="absolute inset-0 w-full h-full resize-none bg-transparent p-4 text-sm font-mono focus:outline-none placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
