"use client";

import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";

// New key so users who dismissed the old launch-offer strip see this once.
const DISMISS_KEY = "mdt-foss-banner-dismissed";

/**
 * Slim announcement strip above the marketing header. Dismissible per browser
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
          Open source
        </span>
        <p className="truncate">
          MyDevTools is now{" "}
          <span className="font-bold">free for everyone</span> and open source
          under AGPL-3.0.
        </p>
        <a
          href="https://github.com/mydevtools-tech/mydevtools"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden shrink-0 items-center gap-1 font-semibold underline decoration-white/50 underline-offset-2 transition-opacity hover:opacity-90 sm:inline-flex"
        >
          Star on GitHub <ArrowRight className="h-3.5 w-3.5" />
        </a>
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
