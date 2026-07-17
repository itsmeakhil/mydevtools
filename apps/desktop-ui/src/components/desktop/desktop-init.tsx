"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { isDesktop } from "@/lib/desktop/is-desktop";
import { useWorkspaceStore } from "@/store/workspace-store";

/**
 * Desktop-only bootstrap: mandatory one-time activation gate, deep-link
 * sign-in listener, startup session probe, and update check.
 * Renders nothing; a no-op on web (the isDesktop guard compiles to false).
 */
export function DesktopInit() {
  const router = useRouter();
  const pathname = usePathname();

  // Activation gate: without a local activation record every route funnels to
  // /activate. Local check only — never blocks on the network.
  useEffect(() => {
    if (!isDesktop() || pathname === "/activate") return;
    void (async () => {
      const { getActivation } = await import("@/lib/desktop/activation");
      const activated = await getActivation().catch(() => null);
      if (!activated) router.replace("/activate");
    })();
  }, [router, pathname]);

  useEffect(() => {
    if (!isDesktop()) return;
    void (async () => {
      const [{ initDeepLinkListener }, { checkRemoteSession }] = await Promise.all([
        import("@/lib/desktop/cloud-signin"),
        import("@/lib/desktop/remote"),
      ]);
      await initDeepLinkListener().catch(() => {});
      await checkRemoteSession().catch(() => {});
      // Hydrate the workspace store so encrypted tools (API keys, password
      // manager, environment manager) resolve the always-present local personal
      // workspace. Without this the store stays empty offline → activeWs null →
      // cipher key null → "No active workspace." Runs after the session probe so
      // a remote session (if any) merges in.
      await useWorkspaceStore.getState().loadFromBackend().catch(() => {});
    })();
    // Fully silent auto-update: on launch, if a newer signed build exists,
    // download + install it and relaunch into it — no prompt, no button. The
    // update is verified against the baked-in pubkey and the local database is
    // never touched. Offline / mid-download failures stay silent and retry next
    // launch.
    void import("@/lib/desktop/updater").then(async ({ checkForUpdate, installUpdate }) => {
      try {
        const update = await checkForUpdate();
        if (!update) return;
        await installUpdate();
      } catch {
        // offline, endpoint unreachable, or install interrupted — retry next launch
      }
    });
  }, []);
  return null;
}
