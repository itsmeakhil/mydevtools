'use client'

import * as React from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CopyTextButtonProps {
  onCopy: () => void
  copied: boolean
  disabled?: boolean
  label: string
  copiedLabel: string
  className?: string
}

/**
 * Labeled copy button for tool action rows — icon swap plus text swap so the
 * copied state is not communicated by color alone.
 */
export function CopyTextButton({
  onCopy,
  copied,
  disabled,
  label,
  copiedLabel,
  className,
}: CopyTextButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={className}
      disabled={disabled}
      onClick={onCopy}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden />
      )}
      <span className="ml-1.5">{copied ? copiedLabel : label}</span>
    </Button>
  )
}
