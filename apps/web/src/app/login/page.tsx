import type { Metadata } from "next";
import Link from "next/link";
import { LegalAgreementFooter } from "@/components/legal-agreement-footer";
import { LoginForm } from "@/components/login-form";
import { LoginRedirectIfAuthed } from "@/components/login-redirect-if-authed";
import { Logo } from "@/components/logo";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Login - MyDevTools",
  description: "Login to access your developer tools and workspace",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background font-sans">
      <LoginRedirectIfAuthed />

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,hsl(var(--primary)/0.14),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,hsl(var(--background))_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.22] [background-image:linear-gradient(hsl(var(--border)/0.55)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.55)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,black,transparent)]"
        aria-hidden
      />

      <header className="relative z-20 px-4 pt-[max(1rem,var(--safe-area-top))] sm:px-8 sm:pt-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3.5 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:border-border hover:bg-accent/40 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to home
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-lg flex-col items-center justify-center px-4 pb-[max(2rem,var(--safe-area-bottom))] pt-6 sm:px-6">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="rounded-2xl border border-border/50 bg-card/75 p-8 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.03] backdrop-blur-xl dark:bg-card/55 dark:shadow-black/30 dark:ring-white/[0.06] sm:p-9">
            <div className="mb-8 flex flex-col items-center text-center">
              <Logo size={44} showText className="mb-8" />
              <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
                Welcome back
              </h1>
              <p className="mt-2 max-w-[280px] text-pretty text-sm leading-relaxed text-muted-foreground">
                Sign in with your preferred provider to open your workspace.
              </p>
            </div>

            <LoginForm />
          </div>

          <LegalAgreementFooter className="px-2 text-xs" />
        </div>
      </main>
    </div>
  );
}
