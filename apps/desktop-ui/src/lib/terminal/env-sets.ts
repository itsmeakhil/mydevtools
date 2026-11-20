import { listEnvSetEntries } from "@/lib/environment-manager-api"
import { parseEnvPayloadJson } from "@/lib/environment-manager-utils"
import { decryptData } from "@/lib/encryption"

export interface EnvSet { project: string; environment: string; variables: { key: string; value: string }[] }

/** How a set is named in the UI and in a workspace's `env` field. */
export const envSetName = (s: Pick<EnvSet, "project" | "environment">) => `${s.project} · ${s.environment}`

/** Every Environment Manager set, decrypted with the vault key (unreadable rows are skipped). */
export async function loadEnvSets(key: CryptoKey): Promise<EnvSet[]> {
  const rows = await listEnvSetEntries()
  const decoded = await Promise.all(rows.map((r) => decryptData(key, r.encryptedData, r.iv).then(parseEnvPayloadJson, () => null)))
  return decoded.flatMap((d) => (d ? [{ project: d.project, environment: d.environment, variables: d.variables }] : []))
}
