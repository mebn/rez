import { shade } from "../../art/color";
import { drawers } from "../../art/shapes";
import type { ObjectComponent } from "../../core/types";

const WOOD = "#6e5039";

export const tv: ObjectComponent = {
  kind: "object",
  id: "tv",
  name: "Television",
  category: "living",
  size: [1, 1],
  height: 50,
  solid: true,
  occludes: false,
  container: { capacity: 6, loot: "tv_stand", label: "TV Stand" },
  draw(f) {
    f.groundShade(0.2);
    f.box(2, 5, 0, 30, 27, 20, WOOD);
    f.face("front", 2, 5, 0, 30, 27, 20, (ctx, w, h) => drawers(ctx, w, h, 2, WOOD));
    // CRT
    f.box(6, 7, 20, 26, 21, 26, "#2f2e2c");
    f.box(5, 8, 20, 27, 24, 42, "#3a3936", { edge: "#1c1b1a" });
    f.face("front", 5, 8, 20, 27, 24, 42, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#4e5a5e");
      g.addColorStop(1, "#1f2628");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(2, 2, w - 6, h - 4, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(4, 4, (w - 10) * 0.4, 2);
      ctx.fillStyle = "#7e7a70";
      ctx.fillRect(w - 3, 5, 1.6, 1.6);
      ctx.fillRect(w - 3, 9, 1.6, 1.6);
    });
    // antenna
    const a = f.w(16, 14, 42);
    for (const [du, dz] of [[-7, 13], [7, 12]]) {
      const b = f.w(16 + du, 13, 42 + dz);
      f.p.poly([a, b, b], undefined, shade("#888", 0.7), 0.8);
    }
  },
};
