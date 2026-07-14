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

  // Only a signed-in (real) user redirects away from the sign-in screen.
  const isRealUser = !!user;

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
    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next && next.startsWith("/") ? next : "/dashboard");
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
