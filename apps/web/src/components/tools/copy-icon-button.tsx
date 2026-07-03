'use client'

import * as React from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CopyIconButtonProps {
  onCopy: () => void
  copied: boolean
  disabled?: boolean
  label: string
  className?: string
}

/**
 * Ghost icon-only copy button for a tool output panel header — the pattern
 * already shared identically by the YAML/SQL/GraphQL formatters, extracted
 * to a single source of truth.
 */
export function CopyIconButton({
  onCopy,
  copied,
  disabled,
  label,
  className,
}: CopyIconButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className ?? 'h-7 w-7 shrink-0'}
      disabled={disabled}
      title={label}
      aria-label={label}
      onClick={onCopy}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}
