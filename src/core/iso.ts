/** Isometric projection. World x/y are in tiles, z is in pixels (up). Screen output is world pixels. */
export const TILE_W = 64;
export const TILE_H = 32;
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;

export function isoX(x: number, y: number): number {
  return (x - y) * HALF_W;
}

export function isoY(x: number, y: number, z = 0): number {
  return (x + y) * HALF_H - z;
}

/** Screen (world px) back to tile coordinates on the ground plane. */
export function screenToTile(sx: number, sy: number): { x: number; y: number } {
  const a = sx / HALF_W;
  const b = sy / HALF_H;
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
