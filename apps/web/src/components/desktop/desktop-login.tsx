"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ExternalLink, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Desktop sign-in panel. OAuth popups don't work in WKWebView, so cloud
 * sign-in opens the system browser (`/login?desktop=1`), which hands a
 * Firebase custom token back through the mydevtools:// deep link. The user
 * can also continue fully offline with the local vault.
 */
export function DesktopLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);

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
    try {
      const { startCloudSignIn } = await import("@/lib/desktop/cloud-signin");
      await startCloudSignIn();
    } finally {
      // Leave the spinner up briefly; the deep-link callback will navigate away.
      setTimeout(() => setBusy(false), 4000);
    }
  };

  const continueOffline = () => {
    router.replace("/dashboard");
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

      <div className="relative my-1 flex items-center">
        <span className="h-px flex-1 bg-border/60" />
        <span className="px-3 text-xs text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border/60" />
      </div>

      <Button variant="outline" className="h-11 w-full" onClick={continueOffline} disabled={busy}>
        Continue without signing in
      </Button>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Your data stays on this Mac. Sign in any time from Settings to sync.
      </p>
    </div>
  );
}
