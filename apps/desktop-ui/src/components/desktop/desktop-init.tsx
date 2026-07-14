"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { isDesktop } from "@/lib/desktop/is-desktop";

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
    })();
    // Fire-and-forget update check — nudge the user if a newer build exists.
    void import("@/lib/desktop/updater").then(async ({ checkForUpdate, installUpdate }) => {
      try {
        const update = await checkForUpdate();
        if (!update) return;
        toast(`Update available — version ${update.version}`, {
          description: "Installs in place; your offline data isn't affected.",
          duration: 12_000,
          action: { label: "Update now", onClick: () => void installUpdate() },
        });
      } catch {
        // offline or endpoint unreachable — silent
      }
    });
  }, []);
  return null;
}
