"use client";

import { useEffect, useState } from "react";

import { isDesktop } from "@/lib/desktop/is-desktop";

export type OnlineSessionState = {
  /** navigator.onLine (desktop only; always true on web). */
  online: boolean;
  /** Desktop: backend session present in the Rust jar. Web: always true. */
  hasCloudSession: boolean;
  /** Convenience: online && hasCloudSession. */
  ready: boolean;
};

/**
 * Gate for tools that require the cloud even on desktop (s3-drive,
 * dns-lookup, email-validator, break-room, notes images).
 * On web this is a constant `ready: true` — no behavior change.
 */
export function useOnlineSession(): OnlineSessionState {
  const [online, setOnline] = useState(true);
  const [hasCloudSession, setHasCloudSession] = useState(!isDesktop());

  useEffect(() => {
    if (!isDesktop()) return;
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const onSession = (e: Event) =>
      setHasCloudSession(Boolean((e as CustomEvent<{ ok: boolean }>).detail?.ok));
    window.addEventListener("mydevtools:desktop-session", onSession);

    void import("@/lib/desktop/remote").then(({ hasRemoteSession, checkRemoteSession }) => {
      setHasCloudSession(hasRemoteSession());
      void checkRemoteSession().then(setHasCloudSession);
    });

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("mydevtools:desktop-session", onSession);
    };
  }, []);

  return { online, hasCloudSession, ready: online && hasCloudSession };
}
