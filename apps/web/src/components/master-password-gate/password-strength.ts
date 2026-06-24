export type StrengthResult = {
    score: number
    label: string
    barColor: string
    hint: string
}

export function calcStrength(pw: string): StrengthResult {
    if (!pw) return { score: 0, label: "", barColor: "bg-muted", hint: "" }

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
    }
}
