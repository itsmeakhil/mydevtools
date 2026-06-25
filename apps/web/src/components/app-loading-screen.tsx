"use client";

import { Logo } from "@/components/logo";

/**
 * Branded full-screen loading state for the authenticated shell.
 * Theme-aware (works in light and dark) — a spinning deck-gradient ring
 * orbiting the logo mark, with an indeterminate progress beam.
 */
export function AppLoadingScreen({ label = "Preparing your workspace" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mdt-loading fixed inset-0 z-[9999] flex h-[100dvh] w-[100dvw] flex-col items-center justify-center gap-7 bg-background"
    >
      <div className="mdt-loading__aura" aria-hidden />

      <div className="relative flex items-center justify-center">
        <span className="mdt-loading__ring" aria-hidden />
        <div className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-[1.4rem] bg-background/70 shadow-xl ring-1 ring-border/60 backdrop-blur-sm">
          <Logo size={42} showText={false} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3.5">
        <p className="text-sm font-medium tracking-tight text-foreground/80">
          {label}
          <span className="mdt-loading__dots" />
        </p>
        <span className="mdt-loading__bar" aria-hidden>
          <span />
        </span>
      </div>

      <span className="sr-only">Loading</span>
    </div>
  );
}
