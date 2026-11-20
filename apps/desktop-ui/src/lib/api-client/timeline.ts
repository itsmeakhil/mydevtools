import type { TimelineHop } from "@/components/api-client/types"

const SENSITIVE = new Set(["authorization", "proxy-authorization", "cookie"])

/**
 * Masked display value for credential-bearing headers: the auth scheme stays
 * readable (`Digest ••••••`), the secret doesn't. Other headers pass through.
 */
export function maskHeaderValue(name: string, value: string): string {
    if (!SENSITIVE.has(name.toLowerCase())) return value
    const scheme = name.toLowerCase() === "cookie" ? "" : value.match(/^\s*([A-Za-z][\w-]*)\s+\S/)?.[1]
    return scheme ? `${scheme} ••••••` : "••••••"
}

export function isSensitiveHeader(name: string): boolean {
    return SENSITIVE.has(name.toLowerCase())
}

export type HopKind = "redirect" | "authChallenge" | "final"

/** Why the proxy sent the next request after this one. */
export function hopKind(hops: TimelineHop[], i: number): HopKind {
    if (i === hops.length - 1) return "final"
    return hops[i].status === 401 ? "authChallenge" : "redirect"
}
