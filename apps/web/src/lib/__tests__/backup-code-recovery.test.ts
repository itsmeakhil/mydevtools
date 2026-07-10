/**
 * backup-code-recovery.test.ts
 *
 * Regression guard for master-password recovery via backup codes.
 *
 * The store side (encryptWithBackupCode) and the unlock side once derived the
 * lookup codeId independently and drifted — storage used the first 10 chars,
 * unlock used the first 6 — so every backup-code recovery silently failed to
 * find its stored blob. Both now go through backupCodeId(); these tests lock
 * that they agree, end to end.
 */

import { webcrypto } from "node:crypto"

// encryption.ts reaches for window.crypto / window.btoa / window.atob.
if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    writable: true,
    configurable: true,
  })
} else if (!globalThis.crypto.subtle) {
  // @ts-expect-error — polyfill subtle on a partial crypto
  globalThis.crypto.subtle = webcrypto.subtle
}
if (typeof (globalThis as { window?: unknown }).window === "undefined") {
  ;(globalThis as { window?: unknown }).window = globalThis
}

import {
  generateBackupCodes,
  encryptWithBackupCode,
  decryptWithBackupCode,
  backupCodeId,
} from "@/lib/encryption"

describe("backup-code recovery", () => {
  it("store and lookup resolve the same codeId, and the master password round-trips", async () => {
    const [code] = generateBackupCodes(1)
    const master = "correct horse battery staple"
    const stored = await encryptWithBackupCode(code, master)

    // Storage id is the H-7 10-char id, not the old 6-char one.
    expect(stored.codeId).toHaveLength(10)

    // Simulate the unlock path: user pastes the code lower-cased and padded.
    const typed = `  ${code.toLowerCase()}  `
    const normalized = typed.trim().toUpperCase().replace(/\s/g, "")
    const stripped = normalized.replace(/-/g, "")
    const lookupId = backupCodeId(stripped)

    expect(lookupId).toBe(stored.codeId)

    const recovered = await decryptWithBackupCode(
      stripped,
      stored.codeSalt,
      stored.encrypted,
      stored.iv
    )
    expect(recovered).toBe(master)
  })

  it("backupCodeId is stable across dashes, case and whitespace", () => {
    const [code] = generateBackupCodes(1)
    const stripped = code.replace(/-/g, "")
    expect(backupCodeId(code)).toBe(backupCodeId(stripped))
    expect(backupCodeId(code.toLowerCase())).toBe(backupCodeId(code))
    expect(backupCodeId(`  ${code}  `)).toBe(backupCodeId(code))
  })
})
