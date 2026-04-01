import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { LoginForm } from "@/components/login-form";
import { BackgroundAnimation } from "@/components/ui/background-animation";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Login - MyDevTools",
  description: "Login to access your developer tools and workspace",
};

export default function LoginPage() {
  return (
    <>
      <Header />
      <div className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden font-sans">
        {/* Reused Background Animation */}
        <BackgroundAnimation />

        {/* Main Content */}
        <div className="container relative z-10 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            {/* Card */}
            <div className="relative group">
              {/* Glow Effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500" />

              <div className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
                {/* Logo/Brand Section */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center mb-6">
                    <Logo size={64} showText={false} />
                  </div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2 tracking-tight">
                    Welcome Back
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Sign in to continue to your workspace
                  </p>
                </div>

                <LoginForm />

                <div className="mt-8 pt-6 border-t border-border/50">
                  <p className="text-center text-xs text-muted-foreground">
                    By continuing, you agree to our{" "}
                    <Link
                      href="/terms"
                      className="underline underline-offset-4 hover:text-foreground transition-colors font-medium"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="underline underline-offset-4 hover:text-foreground transition-colors font-medium"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Text */}
            <p className="text-center text-sm text-muted-foreground mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              Secure authentication powered by Firebase
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

