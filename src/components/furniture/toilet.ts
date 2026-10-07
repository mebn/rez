import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";

const PORCELAIN = "#e3e1d9";

export const toilet: ObjectComponent = {
  kind: "object",
  id: "toilet",
  name: "Toilet",
  category: "bathroom",
  size: [1, 1],
  height: 40,
  solid: true,
  occludes: false,
  container: { capacity: 3, loot: "toilet", label: "Toilet Tank" },
  draw(f) {
    const edge = { edge: shade(PORCELAIN, 0.6) };
    f.groundShade(0.15);
    f.box(9, 3, 12, 23, 10, 34, PORCELAIN, edge);
    f.box(8.5, 2.5, 34, 23.5, 10.5, 36, PORCELAIN, edge);
    f.box(11, 10, 0, 21, 22, 12, PORCELAIN, edge);
    f.top(8, 9, 24, 27, 13.5, (ctx, w, d) => {
      ctx.fillStyle = shade(PORCELAIN, 0.95);
      ctx.beginPath();
      ctx.ellipse(w / 2, d / 2, w / 2, d / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(PORCELAIN, 0.6);
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.fillStyle = "#9fb3b5";
      ctx.beginPath();
      ctx.ellipse(w / 2, d / 2 + 1, w / 2 - 3.5, d / 2 - 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  },
};
