'use client';

import { ReactNode, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToolUsage } from '@/hooks/use-tool-usage';
import { usePathname } from 'next/navigation';

interface ToolWrapperProps {
  children: ReactNode;
  toolId: string;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | 'full';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-full',
};

/**
 * Base wrapper component for all tools
 * Provides consistent layout and tracks tool usage
 */
export function ToolWrapper({
  children,
  toolId,
  className = '',
  maxWidth = '4xl',
}: ToolWrapperProps) {
  const pathname = usePathname();
  const { trackToolUsage } = useToolUsage();

  // Track tool usage when component mounts
  useEffect(() => {
    trackToolUsage(toolId, pathname);
  }, [toolId, pathname, trackToolUsage]);

  return (
    <div className={`min-h-screen bg-background text-foreground p-4 ${className}`}>
      <Card className={`${maxWidthClasses[maxWidth]} mx-auto`}>
        <CardContent className="pt-6">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
