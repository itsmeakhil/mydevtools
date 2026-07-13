/**
 * Pure logic for the EXIF Viewer & Remover tool: lossless JPEG metadata
 * stripping (segment-level rewrite) and formatting helpers. No React, no DOM.
 */

/* ------------------------------ JPEG parsing ------------------------------ */

const SOI = 0xd8
const EOI = 0xd9
const SOS = 0xda
const APP0 = 0xe0
const APP1 = 0xe1
const APP2 = 0xe2
const APP13 = 0xed
const COM = 0xfe

/** True when the buffer starts with the JPEG SOI marker (FF D8). */
export function isJpeg(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false
  const bytes = new Uint8Array(buffer)
  return bytes[0] === 0xff && bytes[1] === SOI
}

export interface StripJpegOptions {
  /** Keep the ICC color profile (APP2 "ICC_PROFILE" segments). Default true. */
  keepIcc: boolean
}

const ICC_IDENTIFIER = 'ICC_PROFILE\0'

function isIccSegment(bytes: Uint8Array, payloadStart: number): boolean {
  for (let i = 0; i < ICC_IDENTIFIER.length; i++) {
    if (bytes[payloadStart + i] !== ICC_IDENTIFIER.charCodeAt(i)) return false
  }
  return true
}

/**
 * Losslessly remove metadata from a JPEG by dropping metadata segments:
 * APP1 (EXIF/XMP), APP13 (IPTC), COM (comments), and APP2 unless it is an
 * ICC profile and `keepIcc` is set. Image data (DQT/SOF/DHT/SOS/entropy-coded
 * scan) is copied verbatim — no re-encoding. Throws on non-JPEG input.
 */
export function stripJpegMetadata(
  buffer: ArrayBuffer,
  opts: StripJpegOptions = { keepIcc: true },
): ArrayBuffer {
  if (!isJpeg(buffer)) throw new Error('Not a JPEG file')
  const bytes = new Uint8Array(buffer)
  const kept: Uint8Array[] = [bytes.subarray(0, 2)] // SOI

  let offset = 2
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error('Corrupt JPEG: expected marker')
    // Skip fill bytes (FF padding before a marker)
    let markerStart = offset
    while (bytes[markerStart + 1] === 0xff) markerStart++
    const marker = bytes[markerStart + 1]

    if (marker === EOI) {
      kept.push(bytes.subarray(markerStart, markerStart + 2))
      break
    }

    if (marker === SOS) {
      // Entropy-coded data follows; copy everything through the end verbatim.
      kept.push(bytes.subarray(markerStart))
      break
    }

    // Standalone markers without a length field (TEM, RSTn) — keep as-is.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      kept.push(bytes.subarray(markerStart, markerStart + 2))
      offset = markerStart + 2
      continue
    }

    if (markerStart + 4 > bytes.length) throw new Error('Corrupt JPEG: truncated segment')
    const length = (bytes[markerStart + 2] << 8) | bytes[markerStart + 3]
    if (length < 2 || markerStart + 2 + length > bytes.length) {
      throw new Error('Corrupt JPEG: invalid segment length')
    }
    const segmentEnd = markerStart + 2 + length
    const payloadStart = markerStart + 4

    let drop = false
    if (marker === APP1 || marker === APP13 || marker === COM) {
      drop = true
    } else if (marker === APP2) {
      drop = !(opts.keepIcc && isIccSegment(bytes, payloadStart))
    }

    if (!drop) kept.push(bytes.subarray(markerStart, segmentEnd))
    offset = segmentEnd
  }

  const total = kept.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const part of kept) {
    out.set(part, pos)
    pos += part.length
  }
  return out.buffer
}

/* --------------------------- formatting helpers --------------------------- */

/** Format an exposure time in seconds as a photographic fraction, e.g. 1/250 s. */
export function formatExposureTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return String(seconds)
  if (seconds >= 1) {
    const rounded = Math.round(seconds * 10) / 10
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded} s`
  }
  return `1/${Math.round(1 / seconds)} s`
}

/** Convert a decimal coordinate to a DMS string, e.g. 48° 51' 29.6" N. */
export function decimalToDms(value: number, axis: 'lat' | 'lon'): string {
  if (!Number.isFinite(value)) return String(value)
  const hemisphere = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W'
  const abs = Math.abs(value)
  const degrees = Math.floor(abs)
  const minutesFloat = (abs - degrees) * 60
  const minutes = Math.floor(minutesFloat)
  const seconds = (minutesFloat - minutes) * 60
  return `${degrees}° ${minutes}' ${seconds.toFixed(1)}" ${hemisphere}`
}

