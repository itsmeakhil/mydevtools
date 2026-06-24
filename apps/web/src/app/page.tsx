"use client";

import React, { useRef, useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Zap,
  Shield,
  Sparkles,
  Star,
  GitFork,
  ChevronDown,
  LogIn,
  LayoutGrid,
  ExternalLink,
  Lock,
  Globe,
  CheckCircle2,
  Search,
  Server,
  Cloud,
  Crown,
} from "lucide-react";
import { sidebarData } from "@/components/sidebar/data/sidebar-data";
import { homepageFaqItems } from "@/lib/seo/structured-data";
import MdtAurora from "@/components/mdt-aurora";
import { MdtFx } from "@/components/mdt-fx";
import { Magnetic } from "@/components/mdt-magnetic";
import { Tilt } from "@/components/mdt-tilt";
import { MdtBoot } from "@/components/mdt-boot";

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

// ─── Data ──────────────────────────────────────────────────────────────────────

type HomeToolEntry = {
  title: string;
  description: string;
  url: string;
  icon?: React.ElementType;
  category: string;
};

type ToolCategory = {
  title: string;
  icon?: React.ElementType;
  tools: HomeToolEntry[];
};

function buildToolCategories(): ToolCategory[] {
  const out: ToolCategory[] = [];
  for (const group of sidebarData.navGroups) {
    const tools: HomeToolEntry[] = [];
    for (const item of group.items) {
      if ("items" in item && item.items?.length) {
        for (const sub of item.items) {
          if (!sub.url) continue;
          tools.push({
            title: sub.title,
            description: sub.description ?? "",
            url: typeof sub.url === "string" ? sub.url : String(sub.url),
            icon: sub.icon ?? item.icon,
            category: group.title,
          });
        }
      } else if ("url" in item && item.url) {
        tools.push({
          title: item.title,
          description: item.description ?? "",
          url: typeof item.url === "string" ? item.url : String(item.url),
          icon: item.icon,
          category: group.title,
        });
      }
    }
    if (tools.length) out.push({ title: group.title, icon: group.icon, tools });
  }
  return out;
}

const toolCategories = buildToolCategories();
const allAppTools: HomeToolEntry[] = toolCategories.flatMap((c) => c.tools);

const toolListGradients = [
  "from-sky-500 to-cyan-400",
  "from-violet-500 to-purple-400",
  "from-emerald-500 to-teal-400",
  "from-rose-500 to-orange-400",
  "from-amber-500 to-yellow-400",
  "from-indigo-500 to-blue-400",
] as const;

const homepageToolSlugs = [
  'json-formatter',
  'jwt-decoder',
  'api-client',
  'regex-tester',
  'uuid-generator',
  'base64',
  'hash-generator',
  'url-parser',
  'timestamp-converter',
  'cron-builder',
  'mock-data-generator',
  'docker-compose-generator',
] as const;

const homepageTools = homepageToolSlugs
  .map((slug) => allAppTools.find((tool) => tool.url === `/app/${slug}`))
  .filter((tool): tool is HomeToolEntry => Boolean(tool));

const howItWorks = [
  {
    step: "01",
    title: "Sign In Instantly",
    description:
      "One-click Google Sign-In on our cloud. No email or password friction. Self-hosting is free forever; the hosted cloud is a paid subscription.",
    icon: LogIn,
    gradient: "from-sky-500 to-cyan-400",
  },
  {
    step: "02",
    title: "Pick Your Tool",
    description: `Choose from ${allAppTools.length} tools in one unified dashboard. Everything in a single tab.`,
    icon: LayoutGrid,
    gradient: "from-violet-500 to-purple-400",
  },
  {
    step: "03",
    title: "Work Privately",
    description:
      "Data is AES-256 encrypted in your browser before sync. The server never sees your plaintext.",
    icon: Shield,
    gradient: "from-emerald-500 to-teal-400",
  },
];

const faqItems = homepageFaqItems;

// Empty subscriber — modKey is read once after hydration; we don't react to platform changes.
const subscribeNoop = () => () => {};
const getModKeyClient = () =>
  /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘" : "Ctrl";
