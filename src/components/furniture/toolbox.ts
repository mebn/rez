import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";

const RED = "#a63b31";

export const toolbox: ObjectComponent = {
  kind: "object",
  id: "toolbox",
  name: "Toolbox",
  category: "garage",
  size: [1, 1],
  height: 22,
  solid: true,
  occludes: false,
  container: { capacity: 8, loot: "toolbox" },
  draw(f) {
    f.groundShade(0.2);
    f.box(7, 10, 0, 25, 22, 10, RED, { edge: shade(RED, 0.5) });
    f.box(7, 10, 10, 25, 22, 12, shade(RED, 0.85), { edge: shade(RED, 0.5) });
    f.face("front", 7, 10, 0, 25, 22, 12, (ctx, w) => {
      ctx.fillStyle = "#c9c4b4";
      ctx.fillRect(w / 2 - 1.5, 2.5, 3, 2);
    });
    f.boxes([
      [11, 15, 12, 12.5, 17, 17, "#333"],
      [19.5, 15, 12, 21, 17, 17, "#333"],
    ]);
    f.box(11, 15, 16, 21, 17, 17.5, "#333");
  },
};
