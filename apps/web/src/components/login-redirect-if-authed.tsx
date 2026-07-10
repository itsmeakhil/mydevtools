"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/utils/useAuth";
import { Loader2 } from "lucide-react";

export function LoginRedirectIfAuthed() {
  const { user, loading } = useAuth(false);
  const router = useRouter();

  // On desktop the synthetic "desktop-local" user is always present; it must
  // NOT bounce us off the sign-in screen. Only a real cloud user redirects.
  const isRealUser = !!user && user.uid !== "desktop-local";

  useEffect(() => {
    if (loading) return;
    if (isRealUser) {
      router.replace("/dashboard");
    }
  }, [loading, isRealUser, router]);

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
