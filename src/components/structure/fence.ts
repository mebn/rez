import { shade } from "../../art/color";
import type { EdgeComponent } from "../../core/types";

export const fencePicket: EdgeComponent = {
  kind: "edge",
  id: "fence_picket",
  name: "Picket Fence",
  category: "fence",
  height: 34,
  states: ["default"],
  blocksMovement: () => true,
  draw(f) {
    const c = "#d6d0bf";
    const parts: [number, number, number, number, number, number, string][] = [];
    // rails behind pickets
    parts.push([0, -1.5, 9, 32, -0.5, 12, shade(c, 0.85)]);
    parts.push([0, -1.5, 21, 32, -0.5, 24, shade(c, 0.85)]);
    f.boxes(parts);
    for (let u = 1; u < 32; u += 5) {
      f.box(u, -0.5, 0, u + 3, 0.8, 28, c);
      // pointed top
      const a = f.w(u, 0.8, 28);
      const b = f.w(u + 3, 0.8, 28);
      const t = f.w(u + 1.5, 0.8, 32);
      f.p.poly([a, b, t], shade(c, 0.95), shade(c, 0.5), 0.5);
    }
    f.box(-1.5, -1.5, 0, 1.5, 1.5, 32, shade(c, 0.95));
  },
};

export const fenceWood: EdgeComponent = {
  kind: "edge",
  id: "fence_wood",
  name: "Wooden Privacy Fence",
  category: "fence",
  height: 56,
  states: ["default"],
  blocksMovement: () => true,
  draw(f) {
    const c = "#86684a";
    f.box(-1, -1, 0, 33, 1, 52, c);
    f.face("front", -1, -1, 0, 33, 1, 52, (ctx, w, h) => {
      for (let x = 0; x < w; x += 4.5) {
        ctx.fillStyle = `rgba(40,25,10,${0.25 + ((x * 13) % 7) / 40})`;
        ctx.fillRect(x, 0, 0.6, h);
      }
      ctx.fillStyle = "rgba(40,25,10,0.3)";
      ctx.fillRect(0, 10, w, 2);
      ctx.fillRect(0, h - 12, w, 2);
    });
    f.box(-2, -2, 0, 2, 2, 56, shade(c, 0.85));
  },
};
