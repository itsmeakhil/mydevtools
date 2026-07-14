/**
 * Pure logic for the Favicon Generator tool: ICO container builder and
 * manifest / head snippet builders. Canvas rendering stays in the component.
 * No React, no DOM.
 */

export interface IcoImage {
  /** Square pixel size of the embedded PNG (e.g. 16, 32, 48). */
  size: number
  /** PNG-encoded image bytes. */
  png: Uint8Array
}

const ICONDIR_SIZE = 6
const ICONDIRENTRY_SIZE = 16

/**
 * Build a .ico file containing the given PNG-encoded images (modern ICO with
 * embedded PNGs, supported by all current browsers). Little-endian layout:
 * ICONDIR (reserved=0, type=1, count) followed by one ICONDIRENTRY per image
 * and the raw PNG payloads.
 */
export function buildIco(images: IcoImage[]): Uint8Array {
  if (images.length === 0) throw new Error('buildIco requires at least one image')
  if (images.length > 0xffff) throw new Error('Too many images for an ICO file')

  const headerSize = ICONDIR_SIZE + ICONDIRENTRY_SIZE * images.length
  const total = headerSize + images.reduce((sum, img) => sum + img.png.length, 0)
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)

  // ICONDIR
  view.setUint16(0, 0, true) // reserved, must be 0
  view.setUint16(2, 1, true) // type: 1 = icon
  view.setUint16(4, images.length, true)

  let offset = headerSize
  images.forEach((img, i) => {
    const entry = ICONDIR_SIZE + i * ICONDIRENTRY_SIZE
    // Width/height bytes: 0 means 256 (or larger); sizes >= 256 must be 0.
    out[entry] = img.size >= 256 ? 0 : img.size
    out[entry + 1] = img.size >= 256 ? 0 : img.size
    out[entry + 2] = 0 // color palette count (none)
    out[entry + 3] = 0 // reserved
    view.setUint16(entry + 4, 1, true) // color planes
    view.setUint16(entry + 6, 32, true) // bits per pixel
    view.setUint32(entry + 8, img.png.length, true) // bytes in resource
    view.setUint32(entry + 12, offset, true) // offset of payload
    out.set(img.png, offset)
    offset += img.png.length
  })

  return out
}

/** Sizes rendered by the generator. */
export const ICON_SIZES = [16, 32, 48, 180, 192, 512] as const

/** The subset embedded into favicon.ico. */
export const ICO_SIZES = [16, 32, 48] as const

/** site.webmanifest snippet referencing the generated icons. */
export function buildManifestSnippet(): string {
  return JSON.stringify(
    {
      name: '',
      short_name: '',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        {
          src: '/icon-512-maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      theme_color: '#ffffff',
      background_color: '#ffffff',
      display: 'standalone',
    },
    null,
    2,
  )
}

/** HTML <head> snippet referencing the generated files. */
export function buildHeadSnippet(): string {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">',
    '<link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
  ].join('\n')
}

/** File name for a generated PNG of a given size / variant. */
export function pngFileName(size: number, maskable = false): string {
  if (size === 180) return 'apple-touch-icon.png'
  return maskable ? `icon-${size}-maskable.png` : `icon-${size}.png`
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** True when the bytes start with the PNG signature. */
export function isPngBytes(bytes: Uint8Array, offset = 0): boolean {
  return PNG_MAGIC.every((b, i) => bytes[offset + i] === b)
}
