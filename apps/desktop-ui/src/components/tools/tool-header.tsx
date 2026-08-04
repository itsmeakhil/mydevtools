'use client';

import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Pin/favorite toggle removed from tool pages — pinning is managed from the
// sidebar (star). Kept as a no-op so existing call sites keep compiling.
export function ToolPinButton(_props: {
  toolId: string;
  className?: string;
  iconClassName?: string;
}) {
  return null;
}

interface ToolHeaderProps {
  title?: string;
  description?: string;
  toolId: string;
  className?: string;
}

export function ToolHeader({ title, description, className }: ToolHeaderProps) {
  const hasHeading = Boolean(title?.trim()) || Boolean(description?.trim());

  // Without a heading the header existed only to hold the pin button — now gone.
  if (!hasHeading) return null;

  // Compact single-row header — the tool's identity already lives in the tab
  // and sidebar, so the in-page header stays out of the content's way (no icon).
  return (
    <CardHeader
      className={cn(
        'flex flex-row items-center gap-3 space-y-0 border-b border-border/40 px-4 py-3 sm:px-5',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        {title?.trim() ? (
          <CardTitle className="truncate text-sm font-semibold tracking-tight">{title}</CardTitle>
        ) : null}
        {description ? (
          <CardDescription className="truncate text-xs leading-tight">{description}</CardDescription>
        ) : null}
      </div>
    </CardHeader>
  );
}
