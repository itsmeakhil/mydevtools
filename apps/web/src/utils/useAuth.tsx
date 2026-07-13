"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../database/firebase";
import { User } from "firebase/auth";

// Export the return type
export interface AuthState {
  user: User | null;
  loading: boolean;
}

/**
 * Auth is required everywhere behind the app shell — on web and desktop alike.
 * The desktop (Tauri) app is a paid product with no anonymous/offline account:
 * an unauthenticated user is redirected to /login (cloud sign-in via the system
 * browser + deep link), exactly like the web app.
 */
const useAuth = (requireAuth: boolean = false): AuthState => {
  // auth.currentUser is synchronously available once Firebase has resolved auth
  // state. On client-side navigation within the app it is already populated, so
  // we avoid a spurious full-screen loading flash on every route change.
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = useState(() => auth.currentUser === null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser && requireAuth) {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router, requireAuth]);

  return { user, loading };
};

export default useAuth;
