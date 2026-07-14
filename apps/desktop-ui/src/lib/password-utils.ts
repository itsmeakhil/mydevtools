
export function getStrengthLabel(score: number): string {
    if (score === 0) return ""
    if (score <= 2) return "Weak"
    if (score <= 3) return "Medium"
    return "Strong"
}

export function calculatePasswordStrength(password: string): number {
    if (!password) return 0
    let score = 0
    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1
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

export function validateTotpSecret(secret: string): string | null {
    if (!secret) return null
    const s = secret.replace(/\s/g, "").toUpperCase()
    if (s.length < 8) return "TOTP secret too short (min 8 characters)"
    if (!BASE32_RE.test(s)) return "TOTP secret must be Base32 (A-Z, 2-7)"
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

export function getPasswordAgeBadge(status: PasswordAgeStatus): {
    label: string
    className: string
} | null {
    switch (status) {
        case "aging":
            return { label: "3mo+", className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300" }
        case "old":
            return { label: "6mo+", className: "bg-orange-500/10 text-orange-700 dark:text-orange-300" }
        case "critical":
            return { label: "1yr+", className: "bg-red-500/10 text-red-600 dark:text-red-400" }
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
