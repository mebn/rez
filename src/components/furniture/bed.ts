import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";

const WOOD = "#6f4f35";
const BLANKET = "#4f6585";

export const bed: ObjectComponent = {
  kind: "object",
  id: "bed",
  name: "Bed",
  category: "bedroom",
  size: [1, 2],
  height: 44,
  solid: true,
  occludes: false,
  container: { capacity: 10, loot: "bed", label: "Under the Bed" },
  draw(f) {
    const D = f.D;
    f.groundShade(0.22);
    f.box(1, 2, 0, 31, D - 1, 12, WOOD);
    f.box(2, 4, 12, 30, D - 2, 19, "#e6e1d3");
    f.box(5, 6, 19, 27, 17, 24, "#efebdf", { edge: shade("#efebdf", 0.7) });
    f.box(1.5, 22, 12, 30.5, D - 1.5, 20.5, BLANKET);
    f.top(1.5, 22, 30.5, D - 1.5, 20.5, (ctx, w, d) => {
      ctx.fillStyle = "#e6e1d3";
      ctx.fillRect(0, 0, w, 4);
      ctx.strokeStyle = shade(BLANKET, 0.8);
      ctx.lineWidth = 0.7;
      for (let y = 10; y < d; y += 9) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    });
    // headboard
    f.box(0, 0, 0, 32, 4, 34, WOOD);
    f.box(0, D - 3, 0, 32, D, 16, WOOD);
  },
};
