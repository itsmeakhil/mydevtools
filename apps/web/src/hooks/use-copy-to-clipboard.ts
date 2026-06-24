'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

type CopyOptions = {
  successMessage?: string;
  errorMessage?: string;
  /** When true, skip toast notifications (silent fail). */
  silent?: boolean;
  /** Milliseconds before isCopied resets. */
  resetMs?: number;
};

export function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const copyToClipboard = useCallback(async (
    text: string,
    options?: string | CopyOptions,
  ): Promise<boolean> => {
    const opts: CopyOptions =
      typeof options === 'string' ? { successMessage: options } : options ?? {};
    const { successMessage, errorMessage, silent = false, resetMs = 2000 } = opts;

    if (!text) {
      if (!silent) toast.error(errorMessage || 'Nothing to copy');
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      clearTimer();
      setIsCopied(true);
      if (!silent) {
        toast.success(successMessage || 'Copied to clipboard!', { duration: resetMs });
      }
      timerRef.current = setTimeout(() => setIsCopied(false), resetMs);
      return true;
    } catch (err) {
      console.error('Failed to copy text:', err);
      if (!silent) toast.error(errorMessage || 'Failed to copy to clipboard');
      setIsCopied(false);
      return false;
    }
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setIsCopied(false);
  }, [clearTimer]);

  return { copyToClipboard, isCopied, reset };
}
