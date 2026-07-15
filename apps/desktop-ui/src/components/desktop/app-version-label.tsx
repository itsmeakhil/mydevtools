"use client";

import { useEffect, useState } from "react";

import { isDesktop } from "@/lib/desktop/is-desktop";

/**
 * Subtle running-app-version line for the sidebar footer. Reads the version
 * baked into the bundle (tauri.conf.json) via the updater lib. Desktop-only —
 * renders nothing on web.
 */
export function AppVersionLabel() {
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

  if (!isDesktop() || !version) return null;

  return (
    <p className="px-3 pb-1 pt-0.5 text-[11px] leading-none text-muted-foreground/60">
      MyDevTools v{version}
    </p>
  );
}
