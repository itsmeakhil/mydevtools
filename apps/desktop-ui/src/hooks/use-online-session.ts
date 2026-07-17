"use client";

import { useEffect, useState } from "react";

import { isDesktop } from "@/lib/desktop/is-desktop";

export type OnlineSessionState = {
  /** navigator.onLine (desktop only; always true on web). */
  online: boolean;
};

/**
 * Gate for tools that need a network connection on desktop (s3-drive,
 * dns-lookup, email-validator, whois-lookup, breach check). They all talk to
 * third-party endpoints directly — no MyDevTools account involved.
 * On web this is a constant `online: true` — no behavior change.
 */
export function useOnlineSession(): OnlineSessionState {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (!isDesktop()) return;
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return { online };
}
