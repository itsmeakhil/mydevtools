"use client";

import { useEffect, useState } from "react";

import { isDesktop } from "@/lib/desktop/is-desktop";

/**
 * Renders children only on the web. Used to drop web-only chrome (e.g. the
 * login page's "Back to home" link) from the desktop app, where there's no
 * marketing site to go back to.
 */
export function HideOnDesktop({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (mounted && isDesktop()) return null;
  return <>{children}</>;
}
