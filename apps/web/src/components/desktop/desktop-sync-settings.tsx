"use client";

import { useEffect, useState } from "react";
import { Cloud, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useOnlineSession } from "@/hooks/use-online-session";
import { isDesktop } from "@/lib/desktop/is-desktop";

/**
 * Desktop-only settings card: cloud sign-in + the personal-workspace sync
 * toggle. Renders nothing on web.
 */
export function DesktopSyncSettings() {
  const { online, hasCloudSession } = useOnlineSession();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isDesktop()) return;
    void import("@/lib/desktop/sync-engine").then(({ isSyncEnabled }) =>
      isSyncEnabled().then(setEnabled).catch(() => {})
    );
  }, []);

  if (!isDesktop()) return null;

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      const { setSyncEnabled } = await import("@/lib/desktop/sync-engine");
      await setSyncEnabled(next);
      setEnabled(next);
    } finally {
      setBusy(false);
    }
  };

  const signIn = async () => {
    const { startCloudSignIn } = await import("@/lib/desktop/cloud-signin");
    await startCloudSignIn();
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { syncNow } = await import("@/lib/desktop/sync-engine");
      await syncNow();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <Cloud className="h-5 w-5" />
          Cloud Sync
        </CardTitle>
        <CardDescription>
          Your data lives on this Mac. Turn on sync to back up your personal
          workspace to MyDevTools Cloud and share it with the web app. Shared
          workspaces always live in the cloud.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasCloudSession ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {online
                ? "Sign in to enable sync and shared workspaces."
                : "You're offline — sign-in and sync will be available when you're back online."}
            </p>
            <Button onClick={signIn} disabled={!online}>
              Sign in
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="desktop-sync-toggle">Sync personal workspace</Label>
                <p className="text-sm text-muted-foreground">
                  Two-way sync; the most recent edit wins on conflicts.
                </p>
              </div>
              <Switch
                id="desktop-sync-toggle"
                checked={enabled}
                disabled={busy}
                onCheckedChange={(v) => void toggle(v)}
              />
            </div>
            {enabled && (
              <Button variant="outline" size="sm" onClick={() => void syncNow()} disabled={syncing}>
                <RefreshCw className={syncing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