/** Human-readable byte size (B / KB / MB). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return String(bytes)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/** OpenStreetMap link for a coordinate pair. */
export function osmLink(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
}

/* ---------------------------- metadata grouping --------------------------- */

export type ExifValue =
  | string
  | number
  | boolean
  | Date
  | number[]
  | Uint8Array
  | { [key: string]: unknown }
  | null
  | undefined

export interface MetadataEntry {
  key: string
  value: string
}

const CAMERA_KEYS = ['Make', 'Model', 'LensModel', 'LensMake', 'LensInfo']
const EXPOSURE_KEYS = [
  'ISO',
  'FNumber',
  'ExposureTime',
  'FocalLength',
  'FocalLengthIn35mmFormat',
  'ExposureProgram',
  'ExposureCompensation',
  'Flash',
  'WhiteBalance',
  'MeteringMode',
]
const TIMESTAMP_KEYS = ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'OffsetTimeOriginal']
const SOFTWARE_KEYS = ['Software', 'Artist', 'Copyright', 'HostComputer', 'ProcessingSoftware']
const GPS_KEYS = [
  'latitude',
  'longitude',
  'GPSLatitude',
  'GPSLongitude',
  'GPSLatitudeRef',
  'GPSLongitudeRef',
  'GPSAltitude',
  'GPSAltitudeRef',
  'GPSSpeed',
  'GPSSpeedRef',
  'GPSImgDirection',
  'GPSImgDirectionRef',
  'GPSDateStamp',
  'GPSTimeStamp',
  'GPSDestBearing',
  'GPSDestBearingRef',
  'GPSHPositioningError',
]

export function formatExifValue(key: string, value: ExifValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
  if (value instanceof Uint8Array) return `[${value.length} bytes]`
  if (Array.isArray(value)) return value.map((v) => String(v)).join(', ')
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  if (typeof value === 'number') {
    if (key === 'ExposureTime') return formatExposureTime(value)
    if (key === 'FNumber') return `f/${value}`
    if (key === 'FocalLength' || key === 'FocalLengthIn35mmFormat') return `${value} mm`
    if (key === 'ISO') return `ISO ${value}`
    return String(Math.round(value * 10000) / 10000)
  }
  return String(value)
}

export interface GroupedMetadata {
  camera: MetadataEntry[]
  exposure: MetadataEntry[]
  timestamps: MetadataEntry[]
  gps: MetadataEntry[]
  software: MetadataEntry[]
  other: MetadataEntry[]
}

/** Group a flat exifr tag object into display sections. */
export function groupMetadata(tags: Record<string, ExifValue>): GroupedMetadata {
  const groups: GroupedMetadata = {
    camera: [],
    exposure: [],
    timestamps: [],
    gps: [],
    software: [],
    other: [],
  }
  const pick = (keys: string[], target: MetadataEntry[]) => {
    for (const key of keys) {
      const value = tags[key]
      if (value !== undefined && value !== null && value !== '') {
        target.push({ key, value: formatExifValue(key, value) })
      }
    }
  }
  pick(CAMERA_KEYS, groups.camera)
  pick(EXPOSURE_KEYS, groups.exposure)
  pick(TIMESTAMP_KEYS, groups.timestamps)
  pick(GPS_KEYS, groups.gps)
  pick(SOFTWARE_KEYS, groups.software)

  const claimed = new Set([
    ...CAMERA_KEYS,
    ...EXPOSURE_KEYS,
    ...TIMESTAMP_KEYS,
    ...GPS_KEYS,
    ...SOFTWARE_KEYS,
  ])
  for (const [key, value] of Object.entries(tags)) {
    if (claimed.has(key) || value === undefined || value === null || value === '') continue
    groups.other.push({ key, value: formatExifValue(key, value) })
  }
  return groups
}

/** JSON-safe serialization of raw tags (Dates → ISO strings, bytes → length note). */
export function tagsToJson(tags: Record<string, ExifValue>): string {
  return JSON.stringify(
    tags,
    (_key, value) => {
      if (value instanceof Uint8Array) return `[${value.length} bytes]`
      return value
    },
    2,
  )
}
