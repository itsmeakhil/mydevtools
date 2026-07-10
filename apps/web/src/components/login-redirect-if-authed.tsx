"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/utils/useAuth";
import { Loader2 } from "lucide-react";
import { ensureBackendSession } from "@/lib/backend-auth";
import { handoffDesktopToken, isDesktopHandoff } from "@/lib/desktop-handoff";

export function LoginRedirectIfAuthed() {
  const { user, loading } = useAuth(false);
  const router = useRouter();

  // On desktop the synthetic "desktop-local" user is always present; it must
  // NOT bounce us off the sign-in screen. Only a real cloud user redirects.
  const isRealUser = !!user && user.uid !== "desktop-local";

  useEffect(() => {
    if (loading || !isRealUser || !user) return;
    // Desktop sign-in handoff (?desktop=1): an already-signed-in browser must
    // mint the token and return to the app, NOT bounce to /dashboard. The
    // backend session cookie may be stale (Firebase client outlives it), so
    // refresh it before minting or the desktop-token endpoint 401s.
    if (isDesktopHandoff(window.location.search)) {
      void (async () => {
        try {
          await ensureBackendSession(user);
        } catch {
          /* fall through — handoff will surface failure to the app */
        }
        await handoffDesktopToken(window.location.search);
      })();
      return;
    }
    router.replace("/dashboard");
  }, [loading, isRealUser, user, router]);

  if (loading || isRealUser) {
    return (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--background))" }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return null;
}
