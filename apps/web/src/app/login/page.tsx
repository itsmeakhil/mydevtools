import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Cloud, ShieldCheck, Zap } from "lucide-react";
import { LegalAgreementFooter } from "@/components/legal-agreement-footer";
import { LoginForm } from "@/components/login-form";
import { LoginRedirectIfAuthed } from "@/components/login-redirect-if-authed";
import { Logo } from "@/components/logo";
import { Magnetic } from "@/components/mdt-magnetic";
import MdtAurora from "@/components/mdt-aurora";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mydevtools.tech";

export const metadata: Metadata = {
  title: "Login - MyDevTools",
  description: "Login to access your developer tools and workspace",
  alternates: { canonical: `${baseUrl}/login` },
};

const FEATURES = [
  {
    icon: Zap,
    title: "60+ tools, zero installs",
    body: "Formatters, generators, API client, SQL, crypto — all in one tab.",
  },
  {
    icon: ShieldCheck,
    title: "Encrypted, cross-device sync",
    body: "Sensitive data is AES-256 encrypted before it ever leaves your browser.",
  },
  {
    icon: Cloud,
    title: "Self-host or cloud",
    body: "Run it yourself for free, or sign in and let us handle the infrastructure.",
  },
];

const TOOL_PILLS = [
  "JSON",
  "JWT",
  "Regex",
  "Base64",
  "UUID",
  "API Client",
  "SQL",
  "GraphQL",
];

export default function LoginPage() {
  return (
    <div className="dark mdt-deck relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground font-sans">
      <LoginRedirectIfAuthed />

      {/* deck backdrop */}
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}>
        <MdtAurora />
        <div className="mdt-grid" />
        <div className="mdt-noise" />
        <div className="absolute -left-32 top-1/4 h-[460px] w-[460px] rounded-full bg-violet-500/12 blur-[140px]" />
        <div className="absolute -right-24 bottom-0 h-[420px] w-[420px] rounded-full bg-sky-500/12 blur-[130px]" />
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

      <header className="relative z-20 px-4 pt-[max(1rem,var(--safe-area-top))] sm:px-8 sm:pt-8">
        <Magnetic strength={0.4}>
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3.5 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:border-border hover:bg-accent/40 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to home
          </Link>
        </Magnetic>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-10">
        {/* ── Showcase (desktop only) ── */}
        <section aria-hidden className="hidden flex-col lg:flex">
          <p className="mdt-kicker mb-5">Welcome back</p>
          <h1 className="max-w-md text-balance text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
            Your entire dev toolkit,{" "}
            <span className="mdt-grad-text mdt-grad-anim">one tab away.</span>
          </h1>
          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted-foreground">
            Sign in to sync your work across devices and pick up exactly where you left off.
          </p>

          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="mdt-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="mdt-icon-grad h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-foreground">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap gap-2">
            {TOOL_PILLS.map((pill) => (
              <span key={pill} className="mdt-pill">
                {pill}
              </span>
            ))}
          </div>
        </section>

        {/* ── Login card ── */}
        <section className="mx-auto w-full max-w-[420px]">
          <div className="glass-overlay relative overflow-hidden rounded-2xl p-8 shadow-2xl shadow-black/40 sm:p-9">
            <div className="mdt-rail absolute inset-x-0 top-0 h-[3px]" />

            <div className="mb-8 flex flex-col items-center text-center">
              <Logo size={44} showText className="mb-8" />
              <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
                Sign in to MyDevTools
              </h2>
              <p className="mt-2 max-w-[300px] text-pretty text-sm leading-relaxed text-muted-foreground">
                Continue with your preferred provider to open your workspace.
              </p>
            </div>

            <LoginForm />

            <p className="mt-6 text-center text-xs text-muted-foreground">
              No passwords. One-click OAuth — we never see your credentials.
            </p>
          </div>

          <LegalAgreementFooter className="mt-6 px-2 text-center text-xs" />
        </section>
      </main>
    </div>
  );
}
