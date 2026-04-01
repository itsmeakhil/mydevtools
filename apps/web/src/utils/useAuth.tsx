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

const useAuth = (requireAuth: boolean = false): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          setUser(user);
        } else {
          setUser(null);
          if (requireAuth) {
            router.push("/login");
          }
        }
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [router, requireAuth]);

  return { user, loading };
};

export default useAuth;