const getModKeyServer = () => "⌘";

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();
  const goToLogin = () => router.push("/login");

  const reduceMotion = useReducedMotion();
  const [githubStars, setGithubStars] = useState<number | null>(null);
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


  useEffect(() => {
    fetch("https://api.github.com/repos/itsmeakhil/mydevtools.tech", {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.stargazers_count === "number") {
          setGithubStars(d.stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="dark mdt-deck flex flex-col min-h-screen bg-background text-foreground font-sans">
      {/* deck atmosphere: fixed grid + grain behind everything + gradient def for icons */}
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div className="mdt-grid" />
        <div className="mdt-noise" />
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
          <defs>
            <linearGradient id="mdtGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5b63f0" />
              <stop offset="52%" stopColor="#9a5cf2" />
              <stop offset="100%" stopColor="#4fd0e6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <MdtFx />
      <MdtBoot />
      <Header showThemeToggle={false} />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 md:py-40 lg:py-48 overflow-hidden">
        {/* Ambient orbs + living aurora */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <MdtAurora />
          <motion.div
            className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full bg-violet-500/15 blur-[120px]"
            animate={
              reduceMotion ? undefined : { x: [0, 50, 0], y: [0, -50, 0], scale: [1, 1.12, 1] }
            }
            transition={
              reduceMotion ? undefined : { duration: 14, repeat: Infinity, ease: "easeInOut" }
            }
          />
          <motion.div
            className="absolute -top-24 -right-48 w-[500px] h-[500px] rounded-full bg-sky-500/15 blur-[120px]"
            animate={
              reduceMotion ? undefined : { x: [0, -50, 0], y: [0, 50, 0], scale: [1, 1.18, 1] }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1.5 }
            }
          />
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-pink-500/10 blur-[100px]"
            animate={
              reduceMotion ? undefined : { scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.8 }
            }
          />
        </div>

        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] dark:opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />

        <div className="container px-4 md:px-6 mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="space-y-8 max-w-4xl mx-auto"
          >
            {/* Pill badge */}
            <motion.div variants={fadeUp} transition={{ duration: 0.55 }}>
              <Badge
                variant="secondary"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-border/60 bg-muted/70 backdrop-blur-md text-foreground"
              >
                <motion.span
                  animate={reduceMotion ? undefined : { rotate: [0, 18, -18, 0] }}
                  transition={
                    reduceMotion
                      ? undefined
                      : { duration: 2.5, repeat: Infinity, repeatDelay: 4 }
                  }
                  className="inline-flex"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </motion.span>
                Online developer tools in one browser tab
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.08]"
            >
              <span className="text-foreground">Online Developer Tools</span>
              <br />
              <span className="mdt-grad-text mdt-grad-anim">
                JSON, JWT, Regex &amp; {allAppTools.length}+ More
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Format JSON, decode JWTs, test APIs, build regexes, generate UUIDs,
              encode Base64, and use dozens more browser-based developer tools in
              one open-source toolkit.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
            >
              <Magnetic strength={0.4} className="w-full sm:w-auto">
                <button
                  onClick={goToLogin}
                  className="mdt-btn-grad inline-flex items-center justify-center h-12 px-8 rounded-full text-sm font-medium w-full sm:w-auto"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </Magnetic>
              <Link
                href="https://github.com/itsmeakhil/mydevtools.tech"
                target="_blank"
                className="inline-flex items-center justify-center h-12 px-8 rounded-full text-sm font-medium border border-border/60 dark:border-white/10 bg-background/70 backdrop-blur-md text-foreground hover:bg-muted hover:scale-[1.04] active:scale-[0.98] transition-all duration-300 w-full sm:w-auto"
              >
                <Star className="mr-2 h-4 w-4" />
                Star on GitHub
              </Link>
              <Link
                href="/developer-tools"
                className="inline-flex items-center justify-center h-12 px-8 rounded-full text-sm font-medium border border-border/60 dark:border-white/10 bg-background/50 backdrop-blur-md text-foreground hover:bg-muted hover:scale-[1.04] active:scale-[0.98] transition-all duration-300 w-full sm:w-auto"
              >
                Explore Platform
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.32 }}
              className="pt-6 grid grid-cols-3 gap-4 sm:gap-6 max-w-md mx-auto"
            >
              {[
                { value: `${allAppTools.length}+`, label: "Online Tools" },
                { value: "GPL-3.0", label: "Open Source" },
                { value: "Self-host", label: "Free Forever" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight whitespace-nowrap mdt-grad-text">
                    {s.value}
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-1 leading-snug">
                    {s.label}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Dashboard screenshot */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="pt-4 relative mx-auto max-w-5xl"
            >
              {/* Browser chrome frame */}
              <Tilt max={5} className="rounded-2xl">
              <div className="rounded-2xl glass-overlay shadow-2xl shadow-violet-500/8 dark:shadow-violet-500/5 overflow-hidden">
                {/* Fake browser bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/40">
                  <div className="flex gap-1.5 shrink-0">
                    <div className="w-3 h-3 rounded-full bg-rose-400/70" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/70" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/70" />
                  </div>
                  <div className="flex-1 mx-4 min-w-0 h-6 rounded-md bg-background/60 border border-border/40 text-xs text-muted-foreground flex items-center px-3">
                    <span className="truncate">https://mydevtools.tech/dashboard</span>
                  </div>
                </div>
                <Image
                  src="/images/dashboard-dark.png"
                  alt="MyDevTools dashboard interface showing unified developer toolkit: SQL client, NoSQL explorer, API client, JSON formatter, and 60+ tools in one workspace"
                  width={1024}
                  height={597}
                  priority
                  className="w-full h-auto"
                />
              </div>
              </Tilt>
              {/* Glow beneath the screenshot */}
              <div className="absolute -bottom-6 inset-x-8 h-16 bg-violet-500/20 blur-2xl rounded-full pointer-events-none" />
            </motion.div>

            {/* Product Hunt badge */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="pt-2"
            >
              <a
                href="https://www.producthunt.com/products/mydevtools?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-mydevtools"
                target="_blank"
                className="inline-block hover:opacity-90 hover:scale-105 transition-all duration-300"
              >
                <Image
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1041847&theme=dark&t=1764002797983"
                  alt="MyDevTools - Essential tools for developers | Product Hunt"
                  width={250}
                  height={54}
                  unoptimized
                />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── USP Intro ────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-muted/30 border-y border-border/40">
        <div className="container px-4 md:px-6 mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="max-w-4xl mx-auto space-y-6"
          >
            <motion.div
              variants={fadeUp}
              className="prose prose-invert max-w-none text-center text-foreground/90 space-y-4"
            >
              <p className="text-lg leading-relaxed">
                MyDevTools is the unified developer toolkit that brings together everything you need: a powerful SQL, NoSQL (MongoDB), and Redis database client alongside 60+ utility tools. Stop switching between tabs and apps—format JSON, test APIs, decode JWTs, build regexes, generate UUIDs, and manage databases all in one workspace.
              </p>
              <p className="text-lg leading-relaxed">
                Privacy-first architecture means your data is processed in your browser whenever possible. Sensitive credentials are AES-256 encrypted before sync. Whether you're testing REST endpoints, debugging database queries, or working with cryptographic tools, everything runs with zero-knowledge encryption. Self-host for free or use our managed cloud with paid subscription.
              </p>
              <p className="text-lg leading-relaxed">
                Open source (GPL-3.0), fully self-hostable, and trusted by developers. No ads, no tracking, no data harvesting. Compare MyDevTools to Postman (API client alternative), DBeaver (database GUI), single-purpose online tools, and other dev tool platforms—we unify what others scatter across 20 tabs.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section id="tools" className="py-16 md:py-24 relative overflow-hidden scroll-mt-28">
        <div className="container px-4 md:px-6 mx-auto">
          <Section>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="text-center mb-14"
            >
              <Badge
                variant="secondary"
                className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
              >
                <Sparkles className="w-3 h-3" />
                Get Started in Seconds
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                From zero to productive in under a minute.
              </p>
            </motion.div>

            <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-10 max-w-4xl mx-auto">
              {/* Connecting line (desktop only) */}
              <div className="hidden sm:block absolute top-10 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px border-t border-dashed border-border/50" />

              {howItWorks.map((step, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  transition={{ duration: 0.55, delay: i * 0.12 }}
                  className="flex flex-col items-center text-center relative"
                >
                  {/* Step circle */}
                  <div
                    className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.gradient} p-px mb-6 shadow-lg shadow-black/20 dark:shadow-black/40 z-10`}
                  >
                    <div className="w-full h-full rounded-full bg-card dark:bg-[hsl(var(--surface-2))] flex items-center justify-center">
                      <step.icon className="w-8 h-8 text-foreground" />
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-muted-foreground/60 mb-2 tracking-widest">
                    STEP {step.step}
                  </span>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px]">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ── Bento Showcase ─────────────────────────────────────────────────── */}
      <section
        id="features"
        className="py-16 md:py-28 relative overflow-hidden scroll-mt-28"
      >
        <div className="container px-4 md:px-6 mx-auto">
          <Section>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-14"
            >
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
                Built for Modern Developers
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Real tools, real previews — speed and privacy by default.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {/* T1 — JSON Formatter (large) */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.55 }}
                className="md:col-span-2 md:row-span-2"
              >
                <Link
                  href="/tools/json-formatter"
                  className="group relative flex h-full min-h-[380px] flex-col overflow-hidden rounded-2xl glass-overlay p-6 md:p-8 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl dark:hover:shadow-black/40"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 bg-gradient-to-br from-amber-500 to-orange-400" />
                  <div className="relative z-10 flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-400 p-px shadow-md">
                      <div className="w-full h-full rounded-[7px] bg-card dark:bg-[hsl(var(--surface-2))] flex items-center justify-center">
                        <Zap className="w-4 h-4 text-foreground" />
                      </div>
                    </div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                      Lightning Fast
                    </span>
                  </div>
                  <h3 className="relative z-10 text-2xl font-semibold mb-3">
                    Format & validate in milliseconds
                  </h3>
                  <p className="relative z-10 text-muted-foreground leading-relaxed mb-6 max-w-md text-sm md:text-base">
                    JSON, SQL, Markdown — formatters and editors that run
                    entirely in your browser. No round-trips, no copy-paste
                    detours.
                  </p>

                  {/* JSON code preview */}
                  <div className="relative z-10 mt-auto rounded-xl border border-border/40 dark:border-white/5 bg-background overflow-hidden font-mono text-xs md:text-sm">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/40">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        payload.json
                      </span>
                    </div>
                    <pre className="p-4 leading-relaxed text-foreground/90 overflow-x-auto">
{`{
  "name": "mydevtools",
  "tools": ${allAppTools.length},
  "encrypted": true,
  "open_source": true
}`}
                    </pre>
                  </div>

                  <div className="relative z-10 mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                    <span>Explore JSON Formatter</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </motion.div>

              {/* T2 — Password Manager */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.55, delay: 0.1 }}
              >
                <Link
                  href="/tools/password-manager"
                  className="group relative flex h-full min-h-[180px] flex-col overflow-hidden rounded-2xl glass-overlay p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl dark:hover:shadow-black/40"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 bg-gradient-to-br from-emerald-500 to-teal-400" />
                  <div className="relative z-10 flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 p-px shadow-md">
                      <div className="w-full h-full rounded-[7px] bg-card dark:bg-[hsl(var(--surface-2))] flex items-center justify-center">
                        <Lock className="w-4 h-4 text-foreground" />
                      </div>
                    </div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                      Secure &amp; Private
                    </span>
                  </div>
                  <h3 className="relative z-10 text-lg font-semibold mb-3">
                    Zero-knowledge vault
                  </h3>

                  {/* Password entries preview */}
                  <div className="relative z-10 mt-auto space-y-1.5">
                    {["github.com", "vercel.com", "anthropic.com"].map(
                      (label) => (
                        <div
                          key={label}
                          className="flex items-center justify-between px-3 py-1.5 rounded-md bg-background border border-border/40 dark:border-white/5 text-xs"
                        >
                          <span className="text-foreground/90 font-mono truncate pr-2">
                            {label}
                          </span>
                          <span className="font-mono tracking-widest text-muted-foreground shrink-0">
                            ••••••••
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </Link>
              </motion.div>

              {/* T3 — API Client */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.55, delay: 0.2 }}
              >
                <Link
                  href="/tools/api-client"
                  className="group relative flex h-full min-h-[180px] flex-col overflow-hidden rounded-2xl glass-overlay p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl dark:hover:shadow-black/40"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 bg-gradient-to-br from-violet-500 to-blue-400" />
                  <div className="relative z-10 flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-blue-400 p-px shadow-md">
                      <div className="w-full h-full rounded-[7px] bg-card dark:bg-[hsl(var(--surface-2))] flex items-center justify-center">
                        <Globe className="w-4 h-4 text-foreground" />
                      </div>
                    </div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                      Developer First
                    </span>
                  </div>
                  <h3 className="relative z-10 text-lg font-semibold mb-3">
                    Test endpoints in one tab
                  </h3>

                  {/* API request preview */}
                  <div className="relative z-10 mt-auto rounded-md border border-border/40 dark:border-white/5 bg-background overflow-hidden font-mono text-[11px]">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                        GET
                      </span>
                      <span className="text-muted-foreground truncate">
                        /api/v1/users
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> 200
                      </span>
                    </div>
                    <div className="px-3 py-2 text-foreground/80 truncate">
                      {`{ "id": 42, "ok": true }`}
                    </div>
                  </div>
                </Link>
              </motion.div>
            </div>
          </Section>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        className="py-16 md:py-28 relative overflow-hidden scroll-mt-28"
      >
        <div className="absolute inset-0 -z-10 bg-muted/20" />
        <div className="container px-4 md:px-6 mx-auto">
          <Section>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-14"
            >
              <Badge
                variant="secondary"
                className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
              >
                <Sparkles className="w-3 h-3" />
                Pricing
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
                Self-host free. Cloud is paid.
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Same open-source product everywhere. Run it yourself at no cost,
                or let us handle hosting with a paid subscription.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-5 max-w-5xl mx-auto">
              {/* Self-host */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.55 }}
                className="relative flex flex-col rounded-2xl glass-overlay p-7 md:p-8 border border-emerald-500/20 shadow-lg shadow-emerald-500/5"
              >
                <div className="mb-6 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 p-px shadow-md">
                  <div className="w-full h-full rounded-[11px] bg-card dark:bg-[hsl(var(--surface-2))] flex items-center justify-center">
                    <Server className="w-5 h-5 text-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-1">Self-hosted</h3>
                <p className="text-3xl font-bold tracking-tight mb-1">
                  $0{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    forever
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mb-6 flex-1 leading-relaxed">
                  Clone the repo, deploy the web app and backend, and use every
                  tool with no license fee and no usage limits from us.
                </p>
                <ul className="space-y-2.5 text-sm text-muted-foreground mb-8">
                  {[
                    "Full source under GPL-3.0",
                    "All tools and features included",
                    "You control data & infrastructure",
                  ].map((line) => (
                    <li key={line} className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="https://github.com/itsmeakhil/mydevtools.tech"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-border/60 dark:border-white/10 bg-background/60 px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                >
                  View on GitHub
                  <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-70" />
                </Link>
              </motion.div>

              {/* Cloud */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.55, delay: 0.06 }}
                className="mdt-beam relative flex flex-col rounded-2xl glass-overlay p-7 md:p-8 border border-sky-500/25"
              >
                <Badge className="absolute top-5 right-5 rounded-full text-[11px] font-medium px-2.5 py-0.5 bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  Paid
                </Badge>
                <div className="mb-6 w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 p-px shadow-md">
                  <div className="w-full h-full rounded-[11px] bg-card dark:bg-[hsl(var(--surface-2))] flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-1">MyDevTools Cloud</h3>
                <p className="text-3xl font-bold tracking-tight mb-1">
                  Subscription
                </p>
                <p className="text-sm font-medium text-muted-foreground mb-6">
                  Managed hosting with secure sync and backups.
                </p>
                <p className="text-sm text-muted-foreground mb-6 flex-1 leading-relaxed">
                  We run the infrastructure so you do not have to. Your sensitive
                  data stays encrypted before sync; plaintext stays in your browser.
                </p>
                <ul className="space-y-2.5 text-sm text-muted-foreground mb-8">
                  {[
                    "Same product, zero deploy hassle",
                    "Secure sync and backups from us",
                    "Cancel any time",
                  ].map((line) => (
                    <li key={line} className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-500 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="rounded-full w-full bg-sky-500 hover:bg-sky-400 text-white"
                >
                  <Link href="/login">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>

              {/* Premium */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.55, delay: 0.12 }}
                className="relative flex flex-col rounded-2xl glass-overlay p-7 md:p-8 border border-violet-500/25"
              >
                <Badge className="absolute top-5 right-5 rounded-full text-[11px] font-medium px-2.5 py-0.5 bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  Coming soon
                </Badge>
                <div className="mb-6 w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-400 p-px shadow-md">
                  <div className="w-full h-full rounded-[11px] bg-card dark:bg-[hsl(var(--surface-2))] flex items-center justify-center">
                    <Crown className="w-5 h-5 text-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-1">Premium</h3>
                <p className="text-3xl font-bold tracking-tight mb-1">Add-ons</p>
                <p className="text-sm text-muted-foreground mb-6 flex-1 leading-relaxed">
                  Optional paid capabilities on top of Cloud for teams, advanced
                  workflows, and managed collaboration. Self-hosting remains fully
                  capable for individual developers.
                </p>
                <ul className="space-y-2.5 text-sm text-muted-foreground mb-8">
                  {[
                    "Advanced workflows for power users",
                    "Team-oriented collaboration features",
                    "Self-host remains fully capable",
                  ].map((line) => (
                    <li key={line} className="flex gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-violet-400 mt-0.5" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="rounded-full w-full border-dashed opacity-90 cursor-default"
                  disabled
                >
                  Coming soon
                </Button>
              </motion.div>
            </div>
          </Section>
        </div>
      </section>

      {/* ── Tools teaser ────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-muted/20" />
        <div className="container px-4 md:px-6 mx-auto">
          <Section>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="text-center mb-10 md:mb-12"
            >
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
                {allAppTools.length}+ Tools, One Dashboard
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
                From JSON formatters to API clients, generators, and database
                explorers — everything you need in one online developer toolkit.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/tools"
                  className="inline-flex items-center justify-center h-11 px-7 rounded-full text-sm font-medium bg-foreground text-background hover:bg-foreground/90 shadow-md hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
                >
                  Browse all tools
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={openCommandPalette}
                  aria-label="Open command palette to search tools"
                  className="inline-flex items-center gap-3 h-11 px-5 rounded-full glass-overlay text-sm text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer active:scale-[0.98]"
                >
                  <Search className="w-4 h-4" />
                  <span>Search tools…</span>
                  <kbd className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border/60 bg-muted/60 text-[11px] font-mono text-foreground/80">
                    <span>{modKey}</span>
                    <span>K</span>
                  </kbd>
                </button>
              </div>
            </motion.div>

            {/* Infinite tool-name ticker */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="mdt-marquee mb-10 border-y border-border/40 py-3.5"
            >
              <div className="mdt-marquee__track">
                {[...allAppTools, ...allAppTools].map((t, i) => (
                  <span
                    key={i}
                    className="mdt-mono inline-flex items-center gap-2 text-sm mdt-text-muted"
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: "var(--mdt-grad)" }}
                    />
                    {t.title}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
            >
              {[
                { href: "/developer-tools", label: "Developer tools platform" },
                { href: "/features", label: "Product features" },
                { href: "/security", label: "Security and privacy" },
                { href: "/self-host", label: "Self-host MyDevTools" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </motion.div>

            {/* Featured tool cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {homepageTools.map((tool, i) => {
                const g = toolListGradients[i % toolListGradients.length];
                const Icon = tool.icon;
                return (
                  <motion.div
                    key={tool.url}
                    variants={fadeUp}
                    transition={{ duration: 0.45, delay: i * 0.07 }}
                  >
                    <Link
                      href={`/tools/${tool.url.replace(/^\/app\//, "")}`}
                      className="group block h-full rounded-xl glass-overlay p-4 hover:scale-[1.02] hover:shadow-xl dark:hover:shadow-black/30 transition-all duration-300"
                    >
                      <div className="flex gap-3 items-start">
                        {Icon ? (
                          <div className={`shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${g} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300`}>
                            <Icon className="w-5 h-5 text-white" stroke={1.75} />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm sm:text-base mb-0.5 flex items-center gap-1.5">
                            {tool.title}
                            <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="mt-8 text-center"
            >
              <Link
                href="/tools"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                See all {allAppTools.length} tools
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </Section>
        </div>
      </section>

      {/* ── Social Proof ─────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-muted/20" />
        <div className="container px-4 md:px-6 mx-auto">
          <Section>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="text-center mb-14"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                Built on Trust Signals Developers Can Verify
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Open-source code, public community proof, self-hosting, and
                browser-side encryption instead of vague promises.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
              {/* Open Source card */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.55, delay: 0 }}
              >
                <div className="group relative h-full rounded-2xl glass-overlay p-7 hover:scale-[1.015] hover:shadow-2xl dark:hover:shadow-black/40 transition-all duration-300 overflow-hidden flex flex-col">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500 bg-gradient-to-br from-sky-500 to-cyan-400" />
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 p-px mb-6 shadow-lg">
                    <div className="w-full h-full rounded-[11px] bg-card dark:bg-[hsl(var(--surface-2))] flex items-center justify-center">
                      <GitFork className="w-5 h-5 text-foreground" />
                    </div>
                  </div>
                  <h3 className="relative z-10 text-xl font-semibold mb-3">
                    100% Open Source
                  </h3>
                  <p className="relative z-10 text-muted-foreground leading-relaxed text-sm md:text-base mb-5 flex-1">
                    GPL-3.0 licensed. Full source on GitHub so developers can
                    inspect the code, contribute features, fork, or self-host.
                  </p>
                  <Link
                    href="https://github.com/itsmeakhil/mydevtools.tech"
                    target="_blank"
                    className="relative z-10 inline-flex items-center gap-1.5 text-sm font-medium text-sky-500 hover:text-sky-400 transition-colors"
                  >
                    <Star className="w-4 h-4" />
                    {githubStars !== null ? (
                      <span>{githubStars} stars on GitHub</span>
                    ) : (
                      <span>View on GitHub</span>
                    )}
                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                  </Link>
                </div>
              </motion.div>

              {/* Product Hunt card */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.55, delay: 0.1 }}
              >
                <div className="group relative h-full rounded-2xl glass-overlay p-7 hover:scale-[1.015] hover:shadow-2xl dark:hover:shadow-black/40 transition-all duration-300 overflow-hidden flex flex-col">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500 bg-gradient-to-br from-amber-500 to-orange-400" />
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 p-px mb-6 shadow-lg">
                    <div className="w-full h-full rounded-[11px] bg-card dark:bg-[hsl(var(--surface-2))] flex items-center justify-center">
                      <Star className="w-5 h-5 text-foreground" />
                    </div>
                  </div>
                  <h3 className="relative z-10 text-xl font-semibold mb-3">
                    Featured on Product Hunt
                  </h3>
                  <p className="relative z-10 text-muted-foreground leading-relaxed text-sm md:text-base mb-5 flex-1">
                    Public launch and feedback surface for real developer
                    discovery, reviews, and community validation.
                  </p>
                  <a
                    href="https://www.producthunt.com/products/mydevtools?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-mydevtools"
                    target="_blank"
                    className="relative z-10 inline-block hover:opacity-90 hover:scale-105 transition-all duration-300 self-start"
                  >
                    <Image
                      src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1041847&theme=dark&t=1764002797983"
                      alt="MyDevTools on Product Hunt"
                      width={180}
                      height={39}
                      unoptimized
                    />
                  </a>
                </div>
              </motion.div>

              {/* Privacy card */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.55, delay: 0.2 }}
              >
                <div className="group relative h-full rounded-2xl glass-overlay p-7 hover:scale-[1.015] hover:shadow-2xl dark:hover:shadow-black/40 transition-all duration-300 overflow-hidden flex flex-col">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500 bg-gradient-to-br from-emerald-500 to-teal-400" />
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 p-px mb-6 shadow-lg">
                    <div className="w-full h-full rounded-[11px] bg-card dark:bg-[hsl(var(--surface-2))] flex items-center justify-center">
                      <Shield className="w-5 h-5 text-foreground" />
                    </div>
                  </div>
                  <h3 className="relative z-10 text-xl font-semibold mb-3">
                    Zero-Knowledge Privacy
                  </h3>
                  <p className="relative z-10 text-muted-foreground leading-relaxed text-sm md:text-base flex-1">
                    Sensitive synced data is encrypted in your browser before
                    transmission. The server stores encrypted blobs, not your
                    readable vault data.
                  </p>
                </div>
              </motion.div>
            </div>
          </Section>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-28 relative overflow-hidden">
        <div className="container px-4 md:px-6 mx-auto max-w-3xl">
          <Section>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
                Common Questions
              </h2>
              <p className="text-muted-foreground text-lg">
                Everything you need to know before getting started.
              </p>
            </motion.div>

            <div className="space-y-3">
              {faqItems.map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.07 }}
                >
                  <Collapsible
                    open={openFaqIdx === i}
                    onOpenChange={(open) =>
                      setOpenFaqIdx(open ? i : null)
                    }
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between w-full rounded-2xl glass-overlay px-6 py-4 hover:border-border/70 hover:bg-card/70 transition-all duration-200 text-left">
                        <span className="font-medium text-base pr-4">
                          {item.q}
                        </span>
                        <motion.div
                          animate={{ rotate: openFaqIdx === i ? 180 : 0 }}
                          transition={{ duration: 0.25 }}
                          className="shrink-0 text-muted-foreground"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-6 pb-4 pt-2 text-muted-foreground text-sm leading-relaxed border border-t-0 border-border/40 dark:border-white/5 rounded-b-2xl bg-card/40 dark:bg-background/60 -mt-2">
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

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-36 relative overflow-hidden">
        {/* Decorative glow blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-sky-500/12 blur-[100px]" />
          <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-500/12 blur-[100px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] rounded-full bg-pink-500/8 blur-[80px]" />
        </div>

        {/* Grid */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />

        <div className="container px-4 md:px-6 mx-auto text-center relative z-10">
          <Section>
            <motion.div variants={fadeUp} transition={{ duration: 0.55 }}>
              <div className="glass-modal rounded-3xl px-8 py-14 md:px-16 md:py-20 max-w-3xl mx-auto">
                <div className="mb-6">
                  <Badge
                    variant="secondary"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                  >
                    <GitFork className="w-3 h-3" />
                    Open source · Self-host free forever
                  </Badge>
                </div>

                <motion.h2
                  variants={fadeUp}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-3xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight"
                >
                  Ready to Build{" "}
                  <span className="mdt-grad-text mdt-grad-anim">
                    Faster?
                  </span>
                </motion.h2>

                <motion.p
                  variants={fadeUp}
                  transition={{ duration: 0.6, delay: 0.18 }}
                  className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                  Join developers who use MyDevTools to streamline their daily
                  workflow. Privacy-focused and GPL-3.0-licensed — self-host at no
                  cost forever, or subscribe to our managed cloud.
                </motion.p>

                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.6, delay: 0.26 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-3"
                >
                  <button
                    onClick={goToLogin}
                    className="inline-flex items-center justify-center h-14 px-10 rounded-full text-base font-medium bg-foreground text-background hover:bg-foreground/90 shadow-md hover:shadow-lg hover:scale-[1.05] active:scale-[0.98] transition-all duration-300 w-full sm:w-auto"
                  >
                    Start Using Tools Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </button>
                  <Link
                    href="/developer-tools"
                    className="inline-flex items-center justify-center h-14 px-10 rounded-full text-base font-medium border border-border/60 dark:border-white/10 bg-background/60 backdrop-blur-sm text-foreground hover:bg-muted hover:scale-[1.04] active:scale-[0.98] transition-all duration-300 w-full sm:w-auto"
                  >
                    View Developer Toolkit
                  </Link>
                  <Link
                    href="https://github.com/itsmeakhil/mydevtools.tech"
                    target="_blank"
                    className="inline-flex items-center justify-center h-14 px-10 rounded-full text-base font-medium border border-border/60 dark:border-white/10 bg-background/60 backdrop-blur-sm text-foreground hover:bg-muted hover:scale-[1.04] active:scale-[0.98] transition-all duration-300 w-full sm:w-auto"
                  >
                    <Star className="mr-2 h-5 w-5" />
                    Star on GitHub
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </Section>
        </div>
      </section>

      <Footer />
    </div>
  );
}
