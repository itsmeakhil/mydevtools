import type { Metadata } from 'next'
import Link from 'next/link'
import { Link2Off, ArrowLeft, Zap } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Link Disabled — MyDevTools',
    description: 'This short link has been disabled by its owner.',
}

export default function LinkDisabledPage() {
    return (
        <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-4 font-sans">
            {/* Subtle radial glow */}
            <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />

            <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 text-center">
                {/* Icon */}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50 bg-muted/30 shadow-sm">
                    <Link2Off className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                </div>

                {/* Copy */}
                <div className="space-y-2">
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                        This link is disabled
                    </h1>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        The owner of this short link has turned it off.
                        <br />
                        Contact them for the original URL.
                    </p>
                </div>

                {/* Divider */}
                <div className="h-px w-full bg-border/50" />

                {/* CTA */}
                <div className="flex flex-col items-center gap-3">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to home
                    </Link>

                    <Link
                        href="/app/url-shortener"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                    >
                        <Zap className="h-3.5 w-3.5" />
                        Create your own short links
                    </Link>
                </div>
            </div>
        </div>
    )
}
