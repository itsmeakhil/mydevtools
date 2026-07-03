/** RFC 9562 §5.9 nil UUID — all bits zero. */
export const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export interface FormatUuidOptions {
  /** Uppercase the whole identifier. Applies to UUIDs and ULIDs alike. */
  uppercase?: boolean;
  /** Keep hyphens (default). `false` strips them — a no-op for ULIDs, which have none. */
  hyphens?: boolean;
}

/** Display formatting for a generated id. Pure; never mutates stored ids. */
export function formatUuid(id: string, opts: FormatUuidOptions = {}): string {
  const { uppercase = false, hyphens = true } = opts;
  let out = hyphens ? id : id.replaceAll('-', '');
  if (uppercase) out = out.toUpperCase();
  return out;
}

/** Pretty-printed JSON array of ids, for the "Copy as JSON" action. */
export function idsAsJsonArray(ids: string[]): string {
  return JSON.stringify(ids, null, 2);
}
