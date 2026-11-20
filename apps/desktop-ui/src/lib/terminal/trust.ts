/** SHA-256 hex of a repo config file's exact text: trust is for this content, and any edit revokes it. */
export async function configHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
}
