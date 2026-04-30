"use client";
import { useState } from "react";
import Link from "next/link";
import { Github, Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./modeToggle";
import { Logo } from "./logo";
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

type HeaderProps = {
  /** When false, theme toggle is hidden (e.g. marketing page fixed to dark). */
  showThemeToggle?: boolean;
};

export function Header({ showThemeToggle = true }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mobileNavLinks = [
    { href: "/", label: "Home" },
    { href: "/#features", label: "Features" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/#tools", label: "Tools" },
    { href: "/login", label: "Get Started", isPrimary: true },
    { href: "https://github.com/itsmeakhil/mydevtools.tech", label: "GitHub", icon: Github, external: true },
  ];

  return (
    <header className="glass-nav sticky top-0 z-50 w-full">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center">
            <Logo />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-8 text-md font-medium">
              <Link
                href="/"
                className="relative py-2 transition-colors hover:text-foreground/80 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all hover:after:w-full"
              >
                Home
              </Link>
              <Link
                href="/#features"
                className="relative py-2 transition-colors hover:text-foreground/80 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all hover:after:w-full"
              >
                Features
              </Link>
              <Link
                href="/#pricing"
                className="relative py-2 transition-colors hover:text-foreground/80 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all hover:after:w-full"
              >
                Pricing
              </Link>
              <Link
                href="/#tools"
                className="relative py-2 transition-colors hover:text-foreground/80 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-foreground after:transition-all hover:after:w-full"
              >
                Tools
              </Link>
            </nav>
          </div>

          {/* Desktop Actions */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10"
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

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              {showThemeToggle ? <ModeToggle /> : null}
              <Link href="https://github.com/itsmeakhil/mydevtools.tech" target="_blank" rel="noreferrer">
                <Button
                  variant="outline"
                  size="icon"
                  className="border-border/50 hover:border-foreground/20 hover:bg-muted/50"
                >
                  <Github className="h-4 w-4" />
                </Button>
              </Link>
              <Button asChild className="bg-foreground text-background hover:bg-foreground/90 px-6 shadow-sm hover:shadow-md transition-shadow">
                <Link href="/login">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
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
                  {mobileNavLinks.map((link, index) => (
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
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3.5 rounded-xl",
                          "text-base font-medium transition-all duration-200",
                          "hover:bg-muted/60 active:scale-[0.98]",
                          "min-h-[48px]",
                          link.isPrimary && "bg-foreground text-background hover:bg-foreground/90"
                        )}
                      >
                        {link.icon && <link.icon className="h-5 w-5" />}
                        <span>{link.label}</span>
                        {link.isPrimary && <ArrowRight className="ml-auto h-4 w-4" />}
                      </Link>
                    </motion.div>
                  ))}

                  {showThemeToggle ? (
                    <motion.div
                      custom={mobileNavLinks.length}
                      variants={menuItemVariants}
                      initial="closed"
                      animate="open"
                      className="pt-2 border-t border-border/40 mt-2"
                    >
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm font-medium text-muted-foreground">Theme</span>
                        <ModeToggle />
                      </div>
                    </motion.div>
                  ) : null}
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}