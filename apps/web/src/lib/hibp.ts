async function sha1Hex(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-1", encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
}

// Returns number of times this password appears in known breaches (0 = clean)
export async function checkPasswordBreach(password: string): Promise<number> {
  const hash = await sha1Hex(password)
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" },
  })

  if (!res.ok) throw new Error(`HIBP request failed: ${res.status}`)

  const text = await res.text()
  for (const line of text.split("\n")) {
    const [lineSuffix, count] = line.trim().split(":")
    if (lineSuffix === suffix) return parseInt(count, 10)
  }
  return 0
}

export interface BreachEntry {
  id: string
  password: string
}

// Bulk check with 150ms delay between requests to respect HIBP rate limits.
// Returns Map<entryId, breachCount>. Calls onProgress after each check.
export async function checkPasswordsBreached(
  entries: BreachEntry[],
  onProgress?: (checked: number, total: number) => void
): Promise<Map<string, number>> {
  const results = new Map<string, number>()

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    try {
      const count = await checkPasswordBreach(entry.password)
      results.set(entry.id, count)
    } catch {
      results.set(entry.id, 0)
    }
    onProgress?.(i + 1, entries.length)
    if (i < entries.length - 1) await new Promise((r) => setTimeout(r, 150))
  }

  return results
}
