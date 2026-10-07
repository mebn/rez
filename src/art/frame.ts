import type { Facing } from "../core/types";
import { LIGHT, shade } from "./color";
import { type BoxStyle, Painter, type V3 } from "./painter";

export type LocalSide = "front" | "back" | "left" | "right" | "top";

const FACING_VEC: Record<Facing, [number, number]> = {
  S: [0, 1],
  E: [1, 0],
  N: [0, -1],
  W: [-1, 0],
};

/** Local units per tile. 1 unit is roughly 1 screen pixel. */
export const U = 32;

/**
 * Object-local drawing frame. Components draw once in "front-relative" coordinates and the
 * frame rotates the result for any facing:
 *   u: 0..W, left to right as seen by someone looking at the front
 *   v: 0..D, back to front
 *   z: height in px
 */
export class Frame {
  readonly W: number;
  readonly D: number;
  /** World footprint size in tiles after rotation. */
  readonly wx: number;
  readonly wy: number;
  private readonly n: [number, number];
  private readonly r: [number, number];
  private readonly ox: number;
  private readonly oy: number;

  constructor(
    readonly p: Painter,
    width: number,
    depth: number,
    readonly facing: Facing,
  ) {
    this.W = width * U;
    this.D = depth * U;
    const swap = facing === "E" || facing === "W";
    this.wx = swap ? depth : width;
    this.wy = swap ? width : depth;
    this.n = FACING_VEC[facing];
    this.r = [this.n[1], -this.n[0]];
    this.ox = this.r[0] < 0 || this.n[0] < 0 ? this.wx : 0;
    this.oy = this.r[1] < 0 || this.n[1] < 0 ? this.wy : 0;
  }

  get ctx(): CanvasRenderingContext2D {
    return this.p.ctx;
  }

  w(u: number, v: number, z: number): V3 {
    const [n, r] = [this.n, this.r];
    return [this.ox + (r[0] * u + n[0] * v) / U, this.oy + (r[1] * u + n[1] * v) / U, z];
  }

  private normal(side: LocalSide): [number, number] {
    const [n, r] = [this.n, this.r];
    switch (side) {
      case "front": return n;
      case "back": return [-n[0], -n[1]];
      case "right": return r;
      case "left": return [-r[0], -r[1]];
      default: return [0, 0];
    }
  }

  /** Whether a local face points at the camera. */
  visible(side: LocalSide): boolean {
    if (side === "top") return true;
    const [x, y] = this.normal(side);
    return x > 0 || y > 0;
  }

  private aabb(u0: number, v0: number, u1: number, v1: number): [number, number, number, number] {
    const a = this.w(u0, v0, 0);
    const b = this.w(u1, v1, 0);
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  }

  box(u0: number, v0: number, z0: number, u1: number, v1: number, z1: number, color: string, style?: BoxStyle): void {
    const [x0, y0, x1, y1] = this.aabb(u0, v0, u1, v1);
    this.p.box(x0, y0, z0, x1, y1, z1, color, style);
  }

  /**
   * Draw on a vertical face of a local box. fn receives a flat (w x h) canvas where (0,0) is the
   * top-left as seen by someone looking at that face. Skipped if the face points away.
   */
  face(
    side: Exclude<LocalSide, "top">,
    u0: number, v0: number, z0: number, u1: number, v1: number, z1: number,
    fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  ): boolean {
    if (!this.visible(side)) return false;
    const [x0, y0, x1, y1] = this.aabb(u0, v0, u1, v1);
    const [nx] = this.normal(side);
    const h = z1 - z0;
    if (nx > 0) {
      // +x face: left-to-right on screen runs toward -y
      this.p.plane([x1, y1, z1], [0, -1 / U, 0], [0, 0, -1], (ctx) => fn(ctx, (y1 - y0) * U, h));
    } else {
      // +y face: left-to-right runs toward +x
      this.p.plane([x0, y1, z1], [1 / U, 0, 0], [0, 0, -1], (ctx) => fn(ctx, (x1 - x0) * U, h));
    }
    return true;
  }

  /** Draw on a horizontal plane at height z in local (u, v) coords (v = back to front). */
  top(u0: number, v0: number, u1: number, v1: number, z: number, fn: (ctx: CanvasRenderingContext2D, w: number, d: number) => void): void {
    const o = this.w(u0, v0, z);
    const [n, r] = [this.n, this.r];
    this.p.plane(o, [r[0] / U, r[1] / U, 0], [n[0] / U, n[1] / U, 0], (ctx) => fn(ctx, u1 - u0, v1 - v0));
  }

  /** Draw several local boxes back-to-front (sorted by world depth). */
  boxes(list: [number, number, number, number, number, number, string, BoxStyle?][]): void {
    const depth = (b: (typeof list)[number]) => {
      const c = this.w((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, 0);
      return c[0] + c[1];
    };
    [...list].sort((a, b) => depth(a) - depth(b)).forEach((b) => this.box(b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7]));
  }

  /** Light factor for a local side, for hand-shading details drawn on faces. */
  light(side: Exclude<LocalSide, "top">): number {
    const [nx] = this.normal(side);
    return nx > 0 ? LIGHT.right : LIGHT.left;
  }

  /** Base colour shaded for a face. */
  lit(color: string, side: LocalSide): string {
    if (side === "top") return shade(color, LIGHT.top);
    return shade(color, this.light(side));
  }

  groundShade(alpha = 0.22): void {
    this.p.groundShade(this.wx / 2, this.wy / 2, (this.wx + this.wy) * 18, (this.wx + this.wy) * 9, alpha);
  }
}
