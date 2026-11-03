"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { SettingsGroup, SettingsRow } from "@/components/settings/settings-group";
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
    <SettingsGroup title={t("title")}>
      <SettingsRow
        label={
          <span className="font-normal text-muted-foreground">
            {version ? t("runningVersion", { version }) : t("running")}
          </span>
        }
      >
        <DesktopUpdateDialog />
      </SettingsRow>
    </SettingsGroup>
  );
}
