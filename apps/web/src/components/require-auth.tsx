"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/utils/useAuth";
import { EnsureBackendSession } from "@/components/ensure-backend-session";
import { AppLoadingScreen } from "@/components/app-loading-screen";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth(false);
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <AppLoadingScreen />;
  }

  return (
    <EnsureBackendSession user={user}>
      {children}
    </EnsureBackendSession>
  );
}
