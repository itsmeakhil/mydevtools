/** Pasted images bigger than this are refused (Rust enforces the same limit). */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024

export const imageTooLarge = (b: { size: number }) => b.size > MAX_IMAGE_BYTES

/** The PNG among pasted files (screenshots arrive as `image/png`). */
export const pngIn = (files: ArrayLike<File> | undefined): File | undefined =>
  files ? Array.from(files).find((f) => f.type === "image/png") : undefined

export async function blobToBase64(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let bin = ""
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
