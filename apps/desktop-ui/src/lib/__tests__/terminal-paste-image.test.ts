import { blobToBase64, imageTooLarge, MAX_IMAGE_BYTES, pngIn } from "@/lib/terminal/paste-image"

describe("paste image", () => {
  it("encodes blobs as base64", async () => {
    expect(await blobToBase64(new Blob([new Uint8Array([1, 2, 3])]))).toBe("AQID")
  })
  it("refuses images over 20 MiB", () => {
    expect(MAX_IMAGE_BYTES).toBe(20 * 1024 * 1024)
    expect(imageTooLarge({ size: MAX_IMAGE_BYTES })).toBe(false)
    expect(imageTooLarge({ size: MAX_IMAGE_BYTES + 1 })).toBe(true)
  })
  it("picks the PNG among pasted files, nothing for text-only pastes", () => {
    const png = new File([new Uint8Array([137])], "s.png", { type: "image/png" })
    const txt = new File(["x"], "a.txt", { type: "text/plain" })
    expect(pngIn([txt, png])).toBe(png)
    expect(pngIn([txt])).toBeUndefined()
    expect(pngIn(undefined)).toBeUndefined()
  })
})
