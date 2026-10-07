import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";

const BODY = "#d6d2c4";

export const stove: ObjectComponent = {
  kind: "object",
  id: "stove",
  name: "Stove",
  category: "kitchen",
  size: [1, 1],
  height: 50,
  solid: true,
  occludes: false,
  container: { capacity: 8, loot: "oven", label: "Oven" },
  draw(f) {
    f.groundShade(0.2);
    f.box(1, 3, 0, 31, 29, 37, BODY, { edge: shade(BODY, 0.5) });
    f.face("front", 1, 3, 0, 31, 29, 37, (ctx, w, h) => {
      ctx.fillStyle = "#2e2c29";
      ctx.fillRect(4, 10, w - 8, h - 16);
      ctx.fillStyle = "rgba(120,110,90,0.35)";
      ctx.fillRect(7, 14, w - 14, h - 26);
      ctx.fillStyle = "#9b978c";
      ctx.fillRect(5, 6, w - 10, 1.8);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = "#3a3936";
        ctx.beginPath();
        ctx.arc(6 + i * ((w - 12) / 3), 2.8, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    f.top(1, 3, 31, 29, 37, (ctx, w, d) => {
      ctx.fillStyle = "#2a2927";
      ctx.fillRect(2, 2, w - 4, d - 4);
      for (const [x, y, r] of [[8, 8, 4.2], [w - 8, 8, 3.4], [8, d - 8, 3.4], [w - 8, d - 8, 4.2]]) {
        ctx.strokeStyle = "#6a6862";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    // back panel
    f.box(1, 2, 37, 31, 6, 46, BODY, { edge: shade(BODY, 0.5) });
  },
};
