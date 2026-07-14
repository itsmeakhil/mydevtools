"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Desktop launch route: no marketing surface in the app bundle. Route to the
 * one-time activation screen until the app is activated, then straight to the
 * tools. Offline-first — no network in this decision.
 */
export default function Page() {
  const router = useRouter();
  useEffect(() => {
    void (async () => {
      const { localApi } = await import("@/lib/desktop/bridge");
      const activated = (await localApi("GET", "/desktop/activation")).status === 200;
      router.replace(activated ? "/dashboard" : "/activate");
    })();
  }, [router]);
  return <div className="min-h-screen bg-background" />;
}
