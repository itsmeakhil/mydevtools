"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

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
  }, []);

  // Auto-update notification: check on launch and every 6h so long-running
  // sessions still hear about new builds. When a newer signed build exists,
  // surface a persistent toast — installing relaunches the app, so it's never
  // done silently out from under the user. Offline / unreachable stays silent
  // and retries on the next interval or launch.
  useEffect(() => {
    if (!isDesktop()) return;
    let notified = "";
    const check = async () => {
      try {
        const m = await import("@/lib/desktop/updater");
        const update = await m.checkForUpdate();
        if (!update || update.version === notified) return;
        notified = update.version;
        toast(`Version ${update.version} is available`, {
          id: "desktop-update",
          duration: Infinity,
          description:
            "Updates install in place — your offline data is never touched.",
          action: {
            label: "Restart & update",
            onClick: () => {
              toast.dismiss("desktop-update");
              void import("@/lib/desktop/use-update-install").then((m) => m.startUpdate());
            },
          },
        });
      } catch {
        // offline or endpoint unreachable — retry later
      }
    };
    void check();
    const timer = setInterval(() => void check(), 6 * 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  return null;
}
