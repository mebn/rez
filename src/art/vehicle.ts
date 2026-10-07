import { LIGHT, shade } from "./color";
import type { Painter, V3 } from "./painter";

/** Body shape of a vehicle type. Lengths are in tiles, heights in px. */
export interface VehicleShape {
  length: number;
  width: number;
  /** Top of the lower body. */
  bodyH: number;
  /** Top of the cabin. */
  cabinH: number;
  /** Cabin span along the car, 0 = rear bumper, 1 = front bumper. */
  cabin: [number, number];
  /** Pickups: open bed behind the cabin. */
  bed?: boolean;
  /** Vans: glass only at the front of a tall cabin. */
  van?: boolean;
}

/** Sprite bounds for every vehicle; anchor is the centre of the car on the ground. */
export const VEHICLE_SPRITE = { w: 150, h: 110, ax: 75, ay: 66 };

const GLASS = "#3a4466";
const TIRE = "#181425";
const TRIM = "#8b9bb4";

/**
 * Draws a car as a handful of boxes rotated to `heading` (radians, 0 = +x), projected
 * isometrically. Only camera-facing faces are drawn, so convex boxes need no sorting.
 */
export function drawVehicle(p: Painter, s: VehicleShape, paint: string, heading: number): void {
  const f: [number, number] = [Math.cos(heading), Math.sin(heading)];
  const r: [number, number] = [-f[1], f[0]];
  const L = s.length / 2;
  const W = s.width / 2;
  // car-local (forward, right) in tiles -> world tiles
  const P = (fw: number, rt: number, z: number): V3 => [f[0] * fw + r[0] * rt, f[1] * fw + r[1] * rt, z];
  const edge = shade(paint, 0.45);

  /** An oriented box from fw0..fw1 (forward), rt0..rt1 (right), z0..z1. */
  const box = (fw0: number, fw1: number, rt0: number, rt1: number, z0: number, z1: number, color: string, top = shade(color, LIGHT.top), sideColor?: string) => {
    const faces: [number, number, V3[]][] = [
      [f[0], f[1], [P(fw1, rt0, z0), P(fw1, rt1, z0), P(fw1, rt1, z1), P(fw1, rt0, z1)]],
      [-f[0], -f[1], [P(fw0, rt0, z0), P(fw0, rt1, z0), P(fw0, rt1, z1), P(fw0, rt0, z1)]],
      [r[0], r[1], [P(fw0, rt1, z0), P(fw1, rt1, z0), P(fw1, rt1, z1), P(fw0, rt1, z1)]],
      [-r[0], -r[1], [P(fw0, rt0, z0), P(fw1, rt0, z0), P(fw1, rt0, z1), P(fw0, rt0, z1)]],
    ];
    for (const [nx, ny, pts] of faces) {
      // visible when the face points toward the viewer (+x +y)
      if (nx + ny <= 0.001) continue;
      const wx = Math.max(0, nx);
      const wy = Math.max(0, ny);
      const light = (LIGHT.right * wx + LIGHT.left * wy) / (wx + wy || 1);
      p.poly(pts, shade(sideColor ?? color, light), edge, 0.6);
    }
    p.poly([P(fw0, rt0, z1), P(fw1, rt0, z1), P(fw1, rt1, z1), P(fw0, rt1, z1)], top, edge, 0.6);
  };

  const wheelR = 7;
  const wheels: [number, number][] = [
    [L * 0.62, W * 0.92], [L * 0.62, -W * 0.92], [-L * 0.62, W * 0.92], [-L * 0.62, -W * 0.92],
  ];
  const near = (rt: number) => (r[0] + r[1]) * Math.sign(rt) > 0;
  const wheel = ([fw, rt]: [number, number]) =>
    box(fw - 0.2, fw + 0.2, rt - 0.09, rt + 0.09, 0, wheelR * 2, TIRE, TIRE);

  p.groundShade(0, 0, s.length * 24, s.length * 12, 0.3);
  for (const w of wheels) if (!near(w[1])) wheel(w);

  // lower body with bumpers
  box(-L, -L + 0.08, -W * 0.92, W * 0.92, 5, 12, TRIM);
  box(-L + 0.06, L - 0.06, -W, W, 6, s.bodyH, paint);
  box(L - 0.08, L, -W * 0.92, W * 0.92, 5, 12, TRIM);

  const c0 = -L + s.cabin[0] * s.length;
  const c1 = -L + s.cabin[1] * s.length;
  if (s.bed) {
    // open bed: dark floor inside low side walls
    box(-L + 0.1, c0, -W + 0.06, W - 0.06, s.bodyH, s.bodyH + 5, paint, GLASS);
  }
  if (s.van) {
    box(c0, c1 - 0.35, -W * 0.94, W * 0.94, s.bodyH, s.cabinH, paint);
    box(c1 - 0.35, c1, -W * 0.94, W * 0.94, s.bodyH, s.cabinH - 3, paint, shade(paint, LIGHT.top), GLASS);
  } else {
    box(c0, c1, -W * 0.86, W * 0.86, s.bodyH, s.cabinH, paint, shade(paint, LIGHT.top), GLASS);
  }

  // head and tail lights
  const frontVisible = f[0] + f[1] > 0;
  for (const side of [-1, 1]) {
    if (frontVisible) box(L - 0.04, L + 0.01, side * W * 0.75 - 0.1, side * W * 0.75 + 0.1, 12, 17, "#fee761");
    else box(-L - 0.01, -L + 0.04, side * W * 0.75 - 0.1, side * W * 0.75 + 0.1, 12, 17, "#e43b44");
  }
  for (const w of wheels) if (near(w[1])) wheel(w);
}
