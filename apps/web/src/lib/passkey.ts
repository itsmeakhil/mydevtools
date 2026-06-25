import {
    browserSupportsWebAuthn,
    browserSupportsWebAuthnAutofill,
    startAuthentication,
    startRegistration,
} from "@simplewebauthn/browser"
import { signInWithCustomToken } from "firebase/auth"

import { auth } from "@/database/firebase"
import { backendFetch } from "@/lib/backend-auth"

export type PasskeySummary = {
    credential_id: string
    device_name: string | null
    backed_up: boolean
    transports: string[]
    created_at: number | null
    last_used_at: number | null
}

const BASE = "/api/backend/auth/passkey"

async function jsonOrThrow<T>(res: Response, fallback: string): Promise<T> {
    if (res.ok) return (await res.json()) as T
    let detail = ""
    try {
        const data = (await res.json()) as { detail?: string }
        detail = typeof data?.detail === "string" ? data.detail : ""
    } catch {
        /* ignore */
    }
    throw new Error(detail || fallback)
}

// ── Registration (current user) ──────────────────────────────────────────────

export async function registerPasskey(deviceName?: string): Promise<PasskeySummary> {
    if (!browserSupportsWebAuthn()) {
        throw new Error("Your browser does not support passkeys.")
    }
    const beginRes = await backendFetch(`${BASE}/register/begin`, { method: "POST" })
    const optionsJSON = await jsonOrThrow<Record<string, unknown>>(
        beginRes,
        "Could not start passkey registration."
    )

    const attResp = await startRegistration({ optionsJSON: optionsJSON as never })

    const finishRes = await backendFetch(`${BASE}/register/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: attResp, device_name: deviceName ?? null }),
    })
    return jsonOrThrow<PasskeySummary>(finishRes, "Passkey registration failed.")
}

// ── List / rename / delete ───────────────────────────────────────────────────

export async function listPasskeys(): Promise<PasskeySummary[]> {
    const res = await backendFetch(BASE, { method: "GET" })
    const data = await jsonOrThrow<{ passkeys: PasskeySummary[] }>(
        res,
        "Could not load passkeys."
    )
    return data.passkeys ?? []
}

export async function renamePasskey(credentialId: string, deviceName: string): Promise<void> {
    const res = await backendFetch(`${BASE}/${encodeURIComponent(credentialId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_name: deviceName }),
    })
    await jsonOrThrow<{ ok: boolean }>(res, "Could not rename passkey.")
}

export async function deletePasskey(credentialId: string): Promise<void> {
    const res = await backendFetch(`${BASE}/${encodeURIComponent(credentialId)}`, {
        method: "DELETE",
    })
    await jsonOrThrow<{ ok: boolean }>(res, "Could not delete passkey.")
}

// ── Login (anonymous) ────────────────────────────────────────────────────────

async function runLogin(useBrowserAutofill: boolean): Promise<{ uid: string }> {
    const beginRes = await fetch(`${BASE}/login/begin`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
    })
    const optionsJSON = await jsonOrThrow<Record<string, unknown>>(
        beginRes,
        "Could not start passkey sign-in."
    )

    const asr = await startAuthentication({
        optionsJSON: optionsJSON as never,
        useBrowserAutofill,
    })

    const finishRes = await fetch(`${BASE}/login/finish`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: asr }),
    })
    const result = await jsonOrThrow<{ uid: string; firebase_custom_token: string | null }>(
        finishRes,
        "Passkey sign-in failed."
    )

    // Hydrate Firebase auth so RequireAuth (which gates on Firebase user) lets us through.
    if (result.firebase_custom_token) {
        await signInWithCustomToken(auth, result.firebase_custom_token)
    }
    return { uid: result.uid }
}

/** Explicit button click — modal passkey picker. */
export async function signInWithPasskey(): Promise<{ uid: string }> {
    if (!browserSupportsWebAuthn()) {
        throw new Error("Your browser does not support passkeys.")
    }
    return runLogin(false)
}

/**
 * Conditional autofill: resolves when the user picks a passkey from the
 * browser's username-autofill dropdown. Caller must render an `<input
 * autocomplete="username webauthn">` for autofill to surface. Returns null
 * when the platform does not support conditional mediation (caller should
 * fall back to an explicit button).
 */
export async function startConditionalPasskeyAuth(): Promise<{ uid: string } | null> {
    if (!browserSupportsWebAuthn()) return null
    if (!(await browserSupportsWebAuthnAutofill())) return null
    return runLogin(true)
}
