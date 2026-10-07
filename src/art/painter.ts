import { HALF_H, HALF_W } from "../core/iso";
import { LIGHT, shade } from "./color";
import { INK } from "./pixel";

/** Sprites are rasterised at this multiple of world pixels. 1 keeps the chunky 8-bit pixel grid. */
export const SS = 1;

export type V3 = [number, number, number];

export function isoVec(x: number, y: number, z: number): [number, number] {
  return [(x - y) * HALF_W, (x + y) * HALF_H - z];
}

export interface BoxStyle {
  /** Override top colour (otherwise base shaded). */
  top?: string;
  left?: string;
  right?: string;
  /** Edge line colour, false for none. */
  edge?: string | false;
}

/**
 * Draws in world-pixel space relative to a sprite anchor. World points are (tileX, tileY, zPx)
 * relative to the sprite's footprint origin.
 */
export class Painter {
  constructor(
    readonly ctx: CanvasRenderingContext2D,
    readonly ax: number,
    readonly ay: number,
  ) {
    this.reset();
  }

  reset(): void {
    this.ctx.setTransform(SS, 0, 0, SS, this.ax * SS, this.ay * SS);
  }

  pt(p: V3): [number, number] {
    return isoVec(p[0], p[1], p[2]);
  }

  poly(pts: V3[], fill?: string, stroke?: string, lw = 0.75): void {
    const ctx = this.ctx;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const [x, y] = this.pt(p);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  }

  /** Axis-aligned world box. Only camera-facing faces (+x, +y, top) are drawn. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: string, style: BoxStyle = {}): void {
    const edge = style.edge === undefined ? shade(color, 0.45) : style.edge || undefined;
    const right = style.right ?? shade(color, LIGHT.right);
    const left = style.left ?? shade(color, LIGHT.left);
    const top = style.top ?? shade(color, LIGHT.top);
    if (y1 > y0 && z1 > z0) this.poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], right, edge);
    if (x1 > x0 && z1 > z0) this.poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], left, edge);
    if (x1 > x0 && y1 > y0) this.poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], top, edge);
  }

  /**
   * Run fn with a transform so local (s, t) maps to world o + s*u + t*v.
   * Lets art be drawn "flat" and land on any plane in the scene.
   */
  plane(o: V3, u: V3, v: V3, fn: (ctx: CanvasRenderingContext2D) => void): void {
    const [ox, oy] = this.pt(o);
    const [ux, uy] = isoVec(u[0], u[1], u[2]);
    const [vx, vy] = isoVec(v[0], v[1], v[2]);
    const ctx = this.ctx;
    ctx.save();
    ctx.transform(ux, uy, vx, vy, ox, oy);
    fn(ctx);
    ctx.restore();
  }

  /** Dithered contact shadow under a footprint: a checkerboard of dark pixels, 8-bit style. */
  groundShade(cx: number, cy: number, rx: number, ry: number, alpha = 0.22): void {
    const [x, y] = this.pt([cx, cy, 0]);
    const ctx = this.ctx;
    // shrink with alpha so faint shadows stay small
    const k = Math.min(1, 0.55 + alpha);
    const ex = rx * k;
    const ey = ry * k;
    ctx.save();
    ctx.fillStyle = INK;
    for (let j = Math.floor(-ey); j <= ey; j++)
      for (let i = Math.floor(-ex); i <= ex; i++) {
        if ((i + j) & 1 || (i * i) / (ex * ex) + (j * j) / (ey * ey) > 1) continue;
        ctx.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1);
      }
    ctx.restore();
  }
}

/** Sparse whole-pixel speckle inside the current clip/path area. Kept light for the simple 8-bit look. */
export function speckle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  colors: string[],
  count: number,
  rnd: () => number,
  size = 1,
): void {
  const n = Math.round(count * 0.25);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    const s = Math.max(1, Math.round(size));
    ctx.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), s, s);
  }
}
