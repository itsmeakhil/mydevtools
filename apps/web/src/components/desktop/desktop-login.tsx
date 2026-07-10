"use client";

import { useEffect, useState } from "react";
import { Loader2, ExternalLink, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Desktop sign-in panel. OAuth popups don't work in WKWebView, so cloud
 * sign-in opens the system browser (`/login?desktop=1`), which hands a
 * Firebase custom token back through the loopback callback.
 */
export function DesktopLogin() {
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    // The deep-link handler navigates to /dashboard on success; nothing to do here.
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const { startCloudSignIn } = await import("@/lib/desktop/cloud-signin");
      // Resolves once the browser hands the token back and the session is set;
      // DesktopInit then routes to /dashboard.
      await startCloudSignIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <Button className="h-11 w-full text-base" onClick={() => void signIn()} disabled={busy || !online}>
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Waiting for your browser…
          </>
        ) : (
          <>
            <ExternalLink className="mr-2 h-4 w-4" />
            Sign in with your browser
          </>
        )}
      </Button>

      {!online && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <WifiOff className="h-3.5 w-3.5" />
          You&apos;re offline — sign-in needs a connection.
        </p>
      )}

      {error && <p className="text-center text-xs text-destructive">{error}</p>}

      <p className="mt-1 text-center text-xs text-muted-foreground">
        Your data is encrypted and stays on this Mac.
      </p>
    </div>
  );
}
