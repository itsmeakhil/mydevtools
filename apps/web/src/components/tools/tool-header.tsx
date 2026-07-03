'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getRouteConfig } from '@/lib/route-config';
import { usePinnedToolsStore, usePinnedToolsForActiveWorkspace } from '@/store/pinned-tools-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import { normalizePinnedToolPath } from '@/lib/pinned-tools-path';
import { cn } from '@/lib/utils';

export function ToolPinButton({
  toolId,
  className,
  iconClassName,
}: {
  toolId: string;
  className?: string;
  iconClassName?: string;
}) {
  const pinnedTools = usePinnedToolsForActiveWorkspace();
  const togglePinKeyed = usePinnedToolsStore((s) => s.togglePin);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const togglePin = (id: string) => {
    if (activeWorkspaceId) togglePinKeyed(activeWorkspaceId, id)
  };
  const canonical = normalizePinnedToolPath(toolId);
  const isPinned = pinnedTools.includes(canonical);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    togglePin(toolId);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleFavoriteClick}
      className={cn(
        'shrink-0 text-muted-foreground hover:text-foreground',
        className
      )}
      aria-label={isPinned ? 'Remove from pinned' : 'Pin to sidebar'}
    >
      <Heart
        className={cn('h-4 w-4', isPinned && 'fill-current', iconClassName)}
      />
    </Button>
  );
}

interface ToolHeaderProps {
  title?: string;
  description?: string;
  toolId: string;
  className?: string;
}

export function ToolHeader({ title, description, toolId, className }: ToolHeaderProps) {
  const hasHeading = Boolean(title?.trim()) || Boolean(description?.trim());

  if (!hasHeading) {
    return (
      <CardHeader
        className={cn(
          'flex flex-row items-center justify-end space-y-0 p-2 sm:p-3',
          className
        )}
      >
        <ToolPinButton toolId={toolId} className="h-8 w-8" iconClassName="h-5 w-5" />
      </CardHeader>
    );
  }

  // Compact single-row header — the tool's identity already lives in the tab
  // and sidebar, so the in-page header stays out of the content's way.
  const Icon = getRouteConfig(normalizePinnedToolPath(toolId))?.icon;

  return (
    <CardHeader
      className={cn(
        'flex flex-row items-center gap-3 space-y-0 border-b border-border/40 px-4 py-3 sm:px-5',
        className
      )}
    >
      {Icon ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary ring-1 ring-inset ring-border/50">
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
      <ToolPinButton toolId={toolId} className="h-8 w-8" />
    </CardHeader>
  );
}
