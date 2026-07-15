"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * "Download for macOS" button. Reads the latest published GitHub release via the
 * API and links straight to its universal .dmg asset, so the link stays current
 * across releases without editing the site. Falls back to the releases page if
 * the API is unreachable or no asset is found yet.
 */
// Public releases-mirror repo (source repo is private, so its release assets
// aren't publicly downloadable). CI mirrors the DMG + latest.json here.
const REPO = "mydevtools-tech/mydevtools-releases";
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;

type Asset = { name: string; browser_download_url: string };

/** Minimal Apple logo (lucide has no Apple icon in this version). */
function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" aria-hidden className={className} fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

export function DownloadDesktopButton({
  size = "lg",
  className,
}: {
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const [dmgUrl, setDmgUrl] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!active) return;
        const assets: Asset[] = Array.isArray(d.assets) ? d.assets : [];
        const dmg =
          assets.find((a) => /universal.*\.dmg$/i.test(a.name)) ||
          assets.find((a) => a.name.toLowerCase().endsWith(".dmg"));
        setDmgUrl(dmg?.browser_download_url ?? null);
        setVersion(typeof d.tag_name === "string" ? d.tag_name : null);
      })
      .catch(() => {
        /* offline / rate-limited / no release yet — fall back to releases page */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const href = dmgUrl ?? RELEASES_PAGE;

  return (
    <div className={className}>
      <Button asChild size={size} className="gap-2">
        <a href={href} download>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <AppleGlyph className="h-4 w-4" />
          )}
          Download for macOS
          <Download className="h-4 w-4 opacity-70" />
        </a>
      </Button>
      <p className="mt-2 text-sm text-muted-foreground">
        {version ? `${version} · ` : ""}Universal (Apple Silicon &amp; Intel) · macOS 12+
      </p>
    </div>
  );
}
