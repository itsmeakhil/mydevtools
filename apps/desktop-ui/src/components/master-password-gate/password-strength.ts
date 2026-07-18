export type StrengthResult = {
    score: number
    label: string
    barColor: string
    hint: string
    // Hard floor for accepting a NEW master password (setup only). Unlock never
    // consults this, so existing users are never locked out by a stricter rule.
    acceptable: boolean
}

// A tiny inline blocklist of the most common leaked passwords. Not a full
// dictionary — for pattern/dictionary-grade scoring, swap in @zxcvbn-ts/core
// behind `acceptable`. Compared case-insensitively.
// ponytail: ~50-entry blocklist, upgrade to zxcvbn if dictionary-grade needed.
const COMMON_PASSWORDS = new Set([
    "123456", "123456789", "12345678", "1234567890", "1234567", "password",
    "password1", "password123", "qwerty", "qwerty123", "qwertyuiop", "111111",
    "123123", "abc123", "1234", "12345", "000000", "admin", "administrator",
    "letmein", "welcome", "welcome1", "monkey", "dragon", "sunshine", "iloveyou",
    "princess", "football", "baseball", "master", "shadow", "superman", "batman",
    "trustno1", "passw0rd", "p@ssw0rd", "zaq12wsx", "1q2w3e4r", "1qaz2wsx",
    "qazwsx", "asdfghjkl", "changeme", "secret", "login", "starwars", "whatever",
    "michael", "ashley", "hello", "hello123", "test", "test123",
])

export function isCommonPassword(pw: string): boolean {
    return COMMON_PASSWORDS.has(pw.toLowerCase())
}

export function calcStrength(pw: string): StrengthResult {
    if (!pw) return { score: 0, label: "", barColor: "bg-muted", hint: "", acceptable: false }

    let score = 0
    const hints: string[] = []

    if (pw.length >= 12) score++
    else hints.push("use ≥ 12 characters")
    if (/[A-Z]/.test(pw)) score++
    else hints.push("add uppercase letters")
    if (/[a-z]/.test(pw)) score++
    else hints.push("add lowercase letters")
    if (/[0-9]/.test(pw)) score++
    else hints.push("add numbers")
    if (/[^A-Za-z0-9]/.test(pw)) score++
    else hints.push("add special characters")

    const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"]
    const colors = [
        "bg-muted",
        "bg-destructive",
        "bg-orange-500",
        "bg-yellow-500",
        "bg-green-500",
        "bg-emerald-500",
    ]

    return {
        score,
        label: labels[score] ?? "",
        barColor: colors[score] ?? "bg-muted",
        hint: hints[0] ?? "",
        acceptable: pw.length >= 12 && score >= 4 && !isCommonPassword(pw),
    }
}
