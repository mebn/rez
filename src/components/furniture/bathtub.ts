import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";

const PORCELAIN = "#e1ded4";

export const bathtub: ObjectComponent = {
  kind: "object",
  id: "bathtub",
  name: "Bathtub",
  category: "bathroom",
  size: [2, 1],
  height: 34,
  solid: true,
  occludes: false,
  draw(f) {
    f.groundShade(0.2);
    f.box(1, 2, 0, f.W - 1, 30, 22, PORCELAIN, { edge: shade(PORCELAIN, 0.6) });
    f.top(1, 2, f.W - 1, 30, 22, (ctx, w, d) => {
      ctx.fillStyle = "#b9bcb6";
      ctx.beginPath();
      ctx.roundRect(4, 4, w - 8, d - 8, 7);
      ctx.fill();
      ctx.fillStyle = "#8fa4a7";
      ctx.beginPath();
      ctx.roundRect(6, 6, w - 12, d - 12, 6);
      ctx.fill();
      ctx.fillStyle = "#555";
      ctx.beginPath();
      ctx.arc(10, d / 2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
    f.box(5, 13, 22, 8, 17, 30, "#b8bcbd");
  },
};
