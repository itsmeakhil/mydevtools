'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { usePinnedToolsStore } from '@/store/pinned-tools-store';

interface ToolHeaderProps {
  title: string;
  description?: string;
  toolId: string;
  className?: string;
}

export function ToolHeader({ title, description, toolId, className }: ToolHeaderProps) {
  const pinnedTools = usePinnedToolsStore((s) => s.pinnedTools);
  const togglePin = usePinnedToolsStore((s) => s.togglePin);
  const isPinned = pinnedTools.includes(toolId);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    togglePin(toolId);
  };

  return (
    <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${className || ''}`}>
      <div className="flex justify-center w-full">
        <div className="w-full text-center">
          <div className="flex justify-center items-center">
            <CardTitle className="text-2xl font-bold mb-2">{title}</CardTitle>
          </div>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleFavoriteClick}
        className="text-muted-foreground hover:text-foreground"
        aria-label={isPinned ? 'Remove from pinned' : 'Pin to sidebar'}
      >
        <Heart className={`h-5 w-5 ${isPinned ? 'fill-current' : ''}`} />
      </Button>
    </CardHeader>
  );
}
