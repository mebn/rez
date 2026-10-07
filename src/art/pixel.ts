/**
 * 8-bit look: every rasterised sprite and icon is snapped to a fixed palette with hard
 * (1-bit) alpha, so gradients, anti-aliasing and soft noise collapse into flat pixel art.
 */

/** ENDESGA 32. Swap this list to restyle the whole game. */
export const PALETTE = [
  "#be4a2f", "#d77643", "#ead4aa", "#e4a672", "#b86f50", "#733e39", "#3e2731", "#a22633",
  "#e43b44", "#f77622", "#feae34", "#fee761", "#63c74d", "#3e8948", "#265c42", "#193c3e",
  "#124e89", "#0099db", "#2ce8f5", "#ffffff", "#c0cbdc", "#8b9bb4", "#5a6988", "#3a4466",
  "#262b44", "#181425", "#ff0044", "#68386c", "#b55088", "#f6757a", "#e8b796", "#c28569",
];

/** Darkest palette entry, used for outlines and dithered shadows. */
export const INK = "#181425";

/** Pixels below this alpha are dropped, the rest become fully opaque. Low so tiles never gap. */
const ALPHA_CUT = 64;

const RGB = PALETTE.map((h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
});
const nearestCache = new Map<number, number>();

/** Index of the perceptually nearest palette colour (redmean distance). */
function nearest(r: number, g: number, b: number): number {
  const key = (r << 16) | (g << 8) | b;
  let best = nearestCache.get(key);
  if (best !== undefined) return best;
  let bestD = Infinity;
  best = 0;
  for (let i = 0; i < RGB.length; i++) {
    const [pr, pg, pb] = RGB[i];
    const rm = (r + pr) / 2;
    const dr = r - pr;
    const dg = g - pg;
    const db = b - pb;
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  nearestCache.set(key, best);
  return best;
}

/** Quantise colours to the palette and alpha to on/off, in place. Expects straight (non-premultiplied) alpha. */
export function pixelize(img: ImageData): ImageData {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < ALPHA_CUT) {
      d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
      continue;
    }
    const [r, g, b] = RGB[nearest(d[i], d[i + 1], d[i + 2])];
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = 255;
  }
  return img;
}
