"use client";

import { Button } from "@/components/ui/button";
import { useOnlineSession } from "@/hooks/use-online-session";
import { isDesktop } from "@/lib/desktop/is-desktop";
import { CloudOff, Wifi } from "lucide-react";

/**
 * Wrap tool pages that require the cloud even on desktop. On web (or when the
 * desktop app is online with a cloud session) it renders children untouched.
 */
export function DesktopOnlineGate({
  toolName,
  children,
}: {
  toolName: string;
  children: React.ReactNode;
}) {
  const { online, hasCloudSession, ready } = useOnlineSession();

  if (!isDesktop() || ready) return <>{children}</>;

  const signIn = async () => {
    const { startCloudSignIn } = await import("@/lib/desktop/cloud-signin");
    await startCloudSignIn();
  };

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      {online ? (
        <CloudOff className="h-12 w-12 text-muted-foreground" />
      ) : (
        <Wifi className="h-12 w-12 text-muted-foreground" />
      )}
      <h2 className="text-lg font-semibold">{toolName} needs the cloud</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {online
          ? `${toolName} works with your MyDevTools cloud account. Sign in to continue — your other tools keep working offline.`
          : `You're offline. ${toolName} needs a network connection; everything else keeps working locally.`}
      </p>
      {online && !hasCloudSession && (
        <Button onClick={signIn}>Sign in to MyDevTools Cloud</Button>
      )}
    </div>
  );
}
