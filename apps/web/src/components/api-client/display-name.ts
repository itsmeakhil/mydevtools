import {
    API_CLIENT_DEFAULT_TAB_NAME,
    API_CLIENT_IMPORTED_TAB_NAME,
} from "./types"

/** Translate persisted default labels for tabs/history display. */
export function getApiClientRequestDisplayName(
    name: string | undefined,
    t: (key: string) => string
): string {
    if (!name || !name.trim()) return t("defaults.untitledRequest")
    if (name === API_CLIENT_DEFAULT_TAB_NAME) return t("defaults.newRequest")
    if (name === API_CLIENT_IMPORTED_TAB_NAME) return t("defaults.importedRequest")
    return name
}
