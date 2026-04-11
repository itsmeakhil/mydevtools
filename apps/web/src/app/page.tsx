"use client";

import React, { useRef, useState, useEffect } from "react";
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
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Zap,
  Shield,
  Rocket,
  Sparkles,
  CheckCircle2,
  Lock,
  FileJson,
  KeyRound,
  Link as LinkIcon,
  Terminal,
  Star,
  GitFork,
  NotebookPen,
  ChevronDown,
  LogIn,
  LayoutGrid,
  ExternalLink,
} from "lucide-react";

// ─── Animation Variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
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

const tools = [
  {
    title: "JSON Editor",
    description:
      "Format, validate, and minify JSON with syntax highlighting and real-time error detection.",
    icon: FileJson,
    href: "/app/json-formatter",
    gradient: "from-sky-500 to-cyan-400",
    hoverGlow: "hover:shadow-sky-500/25",
    bgFade: "from-sky-500/8 to-cyan-400/8",
  },
  {
    title: "API Client",
    description:
      "Test and debug HTTP requests with headers, auth, body support and response inspection.",
    icon: LinkIcon,
    href: "/app/api-client",
    gradient: "from-violet-500 to-purple-400",
    hoverGlow: "hover:shadow-violet-500/25",
    bgFade: "from-violet-500/8 to-purple-400/8",
  },
  {
    title: "NoSQL Explorer",
    description:
      "Explore and manage your MongoDB databases directly from your browser with ease.",
    icon: KeyRound,
    href: "/app/nosql-explorer",
    gradient: "from-emerald-500 to-teal-400",
    hoverGlow: "hover:shadow-emerald-500/25",
    bgFade: "from-emerald-500/8 to-teal-400/8",
  },
  {
    title: "Password Manager",
    description:
      "Securely store and manage passwords with client-side AES encryption. Zero-knowledge.",
    icon: Lock,
    href: "/app/password-manager",
    gradient: "from-rose-500 to-orange-400",
    hoverGlow: "hover:shadow-rose-500/25",
    bgFade: "from-rose-500/8 to-orange-400/8",
  },
  {
    title: "Task Manager",
    description:
      "Organize daily tasks, set priorities, and track your productivity with smart lists.",
    icon: CheckCircle2,
    href: "/app/to-do",
    gradient: "from-amber-500 to-yellow-400",
    hoverGlow: "hover:shadow-amber-500/25",
    bgFade: "from-amber-500/8 to-yellow-400/8",
  },
  {
    title: "Notes",
    description:
      "Capture ideas and organize thoughts with a clean, distraction-free note-taking app.",
    icon: NotebookPen,
    href: "/app/notes",
    gradient: "from-indigo-500 to-blue-400",
    hoverGlow: "hover:shadow-indigo-500/25",
    bgFade: "from-indigo-500/8 to-blue-400/8",
  },
];

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Optimized for speed with client-side processing. No server round-trips for sensitive operations.",
    gradient: "from-amber-500 to-orange-400",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "Your data never leaves your browser. 100% client-side execution with absolute zero tracking.",
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    icon: Rocket,
    title: "Developer First",
    description:
      "Built by developers, for developers. Clean APIs and an intuitive UI that stays out of your way.",
    gradient: "from-violet-500 to-blue-400",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Sign In Instantly",
    description:
      "One-click Google Sign-In. No email, no password, no credit card required.",
    icon: LogIn,
    gradient: "from-sky-500 to-cyan-400",
  },
  {
    step: "02",
    title: "Pick Your Tool",
    description:
      "Choose from 19+ tools in one unified dashboard. Everything in a single tab.",
    icon: LayoutGrid,
    gradient: "from-violet-500 to-purple-400",
  },
  {
    step: "03",
    title: "Work Privately",
    description:
      "Everything runs in your browser. Your data never leaves your device.",
    icon: Shield,
    gradient: "from-emerald-500 to-teal-400",
  },
];

