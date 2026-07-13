"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isDesktop } from "@/lib/desktop/is-desktop";
import type { DownloadProgress, UpdateInfo } from "@/lib/desktop/updater";

function pct(p: DownloadProgress): number | null {
  if (!p.total) return null;
  return Math.min(100, Math.round((p.downloaded / p.total) * 100));
}

/**
 * Desktop-only "Updates" card. Checks for a newer signed build and installs it
 * in place (the app relaunches; local data is never touched). Renders nothing
 * on web.
 */
export function DesktopUpdateSettings() {
  const [version, setVersion] = useState("");
  const [checking, setChecking] = useState(false);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [upToDate, setUpToDate] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  useEffect(() => {
    if (!isDesktop()) return;
    // Show the running version, and quietly check once on open.
    void import("@/lib/desktop/updater").then(async (m) => {
      setVersion(await m.currentAppVersion());
      try {
        setUpdate(await m.checkForUpdate());
      } catch {
        // offline / endpoint unreachable — stay silent, user can retry
      }
    });
  }, []);

  if (!isDesktop()) return null;

  const check = async () => {
    setChecking(true);
    setUpToDate(false);
    try {
      const { checkForUpdate } = await import("@/lib/desktop/updater");
      const found = await checkForUpdate();
      setUpdate(found);
      setUpToDate(!found);
    } catch {
      toast.error("Couldn't check for updates. Are you online?");
    } finally {
      setChecking(false);
    }
  };

  const install = async () => {
    setInstalling(true);
    try {
      const { installUpdate } = await import("@/lib/desktop/updater");
      await installUpdate(setProgress);
      // On success the app relaunches into the new version; nothing to do here.
    } catch (e) {
      setInstalling(false);
      setProgress(null);
      toast.error(e instanceof Error ? e.message : "Update failed to install");
    }
  };

  const percent = progress ? pct(progress) : null;

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5" />
          Updates
        </CardTitle>
        <CardDescription>
          MyDevTools updates itself in place — no reinstall, and your offline
          data is never touched.
          {version ? ` You're on version ${version}.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {update ? (
          <div className="rounded-xl border border-primary/40 bg-primary/[0.04] px-3.5 py-3">
            <p className="text-sm font-medium">
              Version {update.version} is available.
            </p>
            {update.notes ? (
              <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                {update.notes}
              </p>
            ) : null}
            {installing ? (
              <div className="mt-3 space-y-1.5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${percent ?? 10}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {percent !== null ? `Downloading… ${percent}%` : "Downloading…"}
                </p>
              </div>
            ) : (
              <Button className="mt-3" size="sm" onClick={() => void install()}>
                <Download className="mr-2 h-4 w-4" />
                Download &amp; install
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {upToDate ? "You're up to date." : "Check for a newer version."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void check()}
              disabled={checking}
            >
              <RefreshCw className={checking ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              {checking ? "Checking…" : "Check for updates"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
