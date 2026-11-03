"use client";

import { Logo } from "@/components/logo";

/**
 * Full-screen loading state for the app shell. Theme-aware and quiet: the logo
 * mark, a small native-style spinner and the label.
 */
export function AppLoadingScreen({ label = "Preparing your workspace" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="chrome fixed inset-0 z-[9999] flex h-[100dvh] w-[100dvw] flex-col items-center justify-center gap-5 bg-background"
    >
      <Logo size={48} showText={false} />
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-muted-foreground motion-reduce:animate-none"
        />
        <p className="text-[13px] text-muted-foreground">{label}</p>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
