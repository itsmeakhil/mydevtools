"use client"

import { useEffect, useState } from "react"

export const VAULT_ICONS_KEY = "vaultShowSiteIcons"

/**
 * Off by default, unlike bookmarks.
 *
 * Site icons are fetched from a third-party icon service. On desktop the
 * request goes through the Rust proxy, so nothing leaves the webview — but the
 * *domain* still reaches that service, and for a password vault the set of
 * domains is the user's list of accounts. Bookmarks disclose the same thing the
 * user already published to their browser; a vault does not, so this one is
 * opt-in and the letter avatar is the default.
 */
export function getVaultIconsEnabled(): boolean {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(VAULT_ICONS_KEY) === "true"
}

export function setVaultIconsEnabled(enabled: boolean): void {
    window.localStorage.setItem(VAULT_ICONS_KEY, String(enabled))
    window.dispatchEvent(new Event(VAULT_ICONS_KEY))
}

/**
 * Reactive read. Starts false so the server render and the first client render
 * agree; the real value lands in the effect. Listens for both the same-tab
 * event and cross-tab `storage`, so flipping it in Settings updates an open
 * vault without a reload.
 */
export function useVaultIconsEnabled(): boolean {
    const [enabled, setEnabled] = useState(false)

    useEffect(() => {
        const read = () => setEnabled(getVaultIconsEnabled())
        read()
        window.addEventListener(VAULT_ICONS_KEY, read)
        window.addEventListener("storage", read)
        return () => {
            window.removeEventListener(VAULT_ICONS_KEY, read)
            window.removeEventListener("storage", read)
        }
    }, [])

    return enabled
}
