
/**
 * Key under `PasswordManager.form`, or null when there
 * is nothing to label. Callers resolve it with `t()` — returning English prose
 * from here left the meter untranslated in 26 of the 27 locales.
 */
export function getStrengthLabelKey(
    score: number
): "strengthWeak" | "strengthMedium" | "strengthStrong" | null {
    if (score === 0) return null
    if (score <= 2) return "strengthWeak"
    if (score <= 3) return "strengthMedium"
    return "strengthStrong"
}

/**
 * zxcvbn's 0–4 guess-based score, shifted to the 1–5 range the UI already uses
 * (0 stays "empty"). Everything downstream keeps treating `<= 2` as weak.
 *
 * The previous implementation added a point per character class, which scored
 * `Password1!` a perfect 5 and `correct horse battery staple` a 2. In a
 * password manager the meter is a security control — it is what tells someone
 * which credentials to replace — so it has to model guessability (dictionary
 * words, keyboard walks, l33t substitutions, repeats, dates) rather than
 * count symbol types.
 *
 * The matcher options are loaded once, lazily: the dictionaries are large and
 * most sessions never open the password manager.
 */
export function calculatePasswordStrength(password: string): number {
    if (!password) return 0
    const scored = scoreSync(password)
    return scored + 1
}

/** Captured on init rather than re-imported per call — a dynamic `import()` is
 *  async and this has to stay synchronous for render paths. */
let scorer: ((password: string) => { score: number }) | null = null
let loading: Promise<void> | null = null

/**
 * Warms the dictionaries. Until this resolves, {@link calculatePasswordStrength}
 * falls back to a deliberately pessimistic length estimate — the vault list
 * renders immediately instead of blocking on a large dictionary load, and
 * nothing is ever called "strong" purely for being long.
 *
 * Concurrent callers share one load.
 */
export function initPasswordStrength(): Promise<void> {
    if (scorer) return Promise.resolve()
    loading ??= (async () => {
        const [core, common] = await Promise.all([
            import("@zxcvbn-ts/core"),
            import("@zxcvbn-ts/language-common"),
        ])
        // v4 has no module-level `zxcvbn`; options are bound to a factory.
        const factory = new core.ZxcvbnFactory({
            dictionary: { ...common.dictionary },
            graphs: common.adjacencyGraphs,
        })
        scorer = (password: string) => factory.check(password)
        scoreCache.clear()
    })()
    return loading
}

/** Keyed by the password itself: the list re-scores every entry on every
 *  render pass, and a guess-based estimator is far too slow for that. */
const scoreCache = new Map<string, number>()

function scoreSync(password: string): number {
    if (!scorer) {
        return password.length >= 16 ? 3 : password.length >= 12 ? 2 : password.length >= 8 ? 1 : 0
    }
    const cached = scoreCache.get(password)
    if (cached !== undefined) return cached
    const score = scorer(password).score
    if (scoreCache.size > 500) scoreCache.clear()
    scoreCache.set(password, score)
    return score
}

export function getStrengthColor(score: number): string {
    if (score === 0) return "bg-muted"
    if (score <= 2) return "bg-red-500"
    if (score <= 3) return "bg-yellow-500"
    return "bg-green-500"
}

// Base32 alphabet per RFC 4648 (A-Z, 2-7), 8+ chars minimum for a real TOTP secret
const BASE32_RE = /^[A-Z2-7]+=*$/

/** Key path under `PasswordManager.form`, or null when the secret is usable. */
export function validateTotpSecret(secret: string): "totpTooShort" | "totpNotBase32" | null {
    if (!secret) return null
    const s = secret.replace(/\s/g, "").toUpperCase()
    if (s.length < 8) return "totpTooShort"
    if (!BASE32_RE.test(s)) return "totpNotBase32"
    return null
}

export type PasswordAgeStatus = "fresh" | "aging" | "old" | "critical"

export function getPasswordAgeStatus(updatedAt: number): PasswordAgeStatus {
    const days = (Date.now() - updatedAt) / (1000 * 60 * 60 * 24)
    if (days < 90) return "fresh"
    if (days < 180) return "aging"
    if (days < 365) return "old"
    return "critical"
}

/** `labelKey` resolves under `PasswordManager.list`; only the colour is decided
 *  here, because only the colour is language-independent. */
export function getPasswordAgeBadge(status: PasswordAgeStatus): {
    labelKey: "ageAging" | "ageOld" | "ageCritical"
    className: string
} | null {
    switch (status) {
        case "aging":
            return { labelKey: "ageAging", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300" }
        case "old":
            return { labelKey: "ageOld", className: "bg-orange-500/10 text-orange-700 dark:text-orange-300" }
        case "critical":
            return { labelKey: "ageCritical", className: "bg-red-500/10 text-red-600 dark:text-red-400" }
        default:
            return null
    }
}

export function getPasswordAgeDateColor(status: PasswordAgeStatus): string {
    switch (status) {
        case "aging": return "text-yellow-600 dark:text-yellow-400"
        case "old": return "text-orange-600 dark:text-orange-400"
        case "critical": return "text-red-600 dark:text-red-400"
        default: return "text-muted-foreground"
    }
}

export function getFaviconUrl(url: string): string | null {
    if (!url) return null
    try {
        const domain = new URL(url).hostname
        return `https://icons.duckduckgo.com/ip3/${domain}.ico`
    } catch {
        return null
    }
}
