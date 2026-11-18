/**
 * `require()` for pre-request / test scripts. A few modules Postman and Bruno
 * collections commonly use, re-implemented small and synchronous (crypto-js is
 * sync, so SubtleCrypto doesn't fit). btoa/atob are already worker globals.
 *
 * ponytail: crypto-js subset only (MD5, SHA256, HmacSHA256, enc.*); add
 * SHA1/SHA512/AES when an imported collection needs them.
 */

// ── bytes ⇄ strings ─────────────────────────────────────────────────────────
const utf8 = (s: string) => new TextEncoder().encode(s)
const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")
const fromHex = (h: string) => new Uint8Array((h.match(/[0-9a-f]{2}/gi) ?? []).map((x) => parseInt(x, 16)))
const toBinary = (b: Uint8Array) => {
    let s = ""
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
    return s
}
const fromBinary = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff)

// ── crypto-js WordArray look-alike ──────────────────────────────────────────
interface Encoder { stringify(w: WordArray): string; parse(s: string): WordArray }

export class WordArray {
    constructor(readonly bytes: Uint8Array) {}
    get sigBytes() { return this.bytes.length }
    toString(encoder: Encoder = Hex) { return encoder.stringify(this) }
    concat(other: WordArray) {
        const out = new Uint8Array(this.bytes.length + other.bytes.length)
        out.set(this.bytes)
        out.set(other.bytes, this.bytes.length)
        return new WordArray(out)
    }
}

const Hex: Encoder = { stringify: (w) => toHex(w.bytes), parse: (s) => new WordArray(fromHex(s)) }
const Utf8: Encoder = { stringify: (w) => new TextDecoder().decode(w.bytes), parse: (s) => new WordArray(utf8(s)) }
const Latin1: Encoder = { stringify: (w) => toBinary(w.bytes), parse: (s) => new WordArray(fromBinary(s)) }
const Base64: Encoder = {
    stringify: (w) => btoa(toBinary(w.bytes)),
    parse: (s) => new WordArray(fromBinary(atob(s.replace(/\s/g, "")))),
}

const bytesOf = (m: unknown) => (m instanceof WordArray ? m.bytes : utf8(String(m ?? "")))

// ── hashes ──────────────────────────────────────────────────────────────────
const K256 = Uint32Array.from([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
])

/** Message padded to 64-byte blocks with its bit length appended (big- or little-endian). */
function pad(msg: Uint8Array, bigEndian: boolean): DataView {
    const len = Math.ceil((msg.length + 9) / 64) * 64
    const buf = new Uint8Array(len)
    buf.set(msg)
    buf[msg.length] = 0x80
    const view = new DataView(buf.buffer)
    const bits = msg.length * 8
    if (bigEndian) {
        view.setUint32(len - 8, Math.floor(bits / 2 ** 32))
        view.setUint32(len - 4, bits >>> 0)
    } else {
        view.setUint32(len - 8, bits >>> 0, true)
        view.setUint32(len - 4, Math.floor(bits / 2 ** 32), true)
    }
    return view
}

export function sha256(msg: Uint8Array): Uint8Array {
    const v = pad(msg, true)
    const h = Uint32Array.from([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19])
    const w = new Uint32Array(64)
    const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n))
    for (let off = 0; off < v.byteLength; off += 64) {
        for (let i = 0; i < 16; i++) w[i] = v.getUint32(off + i * 4)
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
            const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
        }
        let [a, b, c, d, e, f, g, hh] = h
        for (let i = 0; i < 64; i++) {
            const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) >>> 0
            const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0
            hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0
        }
        h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh
    }
    const out = new DataView(new ArrayBuffer(32))
    h.forEach((x, i) => out.setUint32(i * 4, x))
    return new Uint8Array(out.buffer)
}

const MD5_S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
const MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0)

export function md5(msg: Uint8Array): Uint8Array {
    const v = pad(msg, false)
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476
    for (let off = 0; off < v.byteLength; off += 64) {
        const m = Array.from({ length: 16 }, (_, i) => v.getUint32(off + i * 4, true))
        let a = a0, b = b0, c = c0, d = d0
        for (let i = 0; i < 64; i++) {
            let f: number, g: number
            if (i < 16) { f = (b & c) | (~b & d); g = i }
            else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16 }
            else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16 }
            else { f = c ^ (b | ~d); g = (7 * i) % 16 }
            const s = MD5_S[(i >> 4) * 4 + (i % 4)]
            const x = (a + f + MD5_K[i] + m[g]) >>> 0
            a = d; d = c; c = b
            b = (b + ((x << s) | (x >>> (32 - s)))) >>> 0
        }
        a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0
    }
    const out = new DataView(new ArrayBuffer(16))
    ;[a0, b0, c0, d0].forEach((x, i) => out.setUint32(i * 4, x, true))
    return new Uint8Array(out.buffer)
}

export function hmac(hash: (m: Uint8Array) => Uint8Array, key: Uint8Array, msg: Uint8Array): Uint8Array {
    const k = new Uint8Array(64)
    k.set(key.length > 64 ? hash(key) : key)
    const inner = new Uint8Array(64 + msg.length)
    for (let i = 0; i < 64; i++) inner[i] = k[i] ^ 0x36
    inner.set(msg, 64)
    const ih = hash(inner)
    const outer = new Uint8Array(64 + ih.length)
    for (let i = 0; i < 64; i++) outer[i] = k[i] ^ 0x5c
    outer.set(ih, 64)
    return hash(outer)
}

export const CryptoJS = {
    MD5: (m: unknown) => new WordArray(md5(bytesOf(m))),
    SHA256: (m: unknown) => new WordArray(sha256(bytesOf(m))),
    HmacSHA256: (m: unknown, key: unknown) => new WordArray(hmac(sha256, bytesOf(key), bytesOf(m))),
    HmacMD5: (m: unknown, key: unknown) => new WordArray(hmac(md5, bytesOf(key), bytesOf(m))),
    enc: { Hex, Utf8, Latin1, Base64 },
    lib: { WordArray },
}

const MODULES: Record<string, () => unknown> = {
    uuid: () => ({ v4: () => crypto.randomUUID() }),
    "crypto-js": () => CryptoJS,
}

/** The script's `require`. Unknown modules fail with the list that is available. */
export function scriptRequire(name: string): unknown {
    const make = Object.hasOwn(MODULES, name) ? MODULES[name] : undefined
    if (!make) {
        throw new Error(`Cannot find module '${name}' — scripts can require: ${Object.keys(MODULES).join(", ")}`)
    }
    return make()
}
