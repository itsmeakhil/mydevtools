"use client";

import { useEffect } from "react";

import { isDesktop } from "@/lib/desktop/is-desktop";

/**
 * Desktop-only bootstrap: deep-link sign-in listener + startup session probe.
 * Renders nothing; a no-op on web (the isDesktop guard compiles to false).
 */
export function DesktopInit() {
  useEffect(() => {
    if (!isDesktop()) return;
    void (async () => {
      const [{ initDeepLinkListener }, { checkRemoteSession }] = await Promise.all([
        import("@/lib/desktop/cloud-signin"),
        import("@/lib/desktop/remote"),
      ]);
      await initDeepLinkListener().catch(() => {});
      await checkRemoteSession().catch(() => {});
    })();
  }, []);
  return null;
}
