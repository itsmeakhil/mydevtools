"use client";

import { useEffect, useState } from "react";
import { Github, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const REPO = "mydevtools-tech/mydevtools";
const REPO_URL = `https://github.com/${REPO}`;
const CACHE_KEY = "mdt-gh-stars";
const CACHE_TTL = 60 * 60 * 1000; // 1h — GitHub's unauth API is 60 req/hr/IP.

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

/** Header pill linking to the repo with a live stargazer count (client-fetched, localStorage-cached). */
export function GithubStars({ className }: { className?: string }) {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { count, at } = JSON.parse(cached) as { count: number; at: number };
        setStars(count);
        if (Date.now() - at < CACHE_TTL) return; // fresh — skip refetch
      }
    } catch {
      /* ignore bad cache */
    }

    let cancelled = false;
    fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { stargazers_count?: number }) => {
        if (cancelled || typeof d.stargazers_count !== "number") return;
        setStars(d.stargazers_count);
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ count: d.stargazers_count, at: Date.now() })
          );
        } catch {
          /* ignore quota */
        }
      })
      .catch(() => {
        /* keep icon-only fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Star ${REPO} on GitHub${stars != null ? ` — ${stars} stars` : ""}`}
      className={cn(
        "group inline-flex h-10 items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3.5 text-sm font-medium",
        "backdrop-blur-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-border hover:bg-muted/60 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]",
        className
      )}
    >
      <Github className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <span className="hidden sm:inline">Star</span>
      <span className="flex items-center gap-1 tabular-nums text-muted-foreground group-hover:text-foreground">
        <Star
          className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400 transition-transform duration-200 group-hover:scale-110"
          aria-hidden
        />
        {stars != null ? formatStars(stars) : "—"}
      </span>
    </a>
  );
}
