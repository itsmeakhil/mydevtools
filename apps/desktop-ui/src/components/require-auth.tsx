"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLoadingScreen } from "@/components/app-loading-screen";

/**
 * Desktop gate: the one-time activation record (local kv store) is the only
 * requirement — fully offline, no Firebase or network in the loop. Browser
 * sign-in happens once on /activate; after that the app never blocks on auth.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [activated, setActivated] = useState(false);
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

  if (!activated) {
    return <AppLoadingScreen />;
  }

  return <>{children}</>;
}
