import { decodeOutput, encodeInput, isForeignEditable, keyedChain, matchShortcut, nextWaiting, singleFlight, writeQueue, matchPaneShortcut, promptTarget, clampFontSize, FONT_SIZE, tabIndexFor, neighborPane, cwdFromOsc7, tildify, ago, duration, normalizePrefs, DEFAULT_PREFS, shellQuote, IMAGE_ADDON_OPTIONS } from "@/lib/terminal/util"

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
    expect(k("Slash")).toBe("shortcuts")
    expect(k("KeyB")).toBe("board")
    expect(k("KeyB", true)).toBeNull()
    expect(k("Slash", true)).toBeNull()
    expect(k("KeyW")).toBeNull()
    expect(k("KeyD", false, false)).toBeNull()
    expect(k("Enter", true)).toBe("zoomPane")
    expect(k("Enter")).toBeNull()
    expect(k("Digit1")).toEqual({ tab: 1 })
    expect(k("Digit9")).toEqual({ tab: 9 })
    expect(k("Digit0")).toBeNull()
    expect(k("Digit3", true)).toBeNull()
    const alt = (code: string) => matchShortcut({ code, shiftKey: false, metaKey: true, ctrlKey: false, altKey: true })
    expect(alt("ArrowLeft")).toEqual({ focus: "left" })
    expect(alt("ArrowDown")).toEqual({ focus: "down" })
    expect(alt("KeyD")).toBeNull()
  })

  it("tabIndexFor: ⌘9 is the last tab, out-of-range digits do nothing", () => {
    expect(tabIndexFor(1, 3)).toBe(0)
    expect(tabIndexFor(3, 3)).toBe(2)
    expect(tabIndexFor(4, 3)).toBeNull()
    expect(tabIndexFor(9, 3)).toBe(2)
    expect(tabIndexFor(9, 12)).toBe(11)
    expect(tabIndexFor(1, 0)).toBeNull()
  })

  it("neighborPane picks the adjacent pane in a direction", () => {
    // [a | b]
    // [a | c]   a spans full height on the left; b over c on the right.
    const rects = [
      { id: "a", left: 0, top: 0, right: 100, bottom: 200 },
      { id: "b", left: 101, top: 0, right: 200, bottom: 100 },
      { id: "c", left: 101, top: 101, right: 200, bottom: 200 },
    ]
    expect(neighborPane(rects, "a", "right")).toBe("b") // equal gap: nearer centre wins
    expect(neighborPane(rects, "c", "left")).toBe("a")
    expect(neighborPane(rects, "b", "down")).toBe("c")
    expect(neighborPane(rects, "c", "up")).toBe("b")
    expect(neighborPane(rects, "a", "left")).toBeNull()
    expect(neighborPane(rects, "a", "up")).toBeNull()
    expect(neighborPane(rects, "zzz", "up")).toBeNull()
  })

  it("cwdFromOsc7 decodes file URLs", () => {
    expect(cwdFromOsc7("file://mac.local/Users/me/my%20dir")).toBe("/Users/me/my dir")
    expect(cwdFromOsc7("file:///tmp")).toBe("/tmp")
    expect(cwdFromOsc7("http://x/y")).toBeNull()
    expect(cwdFromOsc7("file://host")).toBeNull()
    expect(cwdFromOsc7("file://h/%E0%A4%A")).toBeNull()
  })

  it("tildify shortens the home folder", () => {
    expect(tildify("/Users/me/src", "/Users/me")).toBe("~/src")
    expect(tildify("/Users/me", "/Users/me/")).toBe("~")
    expect(tildify("/Users/meow", "/Users/me")).toBe("/Users/meow")
    expect(tildify("/tmp", null)).toBe("/tmp")
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

  it("matchPaneShortcut maps ⌘F/⌘K/zoom/prompt jumps and ignores other modifiers", () => {
    const k = (code: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean }> = {}) =>
      matchPaneShortcut({ metaKey: true, ctrlKey: false, altKey: false, shiftKey: false, code, ...mods })
    expect(k("KeyF")).toBe("find")
    expect(k("KeyK")).toBe("clear")
    expect(k("Equal")).toBe("zoomIn")
    expect(k("Equal", { shiftKey: true })).toBe("zoomIn") // ⌘+
    expect(k("Minus")).toBe("zoomOut")
    expect(k("Digit0")).toBe("zoomReset")
    expect(k("ArrowUp")).toBe("prevPrompt")
    expect(k("ArrowDown")).toBe("nextPrompt")
    expect(k("KeyF", { shiftKey: true })).toBeNull()
    expect(k("KeyK", { ctrlKey: true })).toBeNull()
    expect(k("KeyF", { metaKey: false })).toBeNull()
    expect(k("KeyD")).toBeNull() // layout-level shortcut, not the pane's
    expect(k("ArrowUp", { shiftKey: true })).toBe("prevFailed")
    expect(k("ArrowDown", { shiftKey: true })).toBe("nextFailed")
    expect(k("KeyC", { shiftKey: true })).toBe("copyLastOutput")
    expect(k("KeyC")).toBeNull() // plain ⌘C stays copy
  })

  it("promptTarget finds the prompt above/below the top visible line", () => {
    const marks = [40, 5, 20]
    expect(promptTarget(marks, 25, "prev")).toBe(20)
    expect(promptTarget(marks, 20, "prev")).toBe(5)
    expect(promptTarget(marks, 5, "prev")).toBeNull()
    expect(promptTarget(marks, 25, "next")).toBe(40)
    expect(promptTarget(marks, 40, "next")).toBeNull()
    expect(promptTarget([], 0, "next")).toBeNull()
  })

  it("clampFontSize keeps sizes in range and repairs junk", () => {
    expect(clampFontSize(100)).toBe(FONT_SIZE.max)
    expect(clampFontSize(1)).toBe(FONT_SIZE.min)
    expect(clampFontSize(14.4)).toBe(14)
    expect(clampFontSize(NaN)).toBe(FONT_SIZE.default)
  })

  it("normalizePrefs fills defaults and drops out-of-range values", () => {
    expect(normalizePrefs(undefined)).toEqual(DEFAULT_PREFS)
    expect(normalizePrefs({ lineHeight: 1.2, cursorStyle: "bar", scrollback: 50_000, notifySound: true })).toEqual({
      ...DEFAULT_PREFS, lineHeight: 1.2, cursorStyle: "bar", scrollback: 50_000, notifySound: true,
    })
    expect(normalizePrefs({ lineHeight: 9, cursorStyle: "beam", scrollback: -1, copyOnSelect: "yes", fontFamily: 3 })).toEqual(DEFAULT_PREFS)
    expect(normalizePrefs({ fontFamily: "x".repeat(500) }).fontFamily).toHaveLength(200)
  })
  it("shellQuote leaves plain paths and single-quotes the rest", () => {
    expect(shellQuote(["/a/b.txt", "/x/my file.png", "/it's", "/$HOME;rm"])).toBe(
      "/a/b.txt '/x/my file.png' '/it'\\''s' '/$HOME;rm'",
    )
  })
  it("inline images: sixel + iTerm protocol with bounded pixels and memory", () => {
    expect(IMAGE_ADDON_OPTIONS).toEqual({ sixelSupport: true, iipSupport: true, pixelLimit: 16_777_216, storageLimit: 32 })
  })
  it("duration shows one rounded-down unit", () => {
    expect(duration(45_500, "en")).toBe("45s")
    expect(duration(185_000, "en")).toBe("3m")
    expect(duration(2 * 3600_000 + 59 * 60_000, "en")).toBe("2h")
  })
  it("ago picks minute/hour/day in the locale", () => {
    const min = 60_000
    expect(ago(0, 30_000, "en")).toBe("this minute")
    expect(ago(0, 5 * min, "en")).toBe("5m ago")
    expect(ago(0, 3 * 60 * min, "en")).toBe("3h ago")
    expect(ago(0, 2 * 24 * 60 * min, "en")).toBe("2d ago")
    expect(ago(10 * min, 0, "en")).toBe("this minute") // clock skew never shows the future
  })
})
