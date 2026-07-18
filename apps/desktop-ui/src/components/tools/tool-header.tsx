'use client';

import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getRouteConfig } from '@/lib/route-config';
import { normalizePinnedToolPath } from '@/lib/pinned-tools-path';
import { toolCategoryMap } from '@/lib/tool-categories';
import { categoryAccent } from '@/components/dashboard/types';
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

export function ToolHeader({ title, description, toolId, className }: ToolHeaderProps) {
  const hasHeading = Boolean(title?.trim()) || Boolean(description?.trim());

  // Without a heading the header existed only to hold the pin button — now gone.
  if (!hasHeading) return null;

  // Compact single-row header — the tool's identity already lives in the tab
  // and sidebar, so the in-page header stays out of the content's way.
  const Icon = getRouteConfig(normalizePinnedToolPath(toolId))?.icon;
  const slug = toolId.split('/').filter(Boolean).pop() ?? toolId;
  const accent = categoryAccent(toolCategoryMap[slug] ?? '');

  return (
    <CardHeader
      className={cn(
        'flex flex-row items-center gap-3 space-y-0 border-b border-border/40 px-4 py-3 sm:px-5',
        className
      )}
    >
      {Icon ? (
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-border/50', accent.bg, accent.text)}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      ) : null}
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
