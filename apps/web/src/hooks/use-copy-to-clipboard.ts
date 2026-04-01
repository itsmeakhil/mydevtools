'use client';

import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Hook for copying text to clipboard with consistent toast notifications
 */
export function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (text: string, successMessage?: string) => {
    if (!text) {
      toast.error('Nothing to copy');
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success(successMessage || 'Copied to clipboard!', {
        duration: 2000,
      });
      
      // Reset copied state after animation
      setTimeout(() => setIsCopied(false), 2000);
      return true;
    } catch (err) {
      console.error("Failed to copy text:", err);
      toast.error('Failed to copy to clipboard');
      setIsCopied(false);
      return false;
    }
  };

  return {
    copyToClipboard,
    isCopied,
  };
}
