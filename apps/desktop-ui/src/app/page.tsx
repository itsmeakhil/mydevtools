"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Launch route: no marketing surface in the app bundle, and nothing to unlock —
 * the app has no accounts. Straight to the tools.
 */
export default function Page() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return <div className="min-h-screen bg-background" />;
}
