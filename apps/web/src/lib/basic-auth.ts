/**
 * UTF-8-safe Basic-auth credential encoder.
 * `btoa` only accepts Latin-1; usernames/passwords with non-ASCII produce
 * `InvalidCharacterError` and silently 401 against most servers.
 */
export function encodeBasicCredentials(user: string, pass: string): string {
    const bytes = new TextEncoder().encode(`${user}:${pass}`)
    let binary = ""
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary)
}
