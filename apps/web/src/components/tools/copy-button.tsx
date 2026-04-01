'use client';

import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Copy } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  successMessage?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
}

/**
 * Reusable copy button component with consistent behavior
 */
export function CopyButton({
  text,
  successMessage,
  variant = 'outline',
  size = 'icon',
  className = '',
  disabled = false,
}: CopyButtonProps) {
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  const handleCopy = () => {
    copyToClipboard(text, successMessage);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      disabled={disabled || !text}
      className={className}
      aria-label="Copy to clipboard"
    >
      <Copy className={`h-4 w-4 ${isCopied ? 'text-green-500' : ''}`} />
      {size !== 'icon' && <span className="ml-2">{isCopied ? 'Copied!' : 'Copy'}</span>}
    </Button>
  );
}
