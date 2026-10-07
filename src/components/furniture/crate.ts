import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";

const WOOD = "#a0804f";

export const crate: ObjectComponent = {
  kind: "object",
  id: "crate",
  name: "Wooden Crate",
  category: "garage",
  size: [1, 1],
  height: 30,
  solid: true,
  occludes: false,
  container: { capacity: 25, loot: "crate" },
  draw(f) {
    f.groundShade(0.2);
    f.box(4, 4, 0, 28, 28, 24, WOOD);
    const slats = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.strokeStyle = shade(WOOD, 0.55);
      ctx.lineWidth = 0.8;
      for (let y = 6; y < h; y += 6) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = shade(WOOD, 0.75);
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, w - 2, h - 2);
      ctx.beginPath();
      ctx.moveTo(2, h - 2);
      ctx.lineTo(w - 2, 2);
      ctx.stroke();
    };
    for (const s of ["front", "back", "left", "right"] as const) f.face(s, 4, 4, 0, 28, 28, 24, slats);
  },
};
