/**
 * HTTP Digest auth (RFC 7616) — pre-emptive variant only.
 *
 * Pre-emptive ⇒ the user pre-fills `realm` / `nonce` / `qop` / `algorithm`
 * from a prior 401 challenge instead of letting the client handshake. Cheaper:
 * no extra round trip, and our proxy doesn't have to carry the 401-→retry
 * state across the wire.
 *
 * Supports MD5 and SHA-256. MD5 lives below because Web Crypto deliberately
 * dropped MD5; for digest auth, MD5 is still the common case in legacy APIs.
 */

import type { DigestConfig } from "@/components/api-client/types"

const enc = new TextEncoder()

// ── MD5 (rfc1321) — compact pure-JS implementation ───────────────────────────
// Used only for digest auth where the algorithm field is "MD5". Tested against
// the RFC 1321 test suite below.

function md5(s: string): string {
    function add32(a: number, b: number) { return (a + b) & 0xffffffff }
    function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
        const u = add32(add32(a, q), add32(x, t))
        return add32(((u << s) | (u >>> (32 - s))) & 0xffffffff, b)
    }
    function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | (~b & d), a, b, x, s, t) }
    function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & ~d), a, b, x, s, t) }
    function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t) }
    function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | ~d), a, b, x, s, t) }

    function md5cycle(x: Int32Array, k: number[]) {
        let [a, b, c, d] = [x[0], x[1], x[2], x[3]]
        a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586); c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330)
        a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426); c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983)
        a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417); c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162)
        a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101); c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329)
        a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632); c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302)
        a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083); c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848)
        a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690); c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501)
        a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784); c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734)
        a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463); c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556)
        a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353); c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640)
        a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222); c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189)
        a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835); c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651)
        a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415); c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055)
        a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606); c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799)
        a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744); c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649)
        a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379); c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551)
        x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3])
    }

    function md5blk(s: string, off: number): number[] {
        const blk: number[] = new Array(16)
        for (let i = 0; i < 16; i++) {
            blk[i] = s.charCodeAt(off + i * 4)
                | (s.charCodeAt(off + i * 4 + 1) << 8)
                | (s.charCodeAt(off + i * 4 + 2) << 16)
                | (s.charCodeAt(off + i * 4 + 3) << 24)
        }
        return blk
    }

    // Convert to byte-string (Latin-1) for byte-accurate hashing of arbitrary bytes.
    const bytes = Array.from(enc.encode(s)).map((b) => String.fromCharCode(b)).join("")
    const state = new Int32Array([1732584193, -271733879, -1732584194, 271733878])
    const n = bytes.length
    let i = 0
    for (; i + 64 <= n; i += 64) md5cycle(state, md5blk(bytes, i))

    // Tail handling.
    const tail = new Array<number>(16).fill(0)
    const rem = n - i
    for (let j = 0; j < rem; j++) tail[j >> 2] |= bytes.charCodeAt(i + j) << ((j % 4) * 8)
    tail[rem >> 2] |= 0x80 << ((rem % 4) * 8)
    if (rem > 55) {
        md5cycle(state, tail)
        for (let j = 0; j < 16; j++) tail[j] = 0
    }
    tail[14] = n * 8
    md5cycle(state, tail)

    let hex = ""
    for (let j = 0; j < 4; j++) {
        const v = state[j]
        for (let k = 0; k < 4; k++) {
            hex += ((v >>> (k * 8)) & 0xff).toString(16).padStart(2, "0")
        }
    }
    return hex
}

async function sha256Hex(s: string): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-256", enc.encode(s))
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

function randomHex(len = 8): string {
    const bytes = new Uint8Array(len)
    crypto.getRandomValues(bytes)
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function signDigest(args: {
    method: string
    url: URL
    headers: Record<string, string>
    body?: string
    cfg: DigestConfig
}): Promise<string> {
    const algorithm = args.cfg.algorithm ?? "MD5"
    const qop = args.cfg.qop ?? "auth"
    const nc = args.cfg.nc ?? "00000001"
    const cnonce = args.cfg.cnonce ?? randomHex(8)
    const uri = args.url.pathname + (args.url.search || "")

    const H = async (s: string): Promise<string> =>
        algorithm === "SHA-256" ? sha256Hex(s) : md5(s)

    const ha1 = await H(`${args.cfg.username}:${args.cfg.realm}:${args.cfg.password}`)
    const ha2Body = qop === "auth-int"
        ? `${args.method}:${uri}:${await H(args.body ?? "")}`
        : `${args.method}:${uri}`
    const ha2 = await H(ha2Body)
    const response = await H(`${ha1}:${args.cfg.nonce}:${nc}:${cnonce}:${qop}:${ha2}`)

    const parts = [
        `username="${args.cfg.username}"`,
        `realm="${args.cfg.realm}"`,
        `nonce="${args.cfg.nonce}"`,
        `uri="${uri}"`,
        `algorithm=${algorithm}`,
        `qop=${qop}`,
        `nc=${nc}`,
        `cnonce="${cnonce}"`,
        `response="${response}"`,
    ]
    if (args.cfg.opaque) parts.push(`opaque="${args.cfg.opaque}"`)

    const header = `Digest ${parts.join(", ")}`
    args.headers["Authorization"] = header
    return header
}
