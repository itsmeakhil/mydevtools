"use client";

import { useOnlineSession } from "@/hooks/use-online-session";
import { isDesktop } from "@/lib/desktop/is-desktop";
import { WifiOff } from "lucide-react";

/**
 * Wrap tool pages that need a network connection even on desktop. On web (or
 * when the desktop app is online) it renders children untouched. No account
 * required — these tools talk to third-party endpoints directly.
 */
export function DesktopOnlineGate({
  toolName,
  children,
}: {
  toolName: string;
  children: React.ReactNode;
}) {
  const { online } = useOnlineSession();

  if (!isDesktop() || online) return <>{children}</>;

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <WifiOff className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-lg font-semibold">{toolName} needs a network connection</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        You&apos;re offline. {toolName} needs a network connection; everything
        else keeps working locally.
      </p>
    </div>
  );
}
