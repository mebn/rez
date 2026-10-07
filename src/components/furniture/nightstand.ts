import { cylinder, drawers } from "../../art/shapes";
import type { ObjectComponent } from "../../core/types";

const WOOD = "#7b5b3f";

export const nightstand: ObjectComponent = {
  kind: "object",
  id: "nightstand",
  name: "Nightstand",
  category: "bedroom",
  size: [1, 1],
  height: 48,
  solid: true,
  occludes: false,
  container: { capacity: 4, loot: "nightstand" },
  draw(f) {
    f.groundShade(0.15);
    f.box(6, 4, 0, 26, 22, 24, WOOD);
    f.face("front", 6, 4, 0, 26, 22, 24, (ctx, w, h) => drawers(ctx, w, h, 2, WOOD));
    const c = f.w(12, 11, 24);
    cylinder(f.p, c[0], c[1], 2.4, 24, 26, "#5b574f");
    cylinder(f.p, c[0], c[1], 0.7, 26, 36, "#a39e90");
    cylinder(f.p, c[0], c[1], 4.6, 34, 43, "#cbb98d", "#e8dcb8");
  },
};
