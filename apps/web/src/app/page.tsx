"use client";

import React, { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer, SOURCE_URL } from "@/components/footer";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowDown,
  ChevronDown,
  Search,
  Github,
  Download as DownloadIcon,
  Braces,
  Globe,
  Database,
  ShieldCheck,
  Container,
  NotebookPen,
  HardDrive,
  Cpu,
  WifiOff,
  UserX,
  CloudOff,
  FolderTree,
  Star,
  Scale,
  GitPullRequest,
  FileText,
  Play,
} from "lucide-react";
import { AppleGlyph, DMG_URL } from "@/components/download-desktop-button";
import { homepageFaqItems } from "@/lib/seo/structured-data";
import MdtAurora from "@/components/mdt-aurora";
import { MdtFx } from "@/components/mdt-fx";
import { Magnetic } from "@/components/mdt-magnetic";
import { Tilt } from "@/components/mdt-tilt";
import { MdtBoot } from "@/components/mdt-boot";
import { MdtDashboard } from "@/components/mdt-dashboard";

// ─── Animation Variants ────────────────────────────────────────────────────────

const EASE_EXPO = [0.16, 1, 0.3, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 32, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE_EXPO },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── Animated section wrapper (triggers on scroll) ─────────────────────────────

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  children,
  align = "center",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  align?: "center" | "left";
}) {
  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.6 }}
      className={
        align === "center"
          ? "mx-auto mb-12 max-w-3xl text-center md:mb-14"
          : "mb-10 max-w-2xl"
      }
    >
      {eyebrow && <p className="mdt-kicker mb-3">{eyebrow}</p>}
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-5xl md:leading-[1.1]">
        {title}
      </h2>
      {children && (
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {children}
        </p>
      )}
    </motion.div>
  );
}

// ─── Data — every item below is a shipped capability; keep it honest ──────────

const PROOF_STRIP = [
  "80+ Tools",
  "API Client",
  "SQL",
  "MongoDB",
  "Redis",
  "Security",
  "Open Source",
  "Offline",
  "Local-first",
] as const;

/** §17 — consolidation, not feature parity with the specialised product. */
const fragmentation = [
  { today: "JSON formatter website", app: "JSON Formatter", href: "/tools/json-formatter" },
  { today: "JWT decoder website", app: "JWT Decoder", href: "/tools/jwt-decoder" },
  { today: "Separate API client", app: "API Client", href: "/tools/api-client" },
  { today: "MongoDB GUI", app: "MongoDB Explorer", href: "/tools/database-explorer" },
  { today: "Redis GUI", app: "Redis Commander", href: "/tools/redis-commander" },
  { today: "SQL client", app: "SQL Client", href: "/tools/sql-client" },
  { today: "Password manager", app: "Local vault", href: "/tools/password-manager" },
  { today: "Notes app for the project", app: "Notes & snippets", href: "/tools/notes" },
] as const;

