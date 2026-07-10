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
} from "firebase/auth";
import { auth } from "../database/firebase";
import { useEffect, useRef, useState } from "react";
import { backendFetch, establishBackendSession } from "@/lib/backend-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Github, Fingerprint } from "lucide-react";
import { signInWithPasskey, startConditionalPasskeyAuth } from "@/lib/passkey"
import { acceptInvitation } from "@/lib/invitations-api"
import { useWorkspaceStore } from "@/store/workspace-store"
import { toast } from "sonner";
import { isDesktop } from "@/lib/desktop/is-desktop";
import { DesktopLogin } from "@/components/desktop/desktop-login";

export function LoginForm() {
  // Gate on mount so the statically-exported HTML (window undefined → web form)
  // doesn't mismatch the desktop client render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Desktop (Tauri) can't use OAuth popups in WKWebView — it signs in through
  // the system browser instead. Web keeps the full provider/passkey flow.
  if (isDesktop()) {
    return <DesktopLogin />;
  }
  return <WebLoginForm />;
}

function WebLoginForm() {
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<"google" | "github" | "passkey" | "">("");
  const [error, setError] = useState("");
  const conditionalStarted = useRef(false);

  // Conditional autofill: surfaces passkeys in the username field's autocomplete UI.
  useEffect(() => {
    if (conditionalStarted.current) return;
    conditionalStarted.current = true;
    let aborted = false;
    (async () => {
      try {
        const result = await startConditionalPasskeyAuth();
        if (!aborted && result) router.replace("/dashboard");
      } catch {
        // Conditional auth races with explicit button; ignore silently.
      }
    })();
    return () => {
      aborted = true;
    };
  }, [router]);

  // After a successful login, check for ?invite=<token> in the URL and
  // auto-accept the invitation, then redirect to the invited workspace or
  // the dashboard. Always redirects — never throws or blocks navigation.
  const handleInviteToken = async (): Promise<string> => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    )
    // Desktop-app sign-in handoff: mint a Firebase custom token and hand it
    // back to the app — via the loopback callback port (?cb=) when present
    // (works in dev + packaged), else the mydevtools:// deep link.
    if (params.get("desktop") === "1") {
      try {
        const res = await backendFetch("/api/backend/auth/desktop-token", { method: "POST" })
        if (res.ok) {
          const { token: desktopToken } = (await res.json()) as { token: string }
          const cb = params.get("cb")
          window.location.href = cb
            ? `http://127.0.0.1:${cb}/callback?token=${encodeURIComponent(desktopToken)}`
            : `mydevtools://auth?token=${encodeURIComponent(desktopToken)}`
          toast.success("Signed in — returning to the MyDevTools app…")
        } else {
          toast.error("Could not hand off sign-in to the desktop app")
        }
      } catch {
        toast.error("Could not hand off sign-in to the desktop app")
      }
      return "/dashboard"
    }

    const token = params.get("invite")
    if (!token) return "/dashboard"

    try {
      await useWorkspaceStore.getState().loadFromBackend()
      const result = await acceptInvitation(token)
      await useWorkspaceStore.getState().loadFromBackend()
      if (result.workspace_id) {
        await useWorkspaceStore.getState().setActiveWorkspace(result.workspace_id)
      }
      toast.success("Invitation accepted — welcome to your new workspace!")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not accept invitation"
      )
    }

    return "/dashboard"
  }

  const handlePasskey = async () => {
    setLoadingProvider("passkey");
    setError("");
    const NO_PASSKEY_MSG =
      "No passkey found for this site. Sign in with Google or GitHub first, then add a passkey from Settings → Security.";
    try {
      await signInWithPasskey();
      router.push(await handleInviteToken());
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : "Passkey sign-in failed.";
      // Browser-side: NotAllowedError fires for both "user cancelled" and "no
      // credentials available". Treat both as the same guidance — harmless if
      // the user actually cancelled.
      const noCreds =
        e?.name === "NotAllowedError" ||
        /no .*(credential|passkey)|not .*registered|unknown passkey/i.test(msg);
      setError(noCreds ? NO_PASSKEY_MSG : msg);
    } finally {
      setLoadingProvider("");
    }
  };

  const handleLogin = async (provider: GoogleAuthProvider | GithubAuthProvider, providerName: "google" | "github") => {
    setLoadingProvider(providerName);
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      try {
        await establishBackendSession(idToken, { checkRevoked: true });
      } catch (sessionErr) {
        console.error("Backend session failed:", sessionErr);
        setError("Signed in, but could not start an API session. Please try again.");
        return;
      }
      router.push(await handleInviteToken());
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
              const linkProviderName = providerId === GoogleAuthProvider.PROVIDER_ID ? "Google" : "GitHub";
              alert(`You already have an account with ${linkProviderName}. Please sign in with ${linkProviderName} to link your accounts.`);

              // Sign in with the existing provider
              const result = await signInWithPopup(auth, existingProvider);

              // Link the pending credential
              await linkWithCredential(result.user, pendingCredential);
              const idToken = await result.user.getIdToken();
              try {
                await establishBackendSession(idToken, { checkRevoked: true });
              } catch (sessionErr) {
                console.error("Backend session failed:", sessionErr);
                setError("Signed in, but could not start an API session. Please try again.");
                return;
              }
              router.push(await handleInviteToken());
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
      setLoadingProvider("");
    }
  };

  const oauthButtonClass =
    "h-11 w-full justify-center border-border/70 bg-background/50 text-[15px] font-medium shadow-sm backdrop-blur-sm transition-all hover:border-border hover:bg-muted/60 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-background/30";

  return (
    <div className="w-full space-y-3 text-foreground">
      {error && (
        <Alert variant="destructive" className="animate-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Hidden username field — required for conditional WebAuthn autofill UI. */}
      <input
        type="text"
        name="username"
        autoComplete="username webauthn"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        readOnly
      />

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          onClick={handlePasskey}
          disabled={loadingProvider !== ""}
          className={oauthButtonClass}
          variant="outline"
        >
          {loadingProvider === "passkey" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Waiting for passkey…</span>
            </>
          ) : (
            <>
              <Fingerprint className="h-[18px] w-[18px] shrink-0" />
              <span>Sign in with a passkey</span>
            </>
          )}
        </Button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <span className="w-full border-t border-border/70" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card/90 px-3 font-medium tracking-wide text-muted-foreground backdrop-blur-sm">
              or continue with
            </span>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => handleLogin(new GoogleAuthProvider(), "google")}
          disabled={loadingProvider !== ""}
          className={oauthButtonClass}
          variant="outline"
        >
          {loadingProvider === "google" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px] shrink-0"
                aria-hidden
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.04.69-2.36 1.09-3.71 1.09-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C4.01 20.65 7.68 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.68 1 4.01 3.35 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </Button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <span className="w-full border-t border-border/70" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card/90 px-3 font-medium tracking-wide text-muted-foreground backdrop-blur-sm">
              or continue with
            </span>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => handleLogin(new GithubAuthProvider(), "github")}
          disabled={loadingProvider !== ""}
          className={oauthButtonClass}
          variant="outline"
        >
          {loadingProvider === "github" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <Github className="h-[18px] w-[18px] shrink-0" />
              <span>Continue with GitHub</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
