import { shade } from "../../art/color";
import type { Frame } from "../../art/frame";
import type { EdgeComponent } from "../../core/types";

export const WALL_H = 92;
export const WALL_T = 2; // half thickness in local units

export interface WallStyle {
  /** Suffix used for component ids: wall_<key>, window_<key>. */
  key: string;
  name: string;
  color: string;
  cap: string;
  /** Paints the visible face (w x h, top-left origin). */
  paint(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}

/** Paints a wall slab between z0 and z1 including the face texture and end caps. */
export function wallSlab(f: Frame, style: WallStyle, u0: number, u1: number, z0: number, z1: number): void {
  f.box(u0, -WALL_T, z0, u1, WALL_T, z1, style.color, { top: style.cap, edge: shade(style.color, 0.55) });
  f.face("front", u0, -WALL_T, z0, u1, WALL_T, z1, (ctx, w, h) => {
    // paint in full-wall coordinates so textures line up across slabs
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.translate(-(u0 + WALL_T), -(WALL_H - z1));
    style.paint(ctx, 36, WALL_H);
    ctx.restore();
    // darken with the face light so painted textures stay shaded
    ctx.fillStyle = `rgba(0,0,0,${1 - f.light("front")})`;
    ctx.fillRect(0, 0, w, h);
  });
}

export function makeWall(style: WallStyle): EdgeComponent {
  return {
    kind: "edge",
    id: `wall_${style.key}`,
    name: `${style.name} Wall`,
    category: "wall",
    height: WALL_H,
    states: ["default"],
    blocksMovement: () => true,
    draw(f) {
      wallSlab(f, style, -WALL_T, 32 + WALL_T, 0, WALL_H);
    },
  };
}

export function makeWindow(style: WallStyle): EdgeComponent {
  return {
    kind: "edge",
    id: `window_${style.key}`,
    name: `${style.name} Window`,
    category: "window",
    height: WALL_H,
    states: ["default"],
    blocksMovement: () => true,
    draw(f) {
      const [lo, hi] = [32, 72];
      const frame = "#d9d4c4";
      wallSlab(f, style, -WALL_T, 5, 0, WALL_H);
      wallSlab(f, style, 5, 27, 0, lo);
      wallSlab(f, style, 5, 27, hi, WALL_H);
      // glass
      f.face("front", 5, -0.5, lo, 27, 0.5, hi, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, "rgba(170,200,210,0.55)");
        g.addColorStop(0.5, "rgba(120,150,165,0.45)");
        g.addColorStop(1, "rgba(170,200,210,0.6)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w * 0.2, h * 0.8);
        ctx.lineTo(w * 0.55, h * 0.15);
        ctx.stroke();
      });
      // sill and frame
      f.box(4, -WALL_T - 1, lo - 2, 28, WALL_T + 2.5, lo, frame);
      f.box(15, -0.6, lo, 17, 0.6, hi, frame);
      wallSlab(f, style, 27, 32 + WALL_T, 0, WALL_H);
      f.face("front", 5, -WALL_T, lo, 27, WALL_T, hi, (ctx, w, h) => {
        ctx.strokeStyle = shade(frame, 0.8);
        ctx.lineWidth = 1.6;
        ctx.strokeRect(0.8, 0.8, w - 1.6, h - 1.6);
      });
    },
  };
}
