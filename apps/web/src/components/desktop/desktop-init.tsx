"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { isDesktop } from "@/lib/desktop/is-desktop";

/**
 * Desktop-only bootstrap: deep-link sign-in listener + startup session probe.
 * Renders nothing; a no-op on web (the isDesktop guard compiles to false).
 */
export function DesktopInit() {
  const router = useRouter();
  useEffect(() => {
    if (!isDesktop()) return;
    // After browser sign-in completes, enter the workspace via Next routing.
    const onAuthed = () => router.replace("/dashboard");
    window.addEventListener("mydevtools:desktop-authed", onAuthed);
    void (async () => {
      const [{ initDeepLinkListener }, { checkRemoteSession }, { startSyncEngine }] =
        await Promise.all([
          import("@/lib/desktop/cloud-signin"),
          import("@/lib/desktop/remote"),
          import("@/lib/desktop/sync-engine"),
        ]);
      await initDeepLinkListener().catch(() => {});
      await checkRemoteSession().catch(() => {});
      startSyncEngine();
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
    return () => window.removeEventListener("mydevtools:desktop-authed", onAuthed);
  }, [router]);
  return null;
}
