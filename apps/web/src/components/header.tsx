"use client";
import { useState, useEffect, type ElementType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Github, Menu, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { SOURCE_URL } from "./footer";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Mobile menu animation variants
const menuVariants = {
  closed: {
    opacity: 0,
    height: 0,
    transition: {
      duration: 0.2,
      ease: "easeInOut" as const,
    },
  },
  open: {
    opacity: 1,
    height: "auto",
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
};

const menuItemVariants = {
  closed: { opacity: 0, x: -16 },
  open: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.25,
      ease: "easeOut" as const,
    },
  }),
};

type NavLink = {
  href: string;
  label: string;
  icon?: ElementType;
  external?: boolean;
};

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/developer-tools", label: "Platform" },
  { href: "/download", label: "Download" },
  { href: "/tools", label: "Tools" },
  { href: "/changelog", label: "Changelog" },
];

// "/" only matches exactly; every other section also owns its sub-routes
// (e.g. /tools/json-formatter keeps "Tools" highlighted).
function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const STARS_API = SOURCE_URL.replace(
  "https://github.com/",
  "https://api.github.com/repos/"
);
const STARS_CACHE_KEY = "mdt:gh-stars";

function formatStars(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : `${n}`;
}

// Unauthenticated GitHub API: 60 req/hour per visitor IP. Cached per session so
// client-side navigation between pages doesn't refetch. Any failure (offline,
// rate limited) just leaves the count hidden.
// ponytail: client fetch — Header isn't in a shared layout, so there's no server
// component to thread a prop from. Move it server-side if the layout ever unifies.
function useGithubStars() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(STARS_CACHE_KEY);
      if (cached) {
        setStars(Number(cached));
        return;
      }
    } catch {
      // storage blocked — fall through and fetch
    }

    const controller = new AbortController();
    fetch(STARS_API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const count = data?.stargazers_count;
        if (typeof count !== "number") return;
        setStars(count);
        sessionStorage.setItem(STARS_CACHE_KEY, String(count));
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  return stars;
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname() ?? "/";
  const stars = useGithubStars();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const mobileNavLinks: NavLink[] = [
    ...NAV_LINKS,
    { href: SOURCE_URL, label: "GitHub", icon: Github, external: true },
  ];

  return (
    <header
      className={cn(
        "mdt-nav fixed inset-x-0 top-0 z-50 w-full pt-[env(safe-area-inset-top)]",
        scrolled
          ? "glass-nav border-b border-white/5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)]"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center">
            <Logo />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-8 text-md font-medium">
              {NAV_LINKS.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative py-2 transition-colors",
                      "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:bg-foreground after:transition-all hover:after:w-full",
                      active
                        ? "text-foreground after:w-full"
                        : "text-foreground/70 hover:text-foreground after:w-0"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Desktop Actions */}
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex h-10 gap-2 px-3"
            >
              <a
                href={SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                aria-label={
                  stars === null
                    ? "MyDevTools on GitHub"
                    : `MyDevTools on GitHub, ${stars} stars`
                }
                title="Star MyDevTools on GitHub"
              >
                <Github className="h-5 w-5" />
                {stars !== null && (
                  <span className="flex items-center gap-1 text-sm font-medium tabular-nums">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {formatStars(stars)}
                  </span>
                )}
              </a>
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-11 w-11"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 top-16 bg-background/80 backdrop-blur-sm md:hidden z-40"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Menu Content */}
            <motion.div
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="md:hidden overflow-hidden relative z-50"
            >
              <nav className="bg-background/95 backdrop-blur-xl border-t border-border/40 dark:border-white/5">
                <div className="px-4 py-4 space-y-1">
                  {mobileNavLinks.map((link, index) => {
                    const active =
                      !link.external && isActive(pathname, link.href);
                    return (
                    <motion.div
                      key={link.href}
                      custom={index}
                      variants={menuItemVariants}
                      initial="closed"
                      animate="open"
                    >
                      <Link
                        href={link.href}
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noreferrer" : undefined}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3.5 rounded-xl",
                          "text-base font-medium transition-all duration-200",
                          "hover:bg-muted/60 active:scale-[0.98]",
                          "min-h-[48px]",
                          active &&
                            "bg-muted text-foreground border-l-2 border-primary rounded-l-md"
                        )}
                      >
                        {link.icon && <link.icon className="h-5 w-5" />}
                        <span>{link.label}</span>
                        {link.external && stars !== null && (
                          <span className="ml-auto flex items-center gap-1 text-sm text-foreground/70 tabular-nums">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            {formatStars(stars)}
                          </span>
                        )}
                      </Link>
                    </motion.div>
                    );
                  })}
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}