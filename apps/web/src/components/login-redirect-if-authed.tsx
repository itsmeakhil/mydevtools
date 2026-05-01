"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/utils/useAuth";
import { Loader2 } from "lucide-react";

export function LoginRedirectIfAuthed() {
  const { user, loading } = useAuth(false);
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  if (loading || user) {
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
