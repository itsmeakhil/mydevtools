/**
 * Client certificates, extra CA certificates and the proxy mode for api-client
 * sends. Global settings live in the encrypted preferences store
 * (`apiClientNetwork`); a collection can add its own certificates and CAs.
 *
 * Only file PATHS travel to Rust (`input.net`); it reads the files at send time.
 */

export interface ClientCertEntry {
    id: string
    /** `api.example.com`, `*.example.com`, `api.example.com:8443` or `*`. */
    host: string
    type: "pem" | "pfx"
    certPath?: string
    /** Empty when the key is inside the certificate file. */
    keyPath?: string
    pfxPath?: string
    /** PFX passphrase. In folder-YAML collections only a `{{variable}}` reference is kept. */
    passphrase?: string
    enabled?: boolean
}

export type ProxyMode = "system" | "manual" | "off"

export interface ProxySettings {
    mode: ProxyMode
    /** `http://host:port`, `https://…` or `socks5://host:port`. */
    url?: string
    username?: string
    password?: string
    /** Hosts that skip the proxy: comma/space separated, `*.corp.example` allowed. */
    bypass?: string
}

export interface NetworkSettings {
    certs?: ClientCertEntry[]
    caPaths?: string[]
    proxy?: ProxySettings
}

/** What the Rust proxy reads from `input.net`. */
export interface NetInput {
    certs: Array<Pick<ClientCertEntry, "host" | "certPath" | "keyPath" | "pfxPath" | "passphrase" | "enabled">>
    caPaths: string[]
    proxy?: ProxySettings
}

const toInput = (c: ClientCertEntry, substitute: (s: string) => string): NetInput["certs"][number] => ({
    host: c.host,
    enabled: c.enabled,
    ...(c.type === "pfx"
        ? { pfxPath: c.pfxPath, passphrase: c.passphrase ? substitute(c.passphrase) : undefined }
        : { certPath: c.certPath, keyPath: c.keyPath }),
})

/** A collection's own entries; `substitute` resolves `{{vault.*}}` passphrases. */
export function collectionNet(
    col: Pick<NetworkSettings, "certs" | "caPaths"> | undefined,
    substitute: (s: string) => string = (s) => s,
): NetInput {
    return { certs: (col?.certs ?? []).map((c) => toInput(c, substitute)), caPaths: col?.caPaths ?? [] }
}

/** Collection entries first (first host match wins in Rust), then global ones. */
export function mergeNet(global: NetworkSettings | undefined, own: NetInput | undefined): NetInput {
    return {
        certs: [...(own?.certs ?? []), ...(global?.certs ?? []).map((c) => toInput(c, (s) => s))],
        caPaths: [...(own?.caPaths ?? []), ...(global?.caPaths ?? [])],
        proxy: global?.proxy,
    }
}

let cached: Promise<NetworkSettings | undefined> | null = null

/** Global settings from preferences, fetched once; `invalidateGlobalNetwork` after saving. */
export function loadGlobalNetwork(): Promise<NetworkSettings | undefined> {
    cached ??= import("@/lib/user-preferences-api")
        .then((m) => m.getUserPreferences())
        .then((p) => p.apiClientNetwork)
        .catch(() => {
            cached = null
            return undefined
        })
    return cached
}

export function invalidateGlobalNetwork(): void {
    cached = null
}

/** `input` with `net` = its own (collection) entries merged with the global settings. */
export async function withGlobalNet<T extends { net?: NetInput }>(input: T): Promise<T> {
    return { ...input, net: mergeNet(await loadGlobalNetwork(), input.net) }
}

/**
 * Copy for a folder-YAML file: paths and host patterns stay; a passphrase is
 * kept only as a `{{variable}}` reference, never as a literal.
 */
export function redactCertsForFile(certs: ClientCertEntry[] | undefined): ClientCertEntry[] | undefined {
    if (!certs?.length) return undefined
    return certs.map(({ passphrase, ...rest }) =>
        passphrase && /^\s*\{\{[^{}]+\}\}\s*$/.test(passphrase) ? { ...rest, passphrase } : rest,
    )
}
