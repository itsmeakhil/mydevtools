"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/utils/useAuth";

/**
 * If the user is already signed in, skip the login form and go to the dashboard.
 */
export function LoginRedirectIfAuthed() {
  const { user, loading } = useAuth(false);
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  return null;
}
