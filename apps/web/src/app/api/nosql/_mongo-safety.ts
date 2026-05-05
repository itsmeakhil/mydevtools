const PRIVATE_HOST_BYPASS =
  (process.env.ALLOW_PRIVATE_NOSQL_HOSTS || "").toLowerCase() === "true"

function isIpv4(host: string): boolean {
  const parts = host.split(".")
  if (parts.length !== 4) return false
  return parts.every((p) => {
    if (!/^\d+$/.test(p)) return false
    const n = Number(p)
    return n >= 0 && n <= 255
  })
}

function isPrivateIpv4(host: string): boolean {
  if (!isIpv4(host)) return false
  const [a, b] = host.split(".").map(Number)
  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 0) return true
  return false
}

function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase()
  if (h === "::1") return true
  if (h.startsWith("fe80:")) return true // link-local
  if (h.startsWith("fc") || h.startsWith("fd")) return true // unique local
  return false
}

function extractHostsFromMongoUri(connectionString: string): string[] {
  const schemeSep = connectionString.indexOf("://")
  if (schemeSep === -1) return []
  const afterScheme = connectionString.slice(schemeSep + 3)
  const authority = afterScheme.split("/")[0] || ""
  const hostPart = authority.includes("@")
    ? authority.slice(authority.lastIndexOf("@") + 1)
    : authority

  return hostPart
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (entry.startsWith("[")) {
        const idx = entry.indexOf("]")
        return idx > 0 ? entry.slice(1, idx).toLowerCase() : entry.toLowerCase()
      }
      const idx = entry.lastIndexOf(":")
      if (idx > 0) return entry.slice(0, idx).toLowerCase()
      return entry.toLowerCase()
    })
}

export function validateMongoConnectionString(connectionString: string): string | null {
  const value = (connectionString || "").trim()
  if (!value) return "Connection string is required"

  if (!value.startsWith("mongodb://") && !value.startsWith("mongodb+srv://")) {
    return "Connection string must start with mongodb:// or mongodb+srv://"
  }

  if (PRIVATE_HOST_BYPASS) return null

  const hosts = extractHostsFromMongoUri(value)
  if (hosts.length === 0) return "Invalid MongoDB connection string"

  for (const host of hosts) {
    if (
      host === "localhost" ||
      host === "localhost.localdomain" ||
      host.endsWith(".localhost") ||
      host === "metadata.google.internal" ||
      host.endsWith(".internal")
    ) {
      return `Blocked MongoDB host: ${host}`
    }
    if (isPrivateIpv4(host) || isPrivateIpv6(host)) {
      return `Blocked MongoDB host: ${host}`
    }
  }

  return null
}
