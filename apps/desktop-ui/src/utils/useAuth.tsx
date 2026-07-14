"use client";
import { useEffect, useState } from "react";
import { auth } from "../database/firebase";
import { User } from "firebase/auth";

// Export the return type
export interface AuthState {
  user: User | null;
  loading: boolean;
}

/**
 * Desktop: the one-time activation record is the real gate (see RequireAuth /
 * DesktopInit). Firebase auth state is informational only — the user persists
 * locally from the activation sign-in — so `requireAuth` never redirects; the
 * app must keep working fully offline.
 */
const useAuth = (_requireAuth: boolean = false): AuthState => {
  // auth.currentUser is synchronously available once Firebase has resolved auth
  // state. On client-side navigation within the app it is already populated, so
  // we avoid a spurious full-screen loading flash on every route change.
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = useState(() => auth.currentUser === null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading };
};

export default useAuth;
