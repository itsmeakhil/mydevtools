import type { Metadata } from "next";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DownloadDesktopButton } from "@/components/download-desktop-button";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mydevtools.tech";

export const metadata: Metadata = {
  title: "Download MyDevTools for macOS",
  description:
    "Download the MyDevTools desktop app for macOS — your entire dev toolkit, native. Universal build for Apple Silicon and Intel, signed and notarized by Apple.",
  alternates: { canonical: `${baseUrl}/download` },
  openGraph: {
    title: "Download MyDevTools for macOS | MyDevTools",
    description: "Native macOS desktop app — signed & notarized. Apple Silicon and Intel.",
    url: `${baseUrl}/download`,
    siteName: "MyDevTools",
    type: "website",
  },
};

export default function DownloadPage() {
  return (
    <div className="dark mdt-deck flex flex-col min-h-screen bg-background text-foreground font-sans">
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}>
        <div className="mdt-grid" />
        <div className="mdt-noise" />
      </div>

      <Header />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-32 pb-24 text-center">
          <p className="mdt-kicker">Desktop app · macOS</p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
            Your entire dev toolkit,{" "}
            <span className="mdt-grad-text">native on your Mac.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            The full MyDevTools suite as a signed, notarized macOS app. Works offline
            and connects to your local databases — everything stays on your device.
          </p>

          <div className="mt-10 flex flex-col items-center">
            <DownloadDesktopButton />
          </div>

          {/* Verify your download */}
          <div className="mt-16 mx-auto max-w-xl text-left mdt-surface rounded-xl p-6">
            <h2 className="text-sm font-semibold">Verify your download (optional)</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Each release ships a <code>.sha256</code> checksum on the{" "}
              <a
                className="underline underline-offset-2"
                href="https://github.com/itsmeakhil/mydevtools/releases/latest"
                target="_blank"
                rel="noreferrer"
              >
                GitHub release page
              </a>
              . After downloading, confirm the file is intact:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-muted-foreground">
              <code>shasum -a 256 ~/Downloads/MyDevTools_*_universal.dmg</code>
            </pre>
            <p className="mt-3 text-xs text-muted-foreground">
              The app is signed with an Apple Developer ID and notarized by Apple, so it
              opens with a normal double-click — no security warnings.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