const capabilities = [
  {
    title: "Developer Utilities",
    icon: Braces,
    blurb: "The everyday formatters, decoders and generators — offline.",
    tools: [
      ["JSON Formatter", "json-formatter"],
      ["YAML Formatter", "yaml-formatter"],
      ["JWT Decoder", "jwt-decoder"],
      ["Regex Tester", "regex-tester"],
      ["UUID / ULID", "uuid-generator"],
      ["Base64", "base64"],
      ["Hash Generator", "hash-generator"],
      ["Diff Checker", "diff-checker"],
    ],
  },
  {
    title: "API & Networking",
    icon: Globe,
    blurb: "Request collections, environments and sockets in one place.",
    tools: [
      ["API Client", "api-client"],
      ["WebSocket Tester", "websocket-tester"],
      ["Webhook Tester", "webhook-tester"],
      ["cURL to Code", "curl-to-code"],
      ["DNS Lookup", "dns-lookup"],
      ["HTTP Status Codes", "http-status-codes"],
    ],
  },
  {
    title: "Databases",
    icon: Database,
    blurb: "Native drivers — connections go straight from your machine to the database.",
    tools: [
      ["SQL Client (PostgreSQL, MySQL, MariaDB)", "sql-client"],
      ["MongoDB Explorer", "database-explorer"],
      ["Redis Commander", "redis-commander"],
      ["S3 Drive", "s3-drive"],
    ],
  },
  {
    title: "Security",
    icon: ShieldCheck,
    blurb: "Credentials and crypto helpers, encrypted locally.",
    tools: [
      ["Password Manager", "password-manager"],
      ["Encryption Playground", "encryption-playground"],
      ["HMAC Generator", "hmac-generator"],
      ["TOTP / 2FA", "totp-generator"],
      ["SSH / RSA Keys", "ssh-key-generator"],
      ["Certificate / PEM Decoder", "certificate-pem-decoder"],
    ],
  },
  {
    title: "DevOps",
    icon: Container,
    blurb: "Config scaffolding and the small calculators you keep looking up.",
    tools: [
      ["Docker Compose Generator", "docker-compose-generator"],
      ["Cron Builder", "cron-builder"],
      [".gitignore Generator", "gitignore-generator"],
      ["Environment Manager", "environment-manager"],
      ["Chmod Calculator", "chmod-calculator"],
    ],
  },
  {
    title: "Productivity",
    icon: NotebookPen,
    blurb: "Project context that stays next to the tools that use it.",
    tools: [
      ["Notes", "notes"],
      ["Code Snippets", "snippet-manager"],
      ["Bookmarks", "bookmarks"],
      ["Tasks", "to-do"],
      ["API Keys", "api-keys"],
    ],
  },
] as const;

/** §12 — what actually lives together in the app. One local personal
 *  workspace ships today; this is not a claim of per-project switching. */
const workspaceTree = [
  { name: "API Client", detail: "collections · environments · history", href: "/tools/api-client" },
  { name: "Databases", detail: "PostgreSQL · MongoDB · Redis · S3", href: "/tools/sql-client" },
  { name: "Vault", detail: "passwords · API keys · env files", href: "/tools/password-manager" },
  { name: "Notes", detail: "markdown, local", href: "/tools/notes" },
  { name: "Snippets", detail: "searchable, tagged", href: "/tools/snippet-manager" },
  { name: "Bookmarks", detail: "links worth keeping", href: "/tools/bookmarks" },
  { name: "Tasks", detail: "what is next", href: "/tools/to-do" },
] as const;

const privacyPoints = [
  {
    icon: Cpu,
    title: "Local processing",
    body: "Formatters, decoders, generators and crypto helpers run on your machine.",
  },
  {
    icon: HardDrive,
    title: "Local storage",
    body: "Notes, snippets, collections and credentials live in an encrypted local database.",
  },
  {
    icon: WifiOff,
    title: "Offline capability",
    body: "Core tools work without a network connection. Only the network tools need one.",
  },
  {
    icon: UserX,
    title: "No mandatory account",
    body: "No sign-up, no sign-in, no activation. The app opens straight to the dashboard.",
  },
  {
    icon: CloudOff,
    title: "No cloud dependency",
    body: "There is no MyDevTools backend to depend on. Anonymous usage stats are opt-in and off by default.",
  },
] as const;

const openSourceFacts = [
  { icon: Scale, label: "License", value: "GNU AGPL v3", href: `${SOURCE_URL}/blob/main/LICENSE` },
  { icon: Github, label: "Repository", value: "mydevtools-tech/mydevtools", href: SOURCE_URL },
  { icon: GitPullRequest, label: "Contribution guide", value: "CONTRIBUTING.md", href: `${SOURCE_URL}/blob/main/CONTRIBUTING.md` },
  { icon: FileText, label: "Security policy", value: "SECURITY.md", href: `${SOURCE_URL}/blob/main/SECURITY.md` },
] as const;

const howItWorks = [
  {
    step: "01",
    title: "Download",
    description: "No account required. Open the app and it is ready to use.",
    icon: DownloadIcon,
  },
  {
    step: "02",
    title: "Search",
    description: "Find any tool instantly with the command palette.",
    icon: Search,
  },
  {
    step: "03",
    title: "Work",
    description: "Use tools locally and keep your workflow together.",
    icon: Play,
  },
  {
    step: "04",
    title: "Build",
    description: "Connect APIs and databases when your workflow requires them.",
    icon: Database,
  },
] as const;

const faqItems = homepageFaqItems;

