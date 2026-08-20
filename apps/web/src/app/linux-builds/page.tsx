import type { Metadata } from "next";
import { Download, TerminalSquare } from "lucide-react";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mydevtools.tech";

/**
 * Where the Linux artifacts live. Preview builds are published as a GitHub
 * pre-release so the binaries stay out of git; the page links to the tag rather
 * than to a fixed filename, which changes every version.
 */
const LINUX_RELEASE_URL =
  "https://github.com/mydevtools-tech/mydevtools/releases/tag/v0.1.14-linux-preview";

export const metadata: Metadata = {
  title: "MyDevTools for Linux — preview builds",
  description:
    "Preview builds of the MyDevTools desktop app for Linux, currently ARM64 (aarch64) only. Completely offline, no account required, free for everyone. AppImage and .deb packages.",
  alternates: { canonical: `${baseUrl}/linux-builds` },
  openGraph: {
    title: "MyDevTools for Linux — preview builds | MyDevTools",
    description:
      "Preview builds of the MyDevTools desktop app for Linux, ARM64 (aarch64) only. AppImage and .deb. Offline, no account, free for everyone.",
    url: `${baseUrl}/linux-builds`,
    siteName: "MyDevTools",
    type: "website",
  },
};

export default function LinuxBuildsPage() {
  return (
    <div className="dark mdt-deck flex flex-col min-h-screen bg-background text-foreground font-sans">
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}>
        <div className="mdt-grid" />
        <div className="mdt-noise" />
      </div>

      <Header />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-32 pb-24 text-center">
          <p className="mdt-kicker">Desktop app · Linux</p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
            Your entire dev toolkit,{" "}
            <span className="mdt-grad-text">on Linux.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            The same offline, local-first toolkit that runs on macOS — packaged as an
            AppImage and a <code>.deb</code>. No account, no sign-in, free for everyone.
          </p>

          {/* Preview status — set expectations honestly */}
          <div className="mt-8 mx-auto max-w-xl rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-5 py-4 text-left">
            <p className="text-sm font-semibold text-amber-200">
              Preview build — ARM64 (aarch64) only
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              These packages are built for <strong className="text-foreground">ARM64
              (aarch64)</strong> machines and will not run on a typical x86_64 desktop
              — an x86_64 build is not published yet. Linux support is also new and
              still being validated, and unlike the macOS build these packages are not
              yet covered by automatic updates; grab a newer build from this page when
              one lands.
            </p>
          </div>

          <div className="mt-10 flex flex-col items-center">
            <Button asChild size="lg" className="gap-2">
              <a href={LINUX_RELEASE_URL} target="_blank" rel="noreferrer">
                <TerminalSquare className="h-4 w-4" />
                Get the Linux build
                <Download className="h-4 w-4 opacity-70" />
              </a>
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">
              ARM64 (aarch64) · AppImage &amp; .deb · from the GitHub releases page
            </p>
          </div>

          {/* Install instructions */}
          <div className="mt-16 mx-auto max-w-xl text-left mdt-surface rounded-xl p-6">
            <h2 className="text-sm font-semibold">Installing</h2>

            <p className="mt-3 text-sm text-muted-foreground">
              <strong className="text-foreground">AppImage</strong> — runs anywhere, no
              install:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-muted-foreground">
              <code>{`chmod +x MyDevTools_*.AppImage
./MyDevTools_*.AppImage`}</code>
            </pre>

            <p className="mt-4 text-sm text-muted-foreground">
              <strong className="text-foreground">Debian / Ubuntu</strong>:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-muted-foreground">
              <code>sudo apt install ./MyDevTools_*.deb</code>
            </pre>

            <p className="mt-4 text-xs text-muted-foreground">
              MyDevTools stores its database encryption key in your desktop keyring
              (GNOME Keyring or KWallet), so a desktop session with a running keyring
              service is required.
            </p>
          </div>

          <p className="mt-10 text-sm text-muted-foreground">
            Looking for macOS?{" "}
            <a className="underline underline-offset-2" href="/download">
              Download for Mac
            </a>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
