"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLoadingScreen } from "@/components/app-loading-screen";
import useAuth from "@/utils/useAuth";

/**
 * Desktop gate. Two requirements, in order:
 *   1. Activation record (local kv store, offline) — else /activate.
 *   2. A signed-in Firebase user — else /login. Firebase persists the session
 *      locally (IndexedDB), so this stays satisfied offline once the user has
 *      logged in; no guest access to the dashboard.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [activated, setActivated] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void import("@/lib/desktop/activation").then(async ({ getActivation }) => {
      const rec = await getActivation().catch(() => null);
      if (cancelled) return;
      if (!rec) router.replace("/activate");
      else setActivated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Once activated, require a signed-in user — send guests to the login page.
  useEffect(() => {
    if (activated && !loading && !user) router.replace("/login");
  }, [activated, loading, user, router]);

  if (!activated || loading || !user) {
    return <AppLoadingScreen />;
  }

  return <>{children}</>;
}
