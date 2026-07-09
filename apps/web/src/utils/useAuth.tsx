"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../database/firebase";
import { User } from "firebase/auth";
import { isDesktop } from "@/lib/desktop/is-desktop";

// Export the return type
export interface AuthState {
  user: User | null;
  loading: boolean;
}

/**
 * Desktop offline mode has no Firebase session; tools are gated by the local
 * master-vault unlock instead. A synthetic user keeps components that read
 * uid/displayName/getIdToken working without network.
 */
function desktopLocalUser(): User {
  return {
    uid: "desktop-local",
    email: null,
    displayName: "Local User",
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    providerData: [],
    getIdToken: async () => "",
    getIdTokenResult: async () => ({ token: "" }),
    reload: async () => {},
    toJSON: () => ({ uid: "desktop-local" }),
  } as unknown as User;
}

const useAuth = (requireAuth: boolean = false): AuthState => {
  // auth.currentUser is synchronously available once Firebase has resolved auth state.
  // On client-side navigation within the app it is already populated, so we avoid
  // a spurious full-screen loading flash on every route change.
  const [user, setUser] = useState<User | null>(() =>
    isDesktop() ? auth.currentUser ?? desktopLocalUser() : auth.currentUser
  );
  const [loading, setLoading] = useState(() =>
    isDesktop() ? false : auth.currentUser === null
  );
  const router = useRouter();

  useEffect(() => {
    if (isDesktop()) {
      // Desktop never redirects to /login — the local user is always signed
      // in; a real Firebase user (cloud sign-in via deep link) takes priority.
      const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
        setUser(firebaseUser ?? desktopLocalUser());
      });
      return () => unsubscribe();
    }
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