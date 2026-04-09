'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShieldOff, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToolVisibilityStore } from '@/store/tool-visibility-store';
import { motion } from 'framer-motion';

/**
 * URL-level guard for /app/* routes.
 * If the current tool is disabled in the user's tool-visibility preferences,
 * renders a "Tool Not Enabled" page instead of the tool itself.
 */
export function ToolGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const enabledTools = useToolVisibilityStore((s) => s.enabledTools);

  // Only guard /app/* routes
  if (!pathname.startsWith('/app/')) {
    return <>{children}</>;
  }

  // Normalize: strip query string and trailing slash
  const normalized = pathname.split('?')[0].replace(/\/$/, '') || pathname;

  const isEnabled = enabledTools.includes(normalized);

  if (isEnabled) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6 bg-background/50">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center text-center max-w-md space-y-6"
      >
        {/* Icon */}
        <div className="relative">
          <div className="p-5 rounded-2xl bg-muted/50 border border-border/50">
            <ShieldOff className="h-10 w-10 text-muted-foreground/70" strokeWidth={1.5} />
          </div>
          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-orange-500/80 border-2 border-background" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Tool Not Enabled</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This tool is currently disabled in your preferences. You can enable it from the Settings page to access it here.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button asChild variant="default" className="gap-2">
            <Link href="/settings">
              <Settings className="h-4 w-4" />
              Go to Settings
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
