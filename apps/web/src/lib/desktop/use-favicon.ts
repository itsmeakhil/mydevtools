import { useEffect, useState } from "react";

import { isDesktop } from "./is-desktop";
import { proxyGet } from "./proxy-get";

// Resolved favicon data-URLs (desktop) keyed by the service URL. In-memory
// only — re-fetched on reload when online. `null` = tried and failed (offline
// or non-image response) so the caller shows its letter-avatar fallback.
const cache = new Map<string, string | null>();

/**
 * Given a favicon service URL (e.g. Google/DuckDuckGo), returns a usable `src`:
 * - Web: the URL itself (browser fetches it directly — byte-identical to before).
 * - Desktop: a `data:` URL fetched through the Rust proxy (no third-party call
 *   from the webview), online-only. Returns `null` offline / on failure so the
 *   component renders its letter-avatar fallback.
 */
export function useFaviconSrc(serviceUrl: string | null): string | null {
  const [src, setSrc] = useState<string | null>(() => {
    if (!serviceUrl) return null;
    if (!isDesktop()) return serviceUrl;
    return cache.get(serviceUrl) ?? null;
  });

  useEffect(() => {
    if (!serviceUrl) {
      setSrc(null);
      return;
    }
    if (!isDesktop()) {
      setSrc(serviceUrl);
      return;
    }
    if (cache.has(serviceUrl)) {
      setSrc(cache.get(serviceUrl) ?? null);
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    void proxyGet(serviceUrl).then((r) => {
      const dataUrl =
        r.ok && r.isBase64 && r.body
          ? `data:${r.contentType || "image/png"};base64,${r.body}`
          : null;
      cache.set(serviceUrl, dataUrl);
      if (!cancelled) setSrc(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [serviceUrl]);

  return src;
}
