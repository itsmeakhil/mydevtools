import type { Metadata } from "next";
import Link from "next/link";
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
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans">
      <LoginRedirectIfAuthed />

      {/* Back Button */}
      <div className="p-4 sm:p-8 flex-none absolute top-0 left-0 w-full z-50">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent/50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[380px] bg-card border shadow-sm rounded-2xl p-8 space-y-8">
          <div className="flex flex-col mb-4">
            <div className="flex justify-center mb-10">
              <Logo size={48} showText={true} />
            </div>
            <div className="text-left">
              <h1 className="text-xl text-foreground font-semibold tracking-tight mb-1">
                Welcome!
              </h1>
              <p className="text-muted-foreground text-sm">
                Sign in to your account
              </p>
            </div>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
