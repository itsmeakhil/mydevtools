/**
 * Byte-array MD5 — required for NTLM's HMAC-MD5. Web Crypto deliberately
 * dropped MD5, so we ship the algorithm here. Distinct from `digest.ts`'s
 * string-based MD5 only by signature (this one takes bytes, returns bytes).
 */

function add32(a: number, b: number): number { return (a + b) & 0xffffffff }

function cycle(state: Int32Array, blk: number[]): void {
    function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
        const u = add32(add32(a, q), add32(x, t))
        return add32(((u << s) | (u >>> (32 - s))) & 0xffffffff, b)
    }
    function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | (~b & d), a, b, x, s, t) }
    function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & ~d), a, b, x, s, t) }
    function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t) }
    function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | ~d), a, b, x, s, t) }

    let [a, b, c, d] = [state[0], state[1], state[2], state[3]]
    a = ff(a, b, c, d, blk[0], 7, -680876936); d = ff(d, a, b, c, blk[1], 12, -389564586); c = ff(c, d, a, b, blk[2], 17, 606105819); b = ff(b, c, d, a, blk[3], 22, -1044525330)
    a = ff(a, b, c, d, blk[4], 7, -176418897); d = ff(d, a, b, c, blk[5], 12, 1200080426); c = ff(c, d, a, b, blk[6], 17, -1473231341); b = ff(b, c, d, a, blk[7], 22, -45705983)
    a = ff(a, b, c, d, blk[8], 7, 1770035416); d = ff(d, a, b, c, blk[9], 12, -1958414417); c = ff(c, d, a, b, blk[10], 17, -42063); b = ff(b, c, d, a, blk[11], 22, -1990404162)
    a = ff(a, b, c, d, blk[12], 7, 1804603682); d = ff(d, a, b, c, blk[13], 12, -40341101); c = ff(c, d, a, b, blk[14], 17, -1502002290); b = ff(b, c, d, a, blk[15], 22, 1236535329)
    a = gg(a, b, c, d, blk[1], 5, -165796510); d = gg(d, a, b, c, blk[6], 9, -1069501632); c = gg(c, d, a, b, blk[11], 14, 643717713); b = gg(b, c, d, a, blk[0], 20, -373897302)
    a = gg(a, b, c, d, blk[5], 5, -701558691); d = gg(d, a, b, c, blk[10], 9, 38016083); c = gg(c, d, a, b, blk[15], 14, -660478335); b = gg(b, c, d, a, blk[4], 20, -405537848)
    a = gg(a, b, c, d, blk[9], 5, 568446438); d = gg(d, a, b, c, blk[14], 9, -1019803690); c = gg(c, d, a, b, blk[3], 14, -187363961); b = gg(b, c, d, a, blk[8], 20, 1163531501)
    a = gg(a, b, c, d, blk[13], 5, -1444681467); d = gg(d, a, b, c, blk[2], 9, -51403784); c = gg(c, d, a, b, blk[7], 14, 1735328473); b = gg(b, c, d, a, blk[12], 20, -1926607734)
    a = hh(a, b, c, d, blk[5], 4, -378558); d = hh(d, a, b, c, blk[8], 11, -2022574463); c = hh(c, d, a, b, blk[11], 16, 1839030562); b = hh(b, c, d, a, blk[14], 23, -35309556)
    a = hh(a, b, c, d, blk[1], 4, -1530992060); d = hh(d, a, b, c, blk[4], 11, 1272893353); c = hh(c, d, a, b, blk[7], 16, -155497632); b = hh(b, c, d, a, blk[10], 23, -1094730640)
    a = hh(a, b, c, d, blk[13], 4, 681279174); d = hh(d, a, b, c, blk[0], 11, -358537222); c = hh(c, d, a, b, blk[3], 16, -722521979); b = hh(b, c, d, a, blk[6], 23, 76029189)
    a = hh(a, b, c, d, blk[9], 4, -640364487); d = hh(d, a, b, c, blk[12], 11, -421815835); c = hh(c, d, a, b, blk[15], 16, 530742520); b = hh(b, c, d, a, blk[2], 23, -995338651)
    a = ii(a, b, c, d, blk[0], 6, -198630844); d = ii(d, a, b, c, blk[7], 10, 1126891415); c = ii(c, d, a, b, blk[14], 15, -1416354905); b = ii(b, c, d, a, blk[5], 21, -57434055)
    a = ii(a, b, c, d, blk[12], 6, 1700485571); d = ii(d, a, b, c, blk[3], 10, -1894986606); c = ii(c, d, a, b, blk[10], 15, -1051523); b = ii(b, c, d, a, blk[1], 21, -2054922799)
    a = ii(a, b, c, d, blk[8], 6, 1873313359); d = ii(d, a, b, c, blk[15], 10, -30611744); c = ii(c, d, a, b, blk[6], 15, -1560198380); b = ii(b, c, d, a, blk[13], 21, 1309151649)
    a = ii(a, b, c, d, blk[4], 6, -145523070); d = ii(d, a, b, c, blk[11], 10, -1120210379); c = ii(c, d, a, b, blk[2], 15, 718787259); b = ii(b, c, d, a, blk[9], 21, -343485551)
    state[0] = add32(a, state[0]); state[1] = add32(b, state[1]); state[2] = add32(c, state[2]); state[3] = add32(d, state[3])
}

export function md5Bytes(bytes: Uint8Array): Uint8Array {
    const state = new Int32Array([1732584193, -271733879, -1732584194, 271733878])
    const n = bytes.length
    let i = 0
    for (; i + 64 <= n; i += 64) {
        const blk = new Array<number>(16)
        for (let j = 0; j < 16; j++) {
            blk[j] = bytes[i + j * 4] | (bytes[i + j * 4 + 1] << 8) | (bytes[i + j * 4 + 2] << 16) | (bytes[i + j * 4 + 3] << 24)
        }
        cycle(state, blk)
    }
    const tail = new Array<number>(16).fill(0)
    const rem = n - i
    for (let j = 0; j < rem; j++) tail[j >> 2] |= bytes[i + j] << ((j % 4) * 8)
    tail[rem >> 2] |= 0x80 << ((rem % 4) * 8)
    if (rem > 55) {
        cycle(state, tail)
        for (let j = 0; j < 16; j++) tail[j] = 0
    }
    tail[14] = n * 8
    cycle(state, tail)

    const out = new Uint8Array(16)
    for (let j = 0; j < 4; j++) {
        const v = state[j]
        out[j * 4] = v & 0xff
        out[j * 4 + 1] = (v >>> 8) & 0xff
        out[j * 4 + 2] = (v >>> 16) & 0xff
        out[j * 4 + 3] = (v >>> 24) & 0xff
    }
    return out
}

export function hmacMd5(key: Uint8Array, data: Uint8Array): Uint8Array {
    let k = key
    if (k.length > 64) k = md5Bytes(k)
    if (k.length < 64) {
        const padded = new Uint8Array(64)
        padded.set(k)
        k = padded
    }
    const ipad = new Uint8Array(64)
    const opad = new Uint8Array(64)
    for (let i = 0; i < 64; i++) {
        ipad[i] = k[i] ^ 0x36
        opad[i] = k[i] ^ 0x5c
    }
    const inner = new Uint8Array(64 + data.length)
    inner.set(ipad)
    inner.set(data, 64)
    const innerHash = md5Bytes(inner)
    const outer = new Uint8Array(64 + 16)
    outer.set(opad)
    outer.set(innerHash, 64)
    return md5Bytes(outer)
}
