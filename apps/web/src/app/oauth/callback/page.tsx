"use client"

import * as React from "react"

/**
 * OAuth 2.0 authorization-code callback page.
 *
 * This page is the `redirect_uri` registered with the OAuth provider. The popup
 * lands here with `?code=...&state=...` (or `?error=...&error_description=...`),
 * relays the values back to the opening tab via postMessage, and closes itself.
 *
 * Same-origin is enforced on the receiving side; we still hard-code the target
 * origin here as a belt-and-braces precaution.
 */
export default function OAuthCallbackPage() {
    const [status, setStatus] = React.useState<"posting" | "done" | "no-opener">("posting")

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const message = {
            kind: "oauth-callback" as const,
            code: params.get("code") ?? undefined,
            state: params.get("state") ?? undefined,
            error: params.get("error") ?? undefined,
            description: params.get("error_description") ?? undefined,
        }

        if (window.opener && !window.opener.closed) {
            try {
                window.opener.postMessage(message, window.location.origin)
            } catch {
                // Cross-origin opener (extremely unusual here) — surface to the user instead of failing silently.
                setStatus("no-opener")
                return
            }
            setStatus("done")
            const t = setTimeout(() => {
                try { window.close() } catch { /* noop */ }
            }, 300)
            return () => clearTimeout(t)
        }

        setStatus("no-opener")
    }, [])

    return (
        <main className="min-h-screen flex items-center justify-center p-8 bg-background">
            <div className="max-w-md text-center space-y-3">
                <h1 className="text-xl font-bold">OAuth callback</h1>
                {status === "posting" && (
                    <p className="text-sm text-muted-foreground">Returning the authorization code to the API client…</p>
                )}
                {status === "done" && (
                    <p className="text-sm text-muted-foreground">Done — this window will close.</p>
                )}
                {status === "no-opener" && (
                    <p className="text-sm text-rose-500">
                        Could not reach the opener tab. Make sure the OAuth flow was started from the API
                        client and that popups are allowed for this site.
                    </p>
                )}
            </div>
        </main>
    )
}
