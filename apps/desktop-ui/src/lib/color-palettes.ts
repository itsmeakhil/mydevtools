import Color from 'color';
import type { ColorInstance } from 'color';

/** Same hue, stepped lightness (good for UI scales). */
export function monochromePalette(c: ColorInstance): ColorInstance[] {
  const h = Number.isFinite(c.hue()) ? c.hue() : 0;
  const s = c.saturationl();
  return [92, 78, 62, 48, 34, 22, 14].map((l) => Color.hsl(h, s, l));
}

export function complementaryPalette(c: ColorInstance): ColorInstance[] {
  return [c, c.rotate(180)];
}

export function triadicPalette(c: ColorInstance): ColorInstance[] {
  return [c, c.rotate(120), c.rotate(240)];
}

export function analogousPalette(c: ColorInstance): ColorInstance[] {
  return [c.rotate(-28), c, c.rotate(28)];
}

export function splitComplementaryPalette(c: ColorInstance): ColorInstance[] {
  return [c, c.rotate(150), c.rotate(210)];
}

export function squarePalette(c: ColorInstance): ColorInstance[] {
  return [c, c.rotate(90), c.rotate(180), c.rotate(270)];
}

export const PALETTE_GROUPS = [
  { id: 'monochrome', label: 'Shades', fn: monochromePalette },
  { id: 'complementary', label: 'Complementary', fn: complementaryPalette },
  { id: 'triadic', label: 'Triadic', fn: triadicPalette },
  { id: 'analogous', label: 'Analogous', fn: analogousPalette },
  { id: 'split', label: 'Split comp.', fn: splitComplementaryPalette },
  { id: 'square', label: 'Square', fn: squarePalette },
] as const;
