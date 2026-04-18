import Color from 'color';

/** WCAG 2.1 relative luminance for sRGB (0–1). */
export function relativeLuminance(hex: string): number {
  const c = Color(hex);
  const lin = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const R = lin(c.red());
  const G = lin(c.green());
  const B = lin(c.blue());
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** WCAG contrast ratio (1–21), symmetric in the two colors. */
export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export const WCAG_THRESHOLDS = {
  aaNormal: 4.5,
  aaLarge: 3,
  aaaNormal: 7,
  aaaLarge: 4.5,
} as const;

export function meetsLevel(ratio: number, key: keyof typeof WCAG_THRESHOLDS): boolean {
  return ratio + 1e-6 >= WCAG_THRESHOLDS[key];
}
