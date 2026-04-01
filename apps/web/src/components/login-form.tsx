"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  OAuthProvider,
  AuthError
} from "firebase/auth";
import { auth } from "../database/firebase";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Github } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (provider: GoogleAuthProvider | GithubAuthProvider) => {
    setIsLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("User signed in:", result.user);
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error during sign-in:", error);

      if (error.code === 'auth/account-exists-with-different-credential') {
        try {
          const email = error.customData?.email;
          const pendingCredential = OAuthProvider.credentialFromError(error);

          console.log("Account linking error details:", {
            email,
            pendingCredential,
            customData: error.customData
          });

          if (!email || !pendingCredential) {
            throw new Error("Could not resolve account details for linking.");
          }

          // Get sign-in methods for this email.
          const methods = await fetchSignInMethodsForEmail(auth, email);
          console.log("Available sign-in methods:", methods);

          if (methods.length > 0) {
            const providerId = methods[0];
            let existingProvider: GoogleAuthProvider | GithubAuthProvider | null = null;

            if (providerId === GoogleAuthProvider.PROVIDER_ID) {
              existingProvider = new GoogleAuthProvider();
            } else if (providerId === GithubAuthProvider.PROVIDER_ID) {
              existingProvider = new GithubAuthProvider();
            }

            if (existingProvider) {
              // Clear previous error
              setError("");

              // Inform user
              const providerName = providerId === GoogleAuthProvider.PROVIDER_ID ? "Google" : "GitHub";
              alert(`You already have an account with ${providerName}. Please sign in with ${providerName} to link your accounts.`);

              // Sign in with the existing provider
              const result = await signInWithPopup(auth, existingProvider);

              // Link the pending credential
              await linkWithCredential(result.user, pendingCredential);
              console.log("Account linked successfully");
              router.push("/dashboard");
              return;
            } else {
              setError(`Account exists with provider: ${providerId}, but automatic linking is not supported.`);
            }
          } else {
            setError("An account with this email already exists, but we couldn't determine the sign-in method. Please try signing in with the other provider.");
          }
        } catch (linkError: any) {
          console.error("Error linking accounts:", linkError);
          setError("Failed to link accounts. Please try signing in with the provider you originally used.");
        }
      } else {
        setError(
          error.code === "auth/popup-closed-by-user"
            ? "Sign-in was cancelled. Please try again."
            : "Failed to sign in. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {error && (
        <Alert variant="destructive" className="animate-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        onClick={() => handleLogin(new GoogleAuthProvider())}
        disabled={isLoading}
        className="w-full h-12 text-base font-medium relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] touch-target"
        variant="default"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            {/* Google Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-5 h-5 mr-3"
              fill="currentColor"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.04.69-2.36 1.09-3.71 1.09-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C4.01 20.65 7.68 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.68 1 4.01 3.35 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="relative z-10">Continue with Google</span>
            {/* Hover effect */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </>
        )}
      </Button>

      <Button
        type="button"
        onClick={() => handleLogin(new GithubAuthProvider())}
        disabled={isLoading}
        className="w-full h-12 text-base font-medium relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] bg-[#24292e] hover:bg-[#2f363d] text-white touch-target"
        variant="default"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <Github className="w-5 h-5 mr-3" />
            <span className="relative z-10">Continue with GitHub</span>
            {/* Hover effect */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </>
        )}
      </Button>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Quick & Secure
          </span>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="space-y-1">
          <div className="text-2xl">🔒</div>
          <p className="text-xs text-muted-foreground font-medium">Secure</p>
        </div>
        <div className="space-y-1">
          <div className="text-2xl">⚡</div>
          <p className="text-xs text-muted-foreground font-medium">Fast</p>
        </div>
        <div className="space-y-1">
          <div className="text-2xl">🎯</div>
          <p className="text-xs text-muted-foreground font-medium">Reliable</p>
        </div>
      </div>
    </div>
  );
}