// Empty subscriber — modKey is read once after hydration; we don't react to platform changes.
const subscribeNoop = () => () => {};
const getModKeyClient = () =>
  /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘" : "Ctrl";
const getModKeyServer = () => "⌘";

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Page() {
  const reduceMotion = useReducedMotion();
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  const modKey = useSyncExternalStore(
    subscribeNoop,
    getModKeyClient,
    getModKeyServer
  );

  const openCommandPalette = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        ctrlKey: true,
        bubbles: true,
      })
    );
  };

  return (
    <div className="dark mdt-deck flex flex-col min-h-screen bg-background text-foreground font-sans">
      {/* deck atmosphere: fixed grid + grain behind everything + gradient def for icons */}
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}>
        <div className="mdt-grid" />
        <div className="mdt-noise" />
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
          <defs>
            <linearGradient id="mdtGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5b63f0" />
              <stop offset="52%" stopColor="#6d7cf5" />
              <stop offset="100%" stopColor="#8a95f7" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <MdtFx />
      <MdtBoot />
      <Header />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 md:py-40 overflow-hidden">
        {/* Ambient orbs + living aurora */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <MdtAurora />
          <motion.div
            className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full bg-indigo-500/15 blur-[120px]"
            animate={
              reduceMotion ? undefined : { x: [0, 50, 0], y: [0, -50, 0], scale: [1, 1.12, 1] }
            }
            transition={
              reduceMotion ? undefined : { duration: 14, repeat: Infinity, ease: "easeInOut" }
            }
          />
          <motion.div
            className="absolute -top-24 -right-48 w-[500px] h-[500px] rounded-full bg-indigo-400/12 blur-[120px]"
            animate={
              reduceMotion ? undefined : { x: [0, -50, 0], y: [0, 50, 0], scale: [1, 1.18, 1] }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1.5 }
            }
          />
        </div>

        <div className="container px-4 md:px-6 mx-auto text-center">
          {/* initial={false} — the hero renders in its final state server-side
              instead of at opacity:0. An entrance animation here would delay the
              paint of the LCP element (the H1) until JS hydrates, and hide the
              headline entirely if it never does. Below-the-fold sections keep
              their scroll reveals; the ambient orbs still animate. */}
          <motion.div
            initial={false}
            animate="visible"
            variants={stagger}
            className="space-y-7 max-w-4xl mx-auto"
          >
            {/* Eyebrow — category first */}
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="mdt-kicker inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5"
            >
              Open source · Offline · Local-first
            </motion.p>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.25rem] font-bold tracking-tight leading-[1.05]"
            >
              The Offline{" "}
              <span className="mdt-grad-text mdt-grad-anim">Developer Workstation</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Stop juggling browser tabs and separate developer apps. MyDevTools
              brings{" "}
              <span className="text-foreground">
                80+ developer tools, an API client, SQL, MongoDB and Redis
              </span>{" "}
              into one desktop workspace.
            </motion.p>

            {/* CTAs — one dominant action, one secondary, one text link */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1"
            >
              <Magnetic strength={0.4} className="w-full sm:w-auto">
                <a
                  href={DMG_URL}
                  download
                  title="macOS 12+ · Universal (Apple Silicon & Intel)"
                  className="mdt-btn-grad inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full text-sm font-semibold w-full sm:w-auto"
                >
                  <AppleGlyph className="h-4 w-4" />
                  Download Free
                  <DownloadIcon className="h-4 w-4 opacity-80" />
                </a>
              </Magnetic>
              <a
                href={SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mdt-btn-ghost inline-flex items-center justify-center gap-2 h-12 px-7 rounded-full text-sm font-medium w-full sm:w-auto"
              >
                <Github className="h-4 w-4" aria-hidden />
                View on GitHub
              </a>
              <Link
                href="/tools"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Explore tools
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            {/* Trust line */}
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="text-sm text-muted-foreground"
            >
              <span className="text-foreground/90">Free. Open source. No account required.</span>
              <span className="mx-2 text-muted-foreground/60">·</span>
              <span className="mdt-mono text-xs">macOS 12+ · Apple Silicon &amp; Intel</span>
            </motion.p>

            {/* Product visual */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.7, delay: 0.36 }}
              className="pt-6 relative mx-auto max-w-5xl"
            >
              <Tilt max={5} className="rounded-2xl">
                <MdtDashboard />
              </Tilt>
              <div className="absolute -bottom-6 inset-x-8 h-16 bg-indigo-500/20 blur-2xl rounded-full pointer-events-none" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Proof strip ──────────────────────────────────────────────────────── */}
      <section aria-label="What is included" className="border-y border-border/40 bg-muted/20">
        <div className="container mx-auto px-4 md:px-6">
          <ul className="mdt-mono flex flex-wrap items-center justify-center gap-x-2 gap-y-2 py-4 text-xs sm:text-sm text-muted-foreground">
            {PROOF_STRIP.map((item, i) => (
              <li key={item} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden className="text-muted-foreground/40">·</span>}
                <span className={i === 0 ? "text-foreground" : undefined}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Problem + fragmentation ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <Section>
            <SectionHeading
              eyebrow="Your workflow is fragmented"
              title={
                <>
                  Your development workflow shouldn&apos;t require{" "}
                  <span className="mdt-grad-text">10 different tools.</span>
                </>
              }
            >
              JSON in one tab. API testing in another. MongoDB somewhere else. Redis
              in another application. A password manager on the side. MyDevTools
              brings those everyday workflows together — it replaces the
              fragmentation, not the tools.
            </SectionHeading>

            <motion.div variants={fadeUp} className="mx-auto max-w-3xl">
              <div className="overflow-hidden rounded-2xl glass-overlay">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border/40 px-5 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  <span>Today — 10+ tabs / apps</span>
                  <span aria-hidden className="w-4" />
                  <span className="text-foreground">With MyDevTools</span>
                </div>
                <ul className="divide-y divide-border/30">
                  {fragmentation.map((row) => (
                    <li
                      key={row.href}
                      className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-3 text-sm"
                    >
                      <span className="text-muted-foreground line-through decoration-muted-foreground/40">
                        {row.today}
                      </span>
                      <ArrowRight aria-hidden className="h-4 w-4 text-indigo-400" />
                      <Link
                        href={row.href}
                        className="group inline-flex items-center gap-1.5 font-medium text-foreground/90 hover:text-foreground"
                      >
                        {row.app}
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-center gap-2 border-t border-border/40 bg-background/40 px-5 py-3 text-xs text-muted-foreground">
                  <ArrowDown aria-hidden className="h-3.5 w-3.5" />
                  One desktop app. Context switching, repeated setup and pasting
                  secrets into random web tools — gone.
                </div>
              </div>
            </motion.div>
          </Section>
        </div>
      </section>

      {/* ── Founder story ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-border/40 bg-muted/20 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <Section className="mx-auto max-w-3xl">
            <SectionHeading
              eyebrow="Why it exists"
              title="I didn't set out to build a developer platform. I just got tired of the tabs."
              align="left"
            />
            <motion.blockquote
              variants={fadeUp}
              className="space-y-4 border-l-2 border-indigo-400/60 pl-5 text-base leading-relaxed text-muted-foreground md:text-lg"
            >
              <p>
                I kept opening 10+ browser tabs for everyday development tasks. I
                started building MyDevTools for myself. I added a password manager
                because I wanted a secure local place for credentials, and a MongoDB
                client because I wanted a customized way to explore my data.
              </p>
              <p>
                It started as a web application. Then I started questioning whether
                sensitive developer data really needed to travel over HTTP in the
                first place. That pushed me toward an offline-first desktop
                application.
              </p>
              <p>
                Friends were also looking for offline-first developer tools, so I kept
                going. MyDevTools is now an open-source desktop developer workstation
                with 80+ tools.
              </p>
              <footer className="pt-2 text-sm text-foreground/80">
                —{" "}
                <a
                  href="https://github.com/itsmeakhil"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline-offset-4 hover:underline"
                >
                  Akhil
                </a>
                , creator of MyDevTools
              </footer>
            </motion.blockquote>
          </Section>
        </div>
      </section>

      {/* ── Capabilities (80+ tools, grouped) ────────────────────────────────── */}
      <section id="tools" className="relative overflow-hidden py-16 md:py-24 scroll-mt-28">
        <div className="container mx-auto px-4 md:px-6">
          <Section>
            <SectionHeading
              eyebrow="80+ tools"
              title={
                <>
                  Everything you need for everyday development.{" "}
                  <span className="mdt-grad-text">In one workspace.</span>
                </>
              }
            >
              Tool breadth is the proof, not the headline. Here is what is actually
              inside — every link opens that tool&apos;s page.
            </SectionHeading>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((group, i) => (
                <motion.div
                  key={group.title}
                  variants={fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  className="flex h-full flex-col rounded-2xl glass-overlay p-6"
                >
                  <div className="mb-3 flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-400 p-px shadow-md">
                      <div className="flex h-full w-full items-center justify-center rounded-[7px] bg-card dark:bg-[hsl(var(--surface-2))]">
                        <group.icon className="h-4 w-4 text-foreground" aria-hidden />
                      </div>
                    </div>
                    <h3 className="text-base font-semibold">{group.title}</h3>
                  </div>
                  <p className="mb-4 text-sm leading-snug text-muted-foreground">{group.blurb}</p>
                  <ul className="mt-auto flex flex-wrap gap-1.5">
                    {group.tools.map(([label, slug]) => (
                      <li key={slug}>
                        <Link
                          href={`/tools/${slug}`}
                          className="inline-block rounded-md border border-border/50 bg-background/50 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-indigo-400/50 hover:text-foreground"
                        >
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                href="/tools"
                className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-7 text-sm font-medium text-background shadow-md transition-all duration-300 hover:scale-[1.03] hover:bg-foreground/90 active:scale-[0.98]"
              >
                Browse all tools
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={openCommandPalette}
                aria-label="Open command palette to search tools"
                className="inline-flex h-11 cursor-pointer items-center gap-3 rounded-full glass-overlay px-5 text-sm text-muted-foreground transition-all duration-200 hover:text-foreground active:scale-[0.98]"
              >
                <Search className="h-4 w-4" />
                <span>Search tools…</span>
                <kbd className="ml-1 inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
                  <span>{modKey}</span>
                  <span>K</span>
                </kbd>
              </button>
            </motion.div>
          </Section>
        </div>
      </section>

      {/* ── Workspace ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-border/40 bg-muted/20 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <Section className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2 md:gap-14">
            <div>
              <SectionHeading
                eyebrow="A workstation, not a tool collection"
                title={
                  <>
                    Your project. Your tools.{" "}
                    <span className="mdt-grad-text">One workspace.</span>
                  </>
                }
                align="left"
              >
                Keep the tools, data, configuration and utilities you use for a
                project together instead of scattering them across tabs and
                applications. API collections, database connections, secrets,
                notes and snippets sit side by side in one local, encrypted
                database on your machine.
              </SectionHeading>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/download">
                    <DownloadIcon className="mr-2 h-4 w-4" aria-hidden />
                    Download MyDevTools
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/features">See features</Link>
                </Button>
              </motion.div>
            </div>

            {/* Workspace tree — only things that ship today */}
            <motion.div variants={fadeUp} transition={{ duration: 0.55, delay: 0.1 }}>
              <div className="overflow-hidden rounded-2xl glass-overlay font-mono text-sm">
                <div className="flex items-center gap-2 border-b border-border/40 bg-muted/40 px-4 py-2.5">
                  <FolderTree className="h-4 w-4 text-indigo-400" aria-hidden />
                  <span className="font-semibold">Your workspace</span>
                  <span className="ml-auto rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
                    on your device
                  </span>
                </div>
                <ul className="p-2">
                  {workspaceTree.map((node, i) => {
                    const last = i === workspaceTree.length - 1;
                    return (
                      <li key={node.name}>
                        <Link
                          href={node.href}
                          className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
                        >
                          <span aria-hidden className="text-muted-foreground/50">
                            {last ? "└──" : "├──"}
                          </span>
                          <span className="text-foreground/90 group-hover:text-foreground">
                            {node.name}
                          </span>
                          <span className="ml-auto truncate text-xs text-muted-foreground">
                            {node.detail}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.div>
          </Section>
        </div>
      </section>

      {/* ── Offline / privacy ────────────────────────────────────────────────── */}
      <section id="privacy" className="relative overflow-hidden py-16 md:py-24 scroll-mt-28">
        <div className="container mx-auto px-4 md:px-6">
          <Section>
            <SectionHeading
              eyebrow="Why offline?"
              title="Why send developer data somewhere else if you can process it locally?"
            >
              MyDevTools Desktop is designed around local-first development. Core
              tools run on your machine without requiring an account or cloud
              service.
            </SectionHeading>

            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {privacyPoints.map((p, i) => (
                <motion.div
                  key={p.title}
                  variants={fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  className="rounded-2xl glass-overlay p-5"
                >
                  <p.icon className="mb-3 h-5 w-5 text-indigo-400" aria-hidden />
                  <h3 className="mb-1.5 text-sm font-semibold">{p.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{p.body}</p>
                </motion.div>
              ))}
            </div>

            {/* Network transparency — precise, not absolute */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="mx-auto mt-8 max-w-3xl rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.06] p-6 text-center"
            >
              <p className="text-lg font-semibold text-foreground md:text-xl">
                Your data isn&apos;t sent to MyDevTools servers.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Network-enabled tools connect to external destinations only when you
                explicitly use them, such as an API or database. This website only
                documents the app and hands you the download — the tools do not run
                here.
              </p>
              <Link
                href="/security"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                Read the security &amp; privacy details
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </Section>
        </div>
      </section>

      {/* ── Open source ──────────────────────────────────────────────────────── */}
      <section
        id="open-source"
        className="relative overflow-hidden border-y border-border/40 bg-muted/20 py-16 md:py-24 scroll-mt-28"
      >
        <div className="container mx-auto px-4 md:px-6">
          <Section>
            <SectionHeading
              eyebrow="Built in the open"
              title={
                <>
                  Don&apos;t trust our privacy claims.{" "}
                  <span className="mdt-grad-text">Verify them.</span>
                </>
              }
            >
              MyDevTools is open source. Read the source, inspect the architecture,
              understand how data is handled, report issues, and contribute
              improvements.
            </SectionHeading>

            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <a
                href={SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-foreground px-8 text-sm font-medium text-background shadow-md transition-all duration-300 hover:scale-[1.03] hover:bg-foreground/90 active:scale-[0.98] sm:w-auto"
              >
                <Github className="mr-2 h-4 w-4" aria-hidden />
                View MyDevTools on GitHub
              </a>
              <a
                href={`${SOURCE_URL}/blob/main/CONTRIBUTING.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="mdt-btn-ghost inline-flex h-12 w-full items-center justify-center rounded-full px-7 text-sm font-medium sm:w-auto"
              >
                Contribute
              </a>
              <Link
                href="/security"
                className="mdt-btn-ghost inline-flex h-12 w-full items-center justify-center rounded-full px-7 text-sm font-medium sm:w-auto"
              >
                Security
              </Link>
            </motion.div>

            <motion.ul
              variants={fadeUp}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              {openSourceFacts.map((fact) => (
                <li key={fact.label}>
                  <a
                    href={fact.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-full flex-col rounded-xl glass-overlay p-4 transition-colors hover:border-indigo-400/40"
                  >
                    <span className="mb-2 flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                      <fact.icon className="h-3.5 w-3.5" aria-hidden />
                      {fact.label}
                    </span>
                    <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground">
                      {fact.value}
                    </span>
                  </a>
                </li>
              ))}
            </motion.ul>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="mt-8 flex flex-col items-center justify-center gap-4 text-sm text-muted-foreground sm:flex-row sm:gap-6"
            >
              <p className="inline-flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-current text-amber-400" aria-hidden />
                If MyDevTools saves you time, consider starring the project.
              </p>
              <a
                href="https://www.producthunt.com/products/mydevtools?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-mydevtools"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block transition-opacity hover:opacity-90"
              >
                <Image
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1041847&theme=dark&t=1764002797983"
                  alt="MyDevTools on Product Hunt"
                  width={180}
                  height={39}
                  unoptimized
                />
              </a>
            </motion.div>
          </Section>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <Section>
            <SectionHeading eyebrow="How it works" title="From 10 browser tabs to one workspace.">
              From download to productive in under a minute.
            </SectionHeading>

            <div className="relative mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 md:gap-10">
              <div className="hidden lg:block absolute top-10 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-px border-t border-dashed border-border/50" />
              {howItWorks.map((step, i) => (
                <motion.div
                  key={step.step}
                  variants={fadeUp}
                  transition={{ duration: 0.55, delay: i * 0.1 }}
                  className="relative flex flex-col items-center text-center"
                >
                  <div className="z-10 mb-6 h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-400 p-px shadow-lg shadow-black/40">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-card dark:bg-[hsl(var(--surface-2))]">
                      <step.icon className="h-8 w-8 text-foreground" aria-hidden />
                    </div>
                  </div>
                  <span className="mb-2 font-mono text-xs font-bold tracking-widest text-muted-foreground/60">
                    STEP {step.step}
                  </span>
                  <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                  <p className="max-w-[240px] text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-border/40 bg-muted/20 py-16 md:py-24">
        <div className="container mx-auto max-w-3xl px-4 md:px-6">
          <Section>
            <SectionHeading title="Common questions">
              Everything you need to know before downloading.
            </SectionHeading>

            <div className="space-y-3">
              {faqItems.map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.07 }}
                >
                  <Collapsible
                    open={openFaqIdx === i}
                    onOpenChange={(open) => setOpenFaqIdx(open ? i : null)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex w-full items-center justify-between rounded-2xl glass-overlay px-6 py-4 text-left transition-all duration-200 hover:border-border/70 hover:bg-card/70">
                        <span className="pr-4 text-base font-medium">{item.q}</span>
                        <motion.div
                          animate={{ rotate: openFaqIdx === i ? 180 : 0 }}
                          transition={{ duration: 0.25 }}
                          className="shrink-0 text-muted-foreground"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </motion.div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="-mt-2 rounded-b-2xl border border-t-0 border-border/40 bg-card/40 px-6 pb-4 pt-2 text-sm leading-relaxed text-muted-foreground dark:border-white/5 dark:bg-background/60">
                        {item.a}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 md:py-36">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/2 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/12 blur-[100px]" />
          <div className="absolute top-1/2 right-1/4 h-[500px] w-[500px] translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/12 blur-[100px]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center md:px-6">
          <Section>
            <motion.div variants={fadeUp} transition={{ duration: 0.55 }}>
              <div className="glass-modal mx-auto max-w-3xl rounded-3xl px-8 py-14 md:px-16 md:py-20">
                <motion.h2
                  variants={fadeUp}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="mb-6 text-3xl font-bold leading-tight sm:text-5xl md:text-6xl"
                >
                  One workspace. Your tools.{" "}
                  <span className="mdt-grad-text mdt-grad-anim">Your machine.</span>
                </motion.h2>

                <motion.p
                  variants={fadeUp}
                  transition={{ duration: 0.6, delay: 0.18 }}
                  className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
                >
                  80+ developer tools, API, SQL, MongoDB and Redis — open source,
                  local-first and offline.
                </motion.p>

                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.6, delay: 0.26 }}
                  className="flex flex-col items-center justify-center gap-3 sm:flex-row"
                >
                  <Link
                    href="/download"
                    className="inline-flex h-14 w-full items-center justify-center rounded-full bg-foreground px-10 text-base font-medium text-background shadow-md transition-all duration-300 hover:scale-[1.05] hover:bg-foreground/90 hover:shadow-lg active:scale-[0.98] sm:w-auto"
                  >
                    Download Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <a
                    href={SOURCE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-14 w-full items-center justify-center rounded-full border border-border/60 bg-background/60 px-10 text-base font-medium text-foreground backdrop-blur-sm transition-all duration-300 hover:scale-[1.04] hover:bg-muted active:scale-[0.98] dark:border-white/10 sm:w-auto"
                  >
                    <Github className="mr-2 h-5 w-5" aria-hidden />
                    View on GitHub
                  </a>
                </motion.div>

                <motion.p
                  variants={fadeUp}
                  transition={{ duration: 0.6, delay: 0.32 }}
                  className="mt-6 text-sm text-muted-foreground"
                >
                  Free · Open Source · Offline · macOS 12+
                </motion.p>
              </div>
            </motion.div>
          </Section>
        </div>
      </section>

      <Footer />
    </div>
  );
}
