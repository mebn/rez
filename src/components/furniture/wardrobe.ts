import { shade } from "../../art/color";
import { knob } from "../../art/shapes";
import type { ObjectComponent } from "../../core/types";

const WOOD = "#7b5b3f";

export const wardrobe: ObjectComponent = {
  kind: "object",
  id: "wardrobe",
  name: "Wardrobe",
  category: "bedroom",
  size: [1, 1],
  height: 84,
  solid: true,
  container: { capacity: 18, loot: "wardrobe" },
  draw(f) {
    f.groundShade(0.22);
    f.box(1, 3, 0, 31, 22, 4, shade(WOOD, 0.7));
    f.box(1, 3, 4, 31, 22, 78, WOOD);
    f.box(0, 2, 78, 32, 23, 81, shade(WOOD, 0.9));
    f.face("front", 1, 3, 4, 31, 22, 78, (ctx, w, h) => {
      ctx.strokeStyle = shade(WOOD, 0.55);
      ctx.lineWidth = 0.9;
      ctx.strokeRect(1.5, 1.5, w / 2 - 2, h - 3);
      ctx.strokeRect(w / 2 + 0.5, 1.5, w / 2 - 2, h - 3);
      ctx.strokeStyle = "rgba(255,230,190,0.12)";
      ctx.strokeRect(4, 5, w / 2 - 7, h - 10);
      ctx.strokeRect(w / 2 + 3, 5, w / 2 - 7, h - 10);
      knob(ctx, w / 2 - 2.5, h * 0.48);
      knob(ctx, w / 2 + 2.5, h * 0.48);
    });
  },
};
