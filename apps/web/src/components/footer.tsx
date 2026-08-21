"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { Logo } from "./logo";

/** Source repository — AGPL v3. Built releases ship on this repo's releases page. */
export const SOURCE_URL = "https://github.com/mydevtools-tech/mydevtools";

type FooterLink = { href: string; label: string; external?: boolean };

const footerColumns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/tools", label: "Tools" },
      { href: "/features", label: "Features" },
      { href: "/download", label: "Download" },
      { href: "/linux-builds", label: "Download for Linux" },
      { href: "/developer-tools", label: "Platform" },
      { href: "/changelog", label: "Changelog" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/help", label: "Help & FAQ" },
      { href: "/privacy", label: "Privacy" },
      { href: "/security", label: "Security" },
    ],
  },
  {
    title: "Open Source",
    links: [
      { href: SOURCE_URL, label: "GitHub", external: true },
      { href: "/open-source", label: "Why open source" },
      { href: `${SOURCE_URL}/blob/main/CONTRIBUTING.md`, label: "Contributing", external: true },
      { href: `${SOURCE_URL}/blob/main/ROADMAP.md`, label: "Roadmap", external: true },
      { href: `${SOURCE_URL}/blob/main/LICENSE`, label: "License (AGPL-3.0)", external: true },
    ],
  },
  {
    title: "Community",
    links: [
      { href: `${SOURCE_URL}/discussions`, label: "Discussions", external: true },
      { href: `${SOURCE_URL}/issues`, label: "Issues", external: true },
      { href: `${SOURCE_URL}/releases`, label: "Releases", external: true },
    ],
  },
];

function FooterAnchor({ link }: { link: FooterLink }) {
  const className = "text-muted-foreground hover:text-foreground transition-colors";
  return link.external ? (
    <a href={link.href} target="_blank" rel="noreferrer" className={className}>
      {link.label}
    </a>
  ) : (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <>
      <footer className="border-t border-border/50 bg-background/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-2 gap-8 py-10 md:grid-cols-6">
            {/* Brand */}
            <div className="col-span-2 space-y-3">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <Logo size={22} showText={false} />
                <span className="font-semibold text-foreground">MyDevTools</span>
              </Link>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                The offline developer workstation. 80+ developer tools, API, SQL,
                MongoDB and Redis — open source, local-first, on your machine.
              </p>
            </div>

            {footerColumns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  {col.title}
                </h2>
                <ul className="space-y-2 text-sm">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <FooterAnchor link={link} />
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="flex flex-col items-center gap-2 border-t border-border/40 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between">
            <span>© {year} MyDevTools · Free &amp; open source under the GNU AGPL v3</span>
          </div>
        </div>
      </footer>

      <BackToTop />
    </>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="back-to-top"
          type="button"
          onClick={scrollTop}
          aria-label="Back to top"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:bg-foreground/90 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
