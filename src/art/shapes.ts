import { LIGHT, shade } from "./color";
import type { Painter } from "./painter";

/** Vertical cylinder centred on world (cx, cy). r is in local units (1/32 tile). */
export function cylinder(p: Painter, cx: number, cy: number, r: number, z0: number, z1: number, color: string, topColor?: string): void {
  const [x, yb] = p.pt([cx, cy, z0]);
  const [, yt] = p.pt([cx, cy, z1]);
  const rx = r * Math.SQRT2;
  const ry = rx / 2;
  const ctx = p.ctx;
  const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, shade(color, LIGHT.left * 1.05));
  g.addColorStop(0.45, shade(color, 0.95));
  g.addColorStop(1, shade(color, LIGHT.right * 0.92));
  ctx.beginPath();
  ctx.ellipse(x, yb, rx, ry, 0, 0, Math.PI);
  ctx.lineTo(x - rx, yt);
  ctx.ellipse(x, yt, rx, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = shade(color, 0.45);
  ctx.lineWidth = 0.75;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, yt, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = topColor ?? shade(color, LIGHT.top);
  ctx.fill();
  ctx.stroke();
}

/** Two-door cabinet front with optional top drawer. */
export function cabinetFront(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, drawer = true): void {
  const line = shade(color, 0.6);
  ctx.strokeStyle = line;
  ctx.lineWidth = 0.8;
  const top = drawer ? 9 : 2;
  if (drawer) {
    ctx.strokeRect(2, 2, w - 4, 6);
    knob(ctx, w / 2, 5);
  }
  const doors = Math.max(1, Math.round(w / 24));
  const dw = (w - 4) / doors;
  for (let i = 0; i < doors; i++) {
    ctx.strokeRect(2 + i * dw + 0.5, top, dw - 1, h - top - 2);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.strokeRect(2 + i * dw + 3, top + 3, dw - 6, h - top - 8);
    ctx.strokeStyle = line;
    knob(ctx, 2 + i * dw + (i % 2 ? 3.5 : dw - 4.5), top + 5);
  }
}

export function knob(ctx: CanvasRenderingContext2D, x: number, y: number, color = "#b8a274"): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 1.1, 0, Math.PI * 2);
  ctx.fill();
}

/** Rows of drawers. */
export function drawers(ctx: CanvasRenderingContext2D, w: number, h: number, rows: number, color: string): void {
  ctx.strokeStyle = shade(color, 0.6);
  ctx.lineWidth = 0.8;
  const rh = (h - 3) / rows;
  for (let i = 0; i < rows; i++) {
    ctx.strokeRect(2, 1.5 + i * rh, w - 4, rh - 1.5);
    knob(ctx, w / 2, 1.5 + i * rh + rh / 2 - 0.5);
  }
}
