'use client';

import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Check, Copy } from 'lucide-react';

export function IdRow({ id, index }: { id: string; index: number }) {
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard();

  const handleCopy = () => {
    void copyToClipboard(id, { silent: true, resetMs: 1500 });
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0 group">
      <span className="w-5 shrink-0 text-[11px] tabular-nums text-muted-foreground/50 select-none">
        {index + 1}
      </span>
      <span className="flex-1 font-mono text-[13px] leading-tight break-all text-foreground">
        {id}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 p-1.5 rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-muted active:scale-95"
        aria-label="Copy"
      >
        {copied
          ? <Check className="h-3.5 w-3.5 text-green-500" />
          : <Copy className="h-3.5 w-3.5" />
        }
      </button>
    </div>
  );
}