const faqItems = [
  {
    q: "Is MyDevTools really free?",
    a: "Yes — free forever, no paid tiers, no credit card required. MyDevTools is open source (MIT license) and will always be free to use.",
  },
  {
    q: "Is my data secure?",
    a: "All processing is client-side. Your data never leaves your browser. The Password Manager uses AES-256 encryption in your browser before any sync — zero-knowledge by design.",
  },
  {
    q: "Do I need an account to use the tools?",
    a: "Google Sign-In is required to save your data across sessions. It's one click — no email or password needed.",
  },
  {
    q: "Is this truly open source?",
    a: "Yes. Full source code is available on GitHub under the MIT license. You can audit, contribute, or self-host it.",
  },
  {
    q: "Does it work offline?",
    a: "Most tools are fully client-side and work offline (JSON Editor, Password Manager, Notes, etc.). Tools that connect to external services (NoSQL Explorer, API Client) need a network connection.",
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();
  const goToLogin = () => router.push("/login");

  const [githubStars, setGithubStars] = useState<number | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

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
    <div className="flex flex-col min-h-screen bg-background font-sans overflow-x-hidden">
      <Header />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 md:py-40 lg:py-48 overflow-hidden">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full bg-violet-500/15 blur-[120px]"
            animate={{ x: [0, 50, 0], y: [0, -50, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -top-24 -right-48 w-[500px] h-[500px] rounded-full bg-sky-500/15 blur-[120px]"
            animate={{ x: [0, -50, 0], y: [0, 50, 0], scale: [1, 1.18, 1] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          />
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-pink-500/10 blur-[100px]"
            animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
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
                  animate={{ rotate: [0, 18, -18, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
                  className="inline-flex"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </motion.span>
                The Ultimate Developer Toolkit
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.08]"
            >
              <span className="text-foreground">Simplify Your</span>
              <br />
              <span className="bg-gradient-to-r from-sky-500 via-violet-500 to-pink-500 bg-clip-text text-transparent">
                Dev Workflow
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Access a comprehensive suite of developer tools in one place — from
              formatters to explorers, everything you need to ship faster.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
            >
              <button
                onClick={goToLogin}
                className="inline-flex items-center justify-center h-12 px-8 rounded-full text-sm font-medium bg-foreground text-background hover:bg-foreground/90 shadow-md hover:shadow-lg hover:scale-[1.04] active:scale-[0.98] transition-all duration-300 w-full sm:w-auto"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              <Link
                href="https://github.com/itsmeakhil/mydevtools.tech"
                target="_blank"
                className="inline-flex items-center justify-center h-12 px-8 rounded-full text-sm font-medium border border-border bg-background/60 backdrop-blur-sm text-foreground hover:bg-muted hover:scale-[1.04] active:scale-[0.98] transition-all duration-300 w-full sm:w-auto"
              >
                <Star className="mr-2 h-4 w-4" />
                Star on GitHub
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.32 }}
              className="pt-6 grid grid-cols-3 gap-6 max-w-sm mx-auto"
            >
              {[
                { value: "19+", label: "Dev Tools" },
                { value: "100%", label: "Open Source" },
                { value: "0kb", label: "Data Sent" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">
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
              <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-2xl shadow-violet-500/10 overflow-hidden">
                {/* Fake browser bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/40">
                  <div className="flex gap-1.5 shrink-0">
                    <div className="w-3 h-3 rounded-full bg-rose-400/70" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/70" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/70" />
                  </div>
                  <div className="flex-1 mx-4 h-6 rounded-md bg-background/60 border border-border/40 text-xs text-muted-foreground flex items-center px-3">
                    mydevtools.tech/app
                  </div>
                </div>
                {/* Screenshot — light/dark via CSS */}
                <Image
                  src="/images/dashboard-light.png"
                  alt="MyDevTools dashboard"
                  width={1200}
                  height={700}
                  priority
                  className="w-full h-auto dark:hidden"
                />
                <Image
                  src="/images/dashboard-dark.png"
                  alt="MyDevTools dashboard"
                  width={1200}
                  height={700}
                  priority
                  className="w-full h-auto hidden dark:block"
                />
              </div>
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
                <img
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1041847&theme=light&t=1764002797983"
                  alt="MyDevTools - Essential tools for developers | Product Hunt"
                  style={{ width: "250px", height: "54px" }}
                  width="250"
                  height="54"
                />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 relative overflow-hidden">
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
                    className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.gradient} p-px mb-6 shadow-lg z-10`}
                  >
                    <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
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

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-28 relative overflow-hidden">
        <div className="container px-4 md:px-6 mx-auto">
          <Section>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6 }}
              className="text-center mb-14"
            >
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4">
                Built for Modern Developers
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Every tool crafted with performance, privacy, and simplicity at
                its core.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  transition={{ duration: 0.55, delay: i * 0.1 }}
                >
                  <div className="group relative h-full rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-7 hover:border-border hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div
                      className={`absolute inset-0 opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 bg-gradient-to-br ${f.gradient}`}
                    />
                    <div
                      className={`relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} p-px mb-6 shadow-lg`}
                    >
                      <div className="w-full h-full rounded-[11px] bg-card flex items-center justify-center">
                        <f.icon className="w-5 h-5 text-foreground" />
                      </div>
                    </div>
                    <h3 className="relative z-10 text-xl font-semibold mb-3">
                      {f.title}
                    </h3>
                    <p className="relative z-10 text-muted-foreground leading-relaxed text-sm md:text-base">
                      {f.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
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
                Trusted by the Developer Community
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Open source, privacy-first, and community-verified.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
              {/* Open Source card */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.55, delay: 0 }}
              >
                <div className="group relative h-full rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-7 hover:border-border hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500 bg-gradient-to-br from-sky-500 to-cyan-400" />
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 p-px mb-6 shadow-lg">
                    <div className="w-full h-full rounded-[11px] bg-card flex items-center justify-center">
                      <GitFork className="w-5 h-5 text-foreground" />
                    </div>
                  </div>
                  <h3 className="relative z-10 text-xl font-semibold mb-3">
                    100% Open Source
                  </h3>
                  <p className="relative z-10 text-muted-foreground leading-relaxed text-sm md:text-base mb-5 flex-1">
                    MIT licensed. Full source on GitHub. Audit every line,
                    contribute features, or self-host.
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
                <div className="group relative h-full rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-7 hover:border-border hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500 bg-gradient-to-br from-amber-500 to-orange-400" />
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 p-px mb-6 shadow-lg">
                    <div className="w-full h-full rounded-[11px] bg-card flex items-center justify-center">
                      <Star className="w-5 h-5 text-foreground" />
                    </div>
                  </div>
                  <h3 className="relative z-10 text-xl font-semibold mb-3">
                    Featured on Product Hunt
                  </h3>
                  <p className="relative z-10 text-muted-foreground leading-relaxed text-sm md:text-base mb-5 flex-1">
                    Recognized by the developer community. Try it and leave your
                    review.
                  </p>
                  <a
                    href="https://www.producthunt.com/products/mydevtools?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-mydevtools"
                    target="_blank"
                    className="relative z-10 inline-block hover:opacity-90 hover:scale-105 transition-all duration-300 self-start"
                  >
                    <img
                      src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1041847&theme=light&t=1764002797983"
                      alt="MyDevTools on Product Hunt"
                      style={{ width: "180px", height: "39px" }}
                      width="180"
                      height="39"
                    />
                  </a>
                </div>
              </motion.div>

              {/* Privacy card */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.55, delay: 0.2 }}
              >
                <div className="group relative h-full rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-7 hover:border-border hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500 bg-gradient-to-br from-emerald-500 to-teal-400" />
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 p-px mb-6 shadow-lg">
                    <div className="w-full h-full rounded-[11px] bg-card flex items-center justify-center">
                      <Shield className="w-5 h-5 text-foreground" />
                    </div>
                  </div>
                  <h3 className="relative z-10 text-xl font-semibold mb-3">
                    Zero-Knowledge Privacy
                  </h3>
                  <p className="relative z-10 text-muted-foreground leading-relaxed text-sm md:text-base flex-1">
                    No analytics on your data. Client-side only. Passwords are
                    AES-256 encrypted in your browser before any sync.
                  </p>
                </div>
              </motion.div>
            </div>
          </Section>
        </div>
      </section>

      {/* ── Tools Showcase ──────────────────────────────────────────────────── */}
      <section
        id="features"
        className="py-16 md:py-28 relative overflow-hidden"
      >
        {/* Section background */}
        <div className="absolute inset-0 -z-10 bg-muted/25" />
        <div
          className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />

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
                <Terminal className="w-3 h-3" />
                Developer Toolkit
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                Popular Tools
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Discover our most-used utilities designed to supercharge your
                productivity.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {tools.map((tool, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.07 }}
                >
                  <Link href={tool.href} className="block h-full">
                    <div
                      className={`group relative h-full rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm p-6 hover:border-border/80 transition-all duration-300 hover:shadow-2xl ${tool.hoverGlow} cursor-pointer overflow-hidden`}
                    >
                      {/* Subtle gradient wash on hover */}
                      <div
                        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${tool.bgFade}`}
                      />

                      <div className="relative z-10">
                        {/* Gradient icon */}
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}
                        >
                          <tool.icon className="w-6 h-6 text-white drop-shadow-sm" />
                        </div>

                        {/* Title + animated arrow */}
                        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                          {tool.title}
                          <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                        </h3>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-12 text-center"
            >
              <Button
                variant="outline"
                size="lg"
                className="rounded-full h-12 px-8 text-base hover:scale-[1.04] active:scale-[0.98] transition-all duration-300 backdrop-blur-sm"
                onClick={goToLogin}
              >
                Explore All Tools
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
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
                      <div className="flex items-center justify-between w-full rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm px-6 py-4 hover:border-border hover:bg-card/80 transition-all duration-200 text-left">
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
                      <div className="px-6 pb-4 pt-2 text-muted-foreground text-sm leading-relaxed border border-t-0 border-border/50 rounded-b-2xl bg-card/30 backdrop-blur-sm -mt-2">
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
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.55 }}
              className="mb-6"
            >
              <Badge
                variant="secondary"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
              >
                <GitFork className="w-3 h-3" />
                Free &amp; Open Source Forever
              </Badge>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight"
            >
              Ready to Build{" "}
              <span className="bg-gradient-to-r from-sky-500 via-violet-500 to-pink-500 bg-clip-text text-transparent">
                Faster?
              </span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Join developers who use MyDevTools to streamline their daily
              workflow. Open source, free, and privacy-focused — always.
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
                href="https://github.com/itsmeakhil/mydevtools.tech"
                target="_blank"
                className="inline-flex items-center justify-center h-14 px-10 rounded-full text-base font-medium border border-border bg-background/60 backdrop-blur-sm text-foreground hover:bg-muted hover:scale-[1.04] active:scale-[0.98] transition-all duration-300 w-full sm:w-auto"
              >
                <Star className="mr-2 h-5 w-5" />
                Star on GitHub
              </Link>
            </motion.div>
          </Section>
        </div>
      </section>

      <Footer />
    </div>
  );
}
