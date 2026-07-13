/**
 * Pure logic for the Chmod Calculator tool.
 *
 * Three interchangeable representations of Unix file permissions:
 *  - structured flags (PermissionFlags)
 *  - octal string   ("755", "4755")
 *  - symbolic string ("rwxr-xr-x", "rwsr-xr-x")
 */

export type PermissionClass = 'owner' | 'group' | 'others'

export interface ClassFlags {
  read: boolean
  write: boolean
  execute: boolean
}

export interface PermissionFlags {
  owner: ClassFlags
  group: ClassFlags
  others: ClassFlags
  setuid: boolean
  setgid: boolean
  sticky: boolean
}

export const PERMISSION_CLASSES: PermissionClass[] = ['owner', 'group', 'others']

export function emptyFlags(): PermissionFlags {
  return {
    owner: { read: false, write: false, execute: false },
    group: { read: false, write: false, execute: false },
    others: { read: false, write: false, execute: false },
    setuid: false,
    setgid: false,
    sticky: false,
  }
}

function classToDigit(c: ClassFlags): number {
  return (c.read ? 4 : 0) + (c.write ? 2 : 0) + (c.execute ? 1 : 0)
}

function digitToClass(d: number): ClassFlags {
  return { read: (d & 4) !== 0, write: (d & 2) !== 0, execute: (d & 1) !== 0 }
}

/**
 * Converts flags to an octal string. Emits 3 digits when no special bits are
 * set, 4 digits (leading special digit) otherwise.
 */
export function flagsToOctal(flags: PermissionFlags): string {
  const special = (flags.setuid ? 4 : 0) + (flags.setgid ? 2 : 0) + (flags.sticky ? 1 : 0)
  const body = `${classToDigit(flags.owner)}${classToDigit(flags.group)}${classToDigit(flags.others)}`
  return special > 0 ? `${special}${body}` : body
}

/**
 * Parses a 3- or 4-digit octal permission string. Returns null when invalid.
 */
export function octalToFlags(octal: string): PermissionFlags | null {
  if (typeof octal !== 'string') return null
  const trimmed = octal.trim()
  if (!/^[0-7]{3,4}$/.test(trimmed)) return null
  const digits = trimmed.split('').map((d) => parseInt(d, 8))
  const [special, ownerD, groupD, othersD] =
    digits.length === 4 ? digits : [0, digits[0], digits[1], digits[2]]
  return {
    owner: digitToClass(ownerD),
    group: digitToClass(groupD),
    others: digitToClass(othersD),
    setuid: (special & 4) !== 0,
    setgid: (special & 2) !== 0,
    sticky: (special & 1) !== 0,
  }
}

function triad(c: ClassFlags, specialBit: boolean, specialChar: 's' | 't'): string {
  const r = c.read ? 'r' : '-'
  const w = c.write ? 'w' : '-'
  let x: string
  if (specialBit) {
    x = c.execute ? specialChar : specialChar.toUpperCase()
  } else {
    x = c.execute ? 'x' : '-'
  }
  return r + w + x
}

/**
 * Converts flags to a 9-character symbolic string (e.g. "rwsr-xr-t").
 */
export function flagsToSymbolic(flags: PermissionFlags): string {
  return (
    triad(flags.owner, flags.setuid, 's') +
    triad(flags.group, flags.setgid, 's') +
    triad(flags.others, flags.sticky, 't')
  )
}

/**
 * Parses a 9-character symbolic permission string (setuid/setgid as s/S in
 * owner/group execute slots, sticky as t/T in the others slot).
 * Returns null when invalid.
 */
export function symbolicToFlags(symbolic: string): PermissionFlags | null {
  if (typeof symbolic !== 'string') return null
  const s = symbolic.trim()
  if (!/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(s)) return null

  const flags = emptyFlags()
  const classes: PermissionClass[] = ['owner', 'group', 'others']
  for (let i = 0; i < 3; i++) {
    const cls = classes[i]
    const [r, w, x] = [s[i * 3], s[i * 3 + 1], s[i * 3 + 2]]
    flags[cls].read = r === 'r'
    flags[cls].write = w === 'w'
    if (cls === 'others') {
      flags[cls].execute = x === 'x' || x === 't'
      flags.sticky = x === 't' || x === 'T'
    } else {
      flags[cls].execute = x === 'x' || x === 's'
      if (cls === 'owner') flags.setuid = x === 's' || x === 'S'
      else flags.setgid = x === 's' || x === 'S'
    }
  }
  return flags
}

export interface ChmodPreset {
  octal: string
  descriptionKey: string
}

export const CHMOD_PRESETS: ChmodPreset[] = [
  { octal: '644', descriptionKey: 'p644' },
  { octal: '755', descriptionKey: 'p755' },
  { octal: '600', descriptionKey: 'p600' },
  { octal: '700', descriptionKey: 'p700' },
  { octal: '664', descriptionKey: 'p664' },
  { octal: '775', descriptionKey: 'p775' },
  { octal: '400', descriptionKey: 'p400' },
]
