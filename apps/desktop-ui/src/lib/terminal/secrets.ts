import { listPasswordEntries } from "@/lib/password-manager-api"
import { listApiKeyEntries } from "@/lib/api-key-vault-api"
import { parseApiKeyPayload } from "@/lib/api-key-vault-utils"
import { decryptData } from "@/lib/encryption"
import { fetchAllPages } from "@/lib/fetch-all-pages"

/** One vault field picked to become an env var of a new pane. */
export interface SecretChoice { source: "password" | "apiKey"; id: string; field: "password" | "username" | "apiKey" | "secret"; varName: string }

export interface VaultSecret {
  id: string
  source: SecretChoice["source"]
  label: string
  fields: Partial<Record<SecretChoice["field"], string>>
}

const SUFFIX: Record<SecretChoice["field"], string> = { password: "PASSWORD", username: "USERNAME", apiKey: "API_KEY", secret: "SECRET" }

/** "Stripe live" + apiKey → "STRIPE_LIVE_API_KEY": ASCII, uppercase, ≤ 64 chars, never starts with a digit. */
export function defaultVarName(label: string, field: SecretChoice["field"]): string {
  const suffix = SUFFIX[field]
  const base = label
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
  const name = base ? `${base.slice(0, 63 - suffix.length - 1)}_${suffix}` : suffix
  return /^\d/.test(name) ? `_${name}` : name
}

const SECRET_NAME = /(SECRET|TOKEN|PASSWORD|PASSWD|PWD|API_?KEY|AUTH|CREDENTIAL|PRIVATE)|(^|_)(KEY|PAT|DSN|WEBHOOK)(_|$)/i
// Rust `mask_ok` (terminal/mask.rs): Rust refuses to open the pane unless every entry passes.
const MIN_BYTES = 8
const MAX_BYTES = 4096
const MAX_ENTRIES = 64
const LABEL_LEN = 64
const bytes = (s: string) => new TextEncoder().encode(s).length

/**
 * The mask for a pane's env (label → value), built so Rust always accepts it: labels are the
 * names uppercased with anything outside `[A-Z0-9_]` as `_` (≤ 64), values are 8–4096 bytes
 * and taken from `env` itself, at most 64 entries. `all` masks every value, otherwise only
 * secret-looking names. Values under 8 bytes can't be masked (they'd hit ordinary output);
 * `tooShort` / `tooLong` / `tooMany` name the ones left unmasked that the user should hear about.
 */
export function maskEntries(env: Record<string, string>, { all = false }: { all?: boolean }) {
  const mask: Record<string, string> = {}
  const tooShort: string[] = []
  const tooLong: string[] = []
  const tooMany: string[] = []
  for (const [name, value] of Object.entries(env)) {
    if (!all && !SECRET_NAME.test(name)) continue
    const n = bytes(value)
    if (value.includes("\0")) continue
    if (n < MIN_BYTES) {
      if (n > 0) tooShort.push(name)
      continue
    }
    if (n > MAX_BYTES) {
      tooLong.push(name)
      continue
    }
    if (Object.keys(mask).length >= MAX_ENTRIES) {
      tooMany.push(name)
      continue
    }
    const base = name.toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, LABEL_LEN)
    if (!base) continue
    // Names that differ only in case would share a label: number the later ones.
    let label = base
    for (let i = 2; label in mask; i++) label = `${base.slice(0, LABEL_LEN - String(i).length - 1)}_${i}`
    mask[label] = value
  }
  return { mask, tooShort, tooLong, tooMany }
}

export const maskFor = (env: Record<string, string>, opts: { all?: boolean }) => maskEntries(env, opts).mask

const PAGE_SIZE = 500
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined)
const defined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T

/** Every vault password and API key, decrypted with `key` (unreadable rows are skipped). Held in memory only. */
export async function loadVaultSecrets(key: CryptoKey): Promise<VaultSecret[]> {
  const [pwRows, keyRows] = await Promise.all([
    fetchAllPages({ pageSize: PAGE_SIZE, fetchPage: (skip, limit) => listPasswordEntries({ skip, limit }) }),
    listApiKeyEntries(),
  ])
  const decrypt = (r: { encryptedData: string; iv: string }) => decryptData(key, r.encryptedData, r.iv).catch(() => null)
  const pws = await Promise.all(
    pwRows.map(async (r): Promise<VaultSecret | null> => {
      const plain = await decrypt(r)
      let o: Record<string, unknown>
      try {
        o = plain ? JSON.parse(plain) : null
      } catch {
        return null
      }
      if (!o || typeof o !== "object") return null
      return { id: r.id, source: "password", label: str(o.service) ?? "", fields: defined({ password: str(o.password), username: str(o.username) }) }
    }),
  )
  const keys = await Promise.all(
    keyRows.map(async (r): Promise<VaultSecret | null> => {
      const plain = await decrypt(r)
      const o = plain ? parseApiKeyPayload(plain) : null
      return o && { id: r.id, source: "apiKey", label: o.name, fields: defined({ apiKey: str(o.apiKey), secret: str(o.secret) }) }
    }),
  )
  return [...pws, ...keys].filter((s): s is VaultSecret => s !== null && Object.keys(s.fields).length > 0)
}
