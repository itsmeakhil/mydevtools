import { charset, contentType, lookup } from 'mime-types'

export type MimeLookupResult = {
  input: string
  normalized: string
  mimeType: string | null
  contentType: string | null
  charset: string | null
}

function normalizeCandidate(input: string): string {
  const raw = input.trim()
  if (!raw) return ''

  // `mime-types` accepts either an extension ("png") or a path/filename ("foo.png").
  // Normalize common cases so users can paste ".png" or "PNG".
  if (raw.startsWith('.') && raw.length > 1 && !raw.includes('/')) return raw.slice(1)
  return raw
}

export function lookupMimeType(input: string): MimeLookupResult {
  const normalized = normalizeCandidate(input)
  const mime = normalized ? lookup(normalized) : false

  const mimeType = typeof mime === 'string' ? mime : null
  const ct = mimeType ? contentType(mimeType) : false
  const contentTypeValue = typeof ct === 'string' ? ct : null
  const cs = mimeType ? charset(mimeType) : false
  const charsetValue = typeof cs === 'string' ? cs : null

  return {
    input,
    normalized,
    mimeType,
    contentType: contentTypeValue,
    charset: charsetValue,
  }
}

