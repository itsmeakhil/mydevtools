
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

export function getStrengthLabel(score: number): string {
    if (score === 0) return ""
    if (score <= 2) return "Weak"
    if (score <= 3) return "Medium"
    return "Strong"
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
