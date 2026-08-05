"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { Logo } from "./logo";

const footerLinks = [
  { href: "/login", label: "Sign in" },
  { href: "/blog", label: "Blog" },
  { href: "/changelog", label: "Changelog" },
  { href: "/developer-tools", label: "Platform" },
  { href: "/features", label: "Features" },
  { href: "/download", label: "Download" },
  { href: "/#tools", label: "Tools" },
  { href: "/security", label: "Security" },
  { href: "/help", label: "Help" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <>
      <footer className="border-t border-border/50 bg-background/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col items-center gap-4 py-6 md:flex-row md:justify-between md:gap-6">
            {/* Brand + copyright */}
            <Link
              href="/"
              className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Logo size={22} showText={false} />
              <span>
                © {year} <span className="font-semibold text-foreground">MyDevTools</span>
              </span>
            </Link>

            {/* Nav links */}
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
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
