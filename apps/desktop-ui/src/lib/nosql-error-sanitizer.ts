/**
 * Sanitize error messages to prevent leaking sensitive connection string data.
 * Connection strings may contain:
 * - mongodb://user:password@host/db
 * - mongodb+srv://user:password@cluster
 * Scrub these before returning to client.
 */
export function sanitizeError(error: unknown): string {
  let message = error instanceof Error ? error.message : String(error)

  // Remove connection strings in format: mongodb[+srv]://[user:password@]host[:port][/db]
  // Two fixes over the original /mongodb\+?srv?:\/\/[^/\s]+(\/[^\s]*)*/:
  // `srv?` required a literal "sr", so plain mongodb:// URLs fell through this
  // rule entirely and only their user:pass@ part was masked below; and the
  // nested quantifier matched the same span as \S* while backtracking
  // exponentially on a long near-match of attacker-influenced driver text.
  message = message.replace(
    /mongodb(\+srv)?:\/\/\S*/gi,
    "mongodb://***SANITIZED***"
  )

  // Remove auth credentials in format: user:password@
  message = message.replace(/[^/\s]+:[^/\s]+@/g, "***:***@")

  // Remove any email addresses (often used as usernames)
  message = message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "***@***")

  return message
}

/**
 * Validate database and collection names for safe characters.
 * MongoDB restrictions:
 * - DB names: no /, \, ., $, \0, multiple dots
 * - Collection names: no \0, $
 */
export function validateDbName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Database name must be a non-empty string" }
  }

  if (name.length > 64) {
    return { valid: false, error: "Database name cannot exceed 64 characters" }
  }

  // Reject forbidden characters
  if (/[/\\.\0$]/.test(name)) {
    return { valid: false, error: "Database name contains forbidden characters: / \\ . \\0 $" }
  }

  // Reject consecutive dots
  if (/\.\./.test(name)) {
    return { valid: false, error: "Database name cannot contain consecutive dots" }
  }

  return { valid: true }
}

export function validateCollectionName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Collection name must be a non-empty string" }
  }

  if (name.length > 120) {
    return { valid: false, error: "Collection name cannot exceed 120 characters" }
  }

  // Reject null character
  if (/\0/.test(name)) {
    return { valid: false, error: "Collection name cannot contain null character" }
  }

  // Allow system collections (starting with $) for internal use only via special flag
  // Normal collections shouldn't start with $
  if (/^\$/.test(name) && !name.startsWith("$cmd")) {
    return { valid: false, error: "Collection names cannot start with $ (reserved for system)" }
  }

  return { valid: true }
}
