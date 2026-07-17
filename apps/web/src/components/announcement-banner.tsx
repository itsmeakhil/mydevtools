"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

const DISMISS_KEY = "mdt-launch-offer-dismissed";

/**
 * Slim launch-offer strip above the marketing header. Dismissible per browser
 * (localStorage). Rendered on marketing pages only via <Header/>.
 */
export function AnnouncementBanner() {
  // Start hidden to avoid a flash for users who already dismissed it.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISS_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!visible) return null;

  return (
    <div className="relative z-[60] bg-[linear-gradient(100deg,#5b63f0,#9a5cf2_52%,#4fd0e6)] text-white">
      <div className="container mx-auto flex items-center justify-center gap-2 px-10 py-2 text-center text-[13px] font-medium sm:gap-3">
        <span className="hidden rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset ring-white/25 sm:inline-flex">
          Launch offer
        </span>
        <p className="truncate">
          First{" "}
          <span className="font-bold">250 accounts</span>{" "}
          get every Pro &amp; Team feature, free. No card needed.
        </p>
        <Link
          href="/login"
          className="hidden shrink-0 items-center gap-1 font-semibold underline decoration-white/50 underline-offset-2 transition-opacity hover:opacity-90 sm:inline-flex"
        >
          Claim yours <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
