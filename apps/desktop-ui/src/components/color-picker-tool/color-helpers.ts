import Color from 'color';
import type { ColorInstance } from 'color';

export const DEFAULT_HEX = '#6366f1';

export function normalizeHex(raw: string): string {
  let v = raw.trim();
  if (!v.startsWith('#')) v = `#${v}`;
  const m3 = /^#([0-9a-f]{3})$/i.exec(v);
  if (m3) {
    const [, x] = m3;
    v = `#${x![0]}${x![0]}${x![1]}${x![1]}${x![2]}${x![2]}`;
  }
  return v.toLowerCase();
}

export function parseHex(raw: string): string | null {
  try {
    const n = normalizeHex(raw);
    Color(n);
    return n;
  } catch {
    return null;
  }
}

export function safeHue(c: ColorInstance): number {
  const h = c.hue();
  return Number.isFinite(h) ? Math.round(((h % 360) + 360) % 360) : 0;
}

export function channelsFromHex(hx: string) {
  const col = Color(hx);
  return {
    r: Math.round(col.red()),
    g: Math.round(col.green()),
    b: Math.round(col.blue()),
    h: safeHue(col),
    s: Math.round(col.saturationl()),
    l: Math.round(col.lightness()),
  };
}
