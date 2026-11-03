import { decodeOutput, encodeInput, matchShortcut, nextWaiting, singleFlight } from "@/lib/terminal/util"

describe("terminal util", () => {
  it("round-trips UTF-8 (emoji, CJK, control bytes) through base64", () => {
    const s = "ls 😀 日本語 é\r\x03"
    const b64 = encodeInput(s)
    expect(Buffer.from(b64, "base64").toString("utf8")).toBe(s)
    expect(new TextDecoder().decode(decodeOutput(b64))).toBe(s)
  })

  it("encodes a large paste without overflowing", () => {
    const s = "😀".repeat(100_000)
    expect(Buffer.from(encodeInput(s), "base64").toString("utf8")).toBe(s)
  })

  it("decodeOutput keeps a UTF-8 sequence split across chunks as raw bytes", () => {
    const bytes = Buffer.from("😀", "utf8")
    const a = decodeOutput(bytes.subarray(0, 2).toString("base64"))
    const b = decodeOutput(bytes.subarray(2).toString("base64"))
    expect([...a, ...b]).toEqual([...bytes])
  })

  it("singleFlight skips a key while its call is pending", async () => {
    const run = singleFlight<string>()
    let resolve!: (v: number) => void
    const first = run("p", () => new Promise<number>((r) => (resolve = r)))
    expect(await run("p", async () => 2)).toBeUndefined()
    expect(await run("q", async () => 3)).toBe(3)
    resolve(1)
    expect(await first).toBe(1)
    expect(await run("p", async () => 4)).toBe(4)
  })

  it("singleFlight releases the key after a rejection", async () => {
    const run = singleFlight<string>()
    await expect(run("p", async () => { throw new Error("x") })).rejects.toThrow("x")
    expect(await run("p", async () => 1)).toBe(1)
  })

  it("nextWaiting cycles and wraps", () => {
    expect(nextWaiting([], "a")).toBeNull()
    expect(nextWaiting(["a", "b"], null)).toBe("a")
    expect(nextWaiting(["a", "b"], "a")).toBe("b")
    expect(nextWaiting(["a", "b"], "b")).toBe("a")
    expect(nextWaiting(["a", "b"], "zzz")).toBe("a")
  })

  it("matchShortcut", () => {
    const k = (code: string, shiftKey = false, metaKey = true) => matchShortcut({ code, shiftKey, metaKey, ctrlKey: false, altKey: false })
    expect(k("KeyD")).toBe("splitRow")
    expect(k("KeyD", true)).toBe("splitCol")
    expect(k("KeyT")).toBe("newTab")
    expect(k("BracketRight", true)).toBe("nextTab")
    expect(k("BracketLeft", true)).toBe("prevTab")
    expect(k("KeyJ")).toBe("nextWaiting")
    expect(k("KeyW")).toBeNull()
    expect(k("KeyD", false, false)).toBeNull()
  })
})
