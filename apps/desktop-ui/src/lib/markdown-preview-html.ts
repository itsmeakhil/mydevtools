/** Strip path separators and illegal chars, drop a trailing .html, cap length. */
export function safeFileName(raw: string): string {
  const cleaned = raw
    .replace(/\.html?$/i, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/^[.]+/, '')
    .trim()
    .slice(0, 100);
  return cleaned || 'export';
}
