"use client";

import { useState } from "react";

import { useFaviconSrc } from "@/lib/desktop/use-favicon";

/**
 * Renders a favicon `<img>` or a fallback. On web the service URL is used
 * directly; on desktop it's fetched through the Rust proxy (data URL) and falls
 * back offline — so no third-party favicon request leaves the webview.
 */
export function FaviconImg({
  serviceUrl,
  fallback,
  className,
}: {
  serviceUrl: string | null;
  fallback: React.ReactNode;
  className?: string;
}) {
  const src = useFaviconSrc(serviceUrl);
  const [error, setError] = useState(false);
  if (!src || error) return <>{fallback}</>;
  return <img src={src} alt="" className={className} onError={() => setError(true)} />;
}
