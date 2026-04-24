'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { usePinnedToolsStore } from '@/store/pinned-tools-store';
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
  const pinnedTools = usePinnedToolsStore((s) => s.pinnedTools);
  const togglePin = usePinnedToolsStore((s) => s.togglePin);
  const isPinned = pinnedTools.includes(toolId);

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

  return (
    <CardHeader className={cn('flex flex-row items-center justify-between space-y-0', className)}>
      <div className="flex w-full justify-center">
        <div className="w-full text-center">
          {title?.trim() ? (
            <div className="flex items-center justify-center">
              <CardTitle className="mb-2 text-2xl font-bold">{title}</CardTitle>
            </div>
          ) : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
      </div>
      <ToolPinButton toolId={toolId} iconClassName="h-5 w-5" />
    </CardHeader>
  );
}
