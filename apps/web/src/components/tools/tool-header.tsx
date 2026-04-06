'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFavoriteTool } from '@/hooks/use-favorite-tool';

interface ToolHeaderProps {
  title: string;
  description?: string;
  toolId: string;
  className?: string;
}

/**
 * Reusable tool header component with favorite functionality
 */
export function ToolHeader({ title, description, toolId, className }: ToolHeaderProps) {
  const { isFavorite, toggleFavorite } = useFavoriteTool();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(toolId);
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
        aria-label={isFavorite(toolId) ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart className={`h-5 w-5 ${isFavorite(toolId) ? 'fill-current' : ''}`} />
      </Button>
    </CardHeader>
  );
}
