import { drawers } from "../../art/shapes";
import type { ObjectComponent } from "../../core/types";

const WOOD = "#866244";

export const dresser: ObjectComponent = {
  kind: "object",
  id: "dresser",
  name: "Dresser",
  category: "bedroom",
  size: [2, 1],
  height: 44,
  solid: true,
  occludes: false,
  container: { capacity: 12, loot: "dresser" },
  draw(f) {
    f.groundShade(0.2);
    f.box(2, 4, 0, f.W - 2, 22, 36, WOOD);
    f.box(1, 3, 36, f.W - 1, 23, 38.5, WOOD);
    f.face("front", 2, 4, 0, f.W - 2, 22, 36, (ctx, w, h) => {
      drawers(ctx, w / 2, h, 3, WOOD);
      ctx.translate(w / 2, 0);
      drawers(ctx, w / 2, h, 3, WOOD);
    });
  },
};
