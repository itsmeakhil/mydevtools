"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { isDesktop } from "@/lib/desktop/is-desktop";
import { DesktopUpdateDialog } from "@/components/desktop/desktop-update-dialog";

/**
 * About card for the settings page: shows the running app version (baked into
 * tauri.conf.json) with the Check for updates button + modal. Desktop-only —
 * renders nothing on web.
 */
export function AppVersionLabel() {
  const t = useTranslations("SettingsPage.about");
  const [version, setVersion] = useState("");

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

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-violet-500/10 text-primary ring-1 ring-inset ring-border/50">
            <Info className="h-4 w-4" />
          </span>
          {t("title")}
        </CardTitle>
        <CardDescription>
          {version ? t("runningVersion", { version }) : t("running")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DesktopUpdateDialog />
      </CardContent>
    </Card>
  );
}
