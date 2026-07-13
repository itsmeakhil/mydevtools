/**
 * Pure(ish) logic for the Bcrypt Generator & Checker tool.
 *
 * Uses the async bcryptjs API exclusively — the sync variants block the main
 * thread for seconds at high cost factors, so they are never used here.
 */

import { compare, genSalt, hash } from 'bcryptjs'

export const MIN_COST = 4
export const MAX_COST = 31

export interface ParsedBcryptHash {
  /** Algorithm identifier, e.g. "2b" */
  version: string
  /** Cost factor (log2 rounds), e.g. 10 */
  cost: number
  /** 22-char base64 salt segment */
  salt: string
  /** 31-char base64 digest segment */
  digest: string
}

const BCRYPT_HASH_RE = /^\$(2[abxy]?)\$(\d{2})\$([./A-Za-z0-9]{22})([./A-Za-z0-9]{31})$/

/**
 * Parses a bcrypt hash string into its anatomical segments.
 * Returns null when the string is not a structurally valid bcrypt hash.
 */
export function parseBcryptHash(hashStr: string): ParsedBcryptHash | null {
  if (typeof hashStr !== 'string') return null
  const match = BCRYPT_HASH_RE.exec(hashStr.trim())
  if (!match) return null
  const cost = parseInt(match[2], 10)
  if (Number.isNaN(cost) || cost < MIN_COST || cost > MAX_COST) return null
  return {
    version: match[1],
    cost,
    salt: match[3],
    digest: match[4],
  }
}

/**
 * Asynchronously hashes a password with the given cost factor.
 * Throws for an out-of-range or non-integer cost.
 */
export async function hashPassword(password: string, cost: number): Promise<string> {
  if (!Number.isInteger(cost) || cost < MIN_COST || cost > MAX_COST) {
    throw new Error(`Cost factor must be an integer between ${MIN_COST} and ${MAX_COST}`)
  }
  const salt = await genSalt(cost)
  return hash(password, salt)
}

/**
 * Asynchronously verifies a password against a bcrypt hash.
 * Returns false (never throws) for malformed hashes.
 */
export async function verifyPassword(password: string, hashStr: string): Promise<boolean> {
  if (!parseBcryptHash(hashStr)) return false
  try {
    return await compare(password, hashStr.trim())
  } catch {
    return false
  }
}
