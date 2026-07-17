"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { isDesktop } from "@/lib/desktop/is-desktop";

/**
 * About card for the settings page: shows the running app version (baked into
 * tauri.conf.json) with a Check for updates button. Desktop-only — renders
 * nothing on web.
 */
export function AppVersionLabel() {
  const [version, setVersion] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isDesktop()) return;
    void import("@/lib/desktop/updater").then(async (m) => {
      try {
        setVersion(await m.currentAppVersion());
      } catch {
        // version API unavailable — just don't show it
      }
    });
  }, []);

  if (!isDesktop()) return null;

  const handleCheck = async () => {
    setChecking(true);
    try {
      const { checkForUpdate, installUpdate } = await import("@/lib/desktop/updater");
      const update = await checkForUpdate();
      if (!update) {
        toast.success("You're on the latest version");
        return;
      }
      toast.info(`Updating to v${update.version}…`);
      await installUpdate();
    } catch {
      toast.error("Couldn't check for updates");
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary ring-1 ring-inset ring-border/50">
            <Info className="h-4 w-4" />
          </span>
          About
        </CardTitle>
        <CardDescription>Running MyDevTools {version ? `v${version}` : ""}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={handleCheck} disabled={checking}>
          {checking ? "Checking…" : "Check for updates"}
        </Button>
      </CardContent>
    </Card>
  );
}
