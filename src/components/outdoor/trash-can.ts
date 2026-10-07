import { cylinder } from "../../art/shapes";
import type { ObjectComponent } from "../../core/types";

export const trashCan: ObjectComponent = {
  kind: "object",
  id: "trash_can",
  name: "Trash Can",
  category: "outdoor",
  size: [1, 1],
  height: 36,
  solid: true,
  occludes: false,
  container: { capacity: 10, loot: "trash" },
  draw(f) {
    const c = f.w(16, 16, 0);
    f.groundShade(0.2);
    cylinder(f.p, c[0], c[1], 9, 0, 26, "#6b7072");
    cylinder(f.p, c[0], c[1], 10, 26, 29, "#5c6163");
    cylinder(f.p, c[0], c[1], 2.5, 29, 31, "#4a4e50");
    // ribs
    const ctx = f.ctx;
    const [x, y] = f.p.pt([c[0], c[1], 9]);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 0.7;
    for (const dz of [0, 8]) {
      ctx.beginPath();
      ctx.ellipse(x, y - dz, 9 * Math.SQRT2, 9 * Math.SQRT2 * 0.5, 0, 0, Math.PI);
      ctx.stroke();
    }
  },
};
