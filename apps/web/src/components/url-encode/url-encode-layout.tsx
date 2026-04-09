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

type Mode = 'encode' | 'decode';

export function UrlEncodeLayout() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<Mode>('encode');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processInput = useCallback((text: string, currentMode: Mode) => {
    setInput(text);
    setError('');

    if (!text) {
      setOutput('');
      return;
    }

    try {
      if (currentMode === 'encode') {
        setOutput(encodeURIComponent(text));
      } else {
        setOutput(decodeURIComponent(text.trim()));
      }
    } catch {
      setError(
        currentMode === 'decode'
          ? 'Invalid percent-encoding. Check for incomplete % pairs or bad escape sequences.'
          : 'Could not encode (invalid Unicode in input).'
      );
      setOutput('');
    }
  }, []);

  const handleInputChange = (value: string) => {
    processInput(value, mode);
  };

  const toggleMode = () => {
    const newMode = mode === 'encode' ? 'decode' : 'encode';
    setMode(newMode);
    if (output) {
      processInput(output, newMode);
    } else {
      processInput(input, newMode);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError('');
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processInput(text, mode);
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'encode' ? 'url-encoded.txt' : 'url-decoded.txt';
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">URL Encoder / Decoder</h1>
          <p className="text-xs text-muted-foreground">
            Percent-encode or decode text using encodeURIComponent / decodeURIComponent (UTF-8)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.json,.xml,.html,.css,.js,.ts,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = '';
            }}
          />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center shrink-0">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/50">
          <button
            type="button"
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
            Encode
          </button>
          <button
            type="button"
            onClick={toggleMode}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
            title="Swap input and output"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
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
            Decode
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
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
                {mode === 'encode' ? 'Plain text' : 'Encoded input'}
              </Label>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {charCount.toLocaleString()} chars
            </span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={
                mode === 'encode'
                  ? 'Enter text to percent-encode (e.g. query string values)…'
                  : 'Paste percent-encoded text to decode…'
              }
              className="absolute inset-0 w-full h-full resize-none bg-transparent p-4 text-sm font-mono focus:outline-none placeholder:text-muted-foreground/50"
              spellCheck={false}
            />
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/5 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2 text-primary">
                  <Upload className="h-8 w-8" />
                  <span className="text-sm font-medium">Drop file here</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {mode === 'encode' ? 'Encoded output' : 'Decoded text'}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {outputCharCount.toLocaleString()} chars
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleDownload}
                disabled={!output}
                title="Download output"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopy}
                disabled={!output}
                title="Copy to clipboard"
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
                placeholder="Output will appear here…"
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
