import { decodeOutput, encodeInput, isForeignEditable, keyedChain, matchShortcut, nextWaiting, singleFlight, writeQueue } from "@/lib/terminal/util"

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

  describe("writeQueue", () => {
    const deferredWriter = () => {
      const calls: { data: string; resolve: () => void; reject: (e: Error) => void }[] = []
      const send = (data: string) => new Promise<void>((resolve, reject) => calls.push({ data, resolve, reject }))
      return { calls, send }
    }
    const flush = () => new Promise((r) => setTimeout(r, 0))

    it("sends the first write immediately and coalesces the rest, preserving order", async () => {
      const w = deferredWriter()
      const push = writeQueue(w.send, jest.fn())
      push("l")
      expect(w.calls.map((c) => c.data)).toEqual(["l"])
      push("s")
      push(" -la")
      push("\r")
      expect(w.calls).toHaveLength(1) // still one in flight
      w.calls[0].resolve()
      await flush()
      expect(w.calls.map((c) => c.data)).toEqual(["l", "s -la\r"])
      w.calls[1].resolve()
      await flush()
      push("x")
      expect(w.calls.map((c) => c.data)).toEqual(["l", "s -la\r", "x"])
    })

    it("a rejected write doesn't wedge the queue and reports once", async () => {
      const w = deferredWriter()
      const onError = jest.fn()
      const push = writeQueue(w.send, onError)
      push("a")
      push("b")
      w.calls[0].reject(new Error("gone"))
      await flush()
      expect(w.calls.map((c) => c.data)).toEqual(["a", "b"])
      w.calls[1].reject(new Error("gone again"))
      await flush()
      push("c")
      expect(w.calls.map((c) => c.data)).toEqual(["a", "b", "c"])
      expect(onError).toHaveBeenCalledTimes(1)
    })
  })

  it("keyedChain runs calls for one key in issue order even when the first is slower", async () => {
    const chain = keyedChain<string>()
    const order: string[] = []
    let releaseFirst!: () => void
    const first = chain("t", () => new Promise<void>((r) => (releaseFirst = () => { order.push("first"); r() })))
    const second = chain("t", async () => { order.push("second") })
    const other = chain("u", async () => { order.push("other") })
    await other
    expect(order).toEqual(["other"])
    releaseFirst()
    await Promise.all([first, second])
    expect(order).toEqual(["other", "first", "second"])
  })

  it("keyedChain continues after a rejection", async () => {
    const chain = keyedChain<string>()
    await expect(chain("t", async () => { throw new Error("x") })).rejects.toThrow("x")
    expect(await chain("t", async () => 5)).toBe(5)
  })

  it("isForeignEditable ignores xterm's helper textarea", () => {
    const cls = (...c: string[]) => ({ contains: (x: string) => c.includes(x) })
    expect(isForeignEditable({ tagName: "TEXTAREA", classList: cls("xterm-helper-textarea") })).toBe(false)
    expect(isForeignEditable({ tagName: "INPUT", classList: cls() })).toBe(true)
    expect(isForeignEditable({ tagName: "DIV", isContentEditable: true, classList: cls() })).toBe(true)
    expect(isForeignEditable({ tagName: "DIV", classList: cls() })).toBe(false)
    expect(isForeignEditable(null)).toBe(false)
  })
})
