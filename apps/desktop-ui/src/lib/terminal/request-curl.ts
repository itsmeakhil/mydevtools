/** Every string inside `value` passed through `fn` (objects and arrays rebuilt, other values kept). */
export function mapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === "string") return fn(value) as T
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn)) as T
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn)])) as T
  return value
}

/** The command a terminal runs for a request handed over as `$REQUEST_CURL` (so history shows only this). */
export const RUN_REQUEST = 'eval "$REQUEST_CURL"'
