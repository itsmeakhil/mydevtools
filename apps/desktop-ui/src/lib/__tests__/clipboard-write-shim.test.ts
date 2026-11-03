import { routeTextWrite } from "@/lib/desktop/clipboard-write-shim"

const item = (data: Promise<string>, types = ["text/plain"]) => ({
  types,
  getType: (t: string) => (t === "text/plain" ? data.then((s) => new Blob([s], { type: t })) : Promise.reject(new Error("no type"))),
})

describe("routeTextWrite", () => {
  it("writes the text through writeText once the deferred text resolves", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    let resolve!: (s: string) => void
    const p = routeTextWrite([item(new Promise((r) => (resolve = r)))], writeText)
    expect(writeText).not.toHaveBeenCalled()
    resolve("copied")
    await p
    expect(writeText).toHaveBeenCalledWith("copied")
  })

  it("rejects with NotAllowedError (and never writes) when the deferred text is cancelled", async () => {
    const writeText = jest.fn()
    const p = routeTextWrite([item(Promise.reject(new Error("Canceled")))], writeText)
    await expect(p).rejects.toMatchObject({ name: "NotAllowedError" })
    expect(writeText).not.toHaveBeenCalled()
  })

  it("returns null for anything that is not a single plain-text item, so the real write() handles it", () => {
    const writeText = jest.fn()
    expect(routeTextWrite([item(Promise.resolve("a"), ["text/html"])], writeText)).toBeNull()
    expect(routeTextWrite([item(Promise.resolve("a")), item(Promise.resolve("b"))], writeText)).toBeNull()
  })
})
