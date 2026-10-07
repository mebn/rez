import type { ObjectComponent } from "../../core/types";
import { drawCounterBase } from "./kitchen-counter";

export const kitchenSink: ObjectComponent = {
  kind: "object",
  id: "kitchen_sink",
  name: "Kitchen Sink",
  category: "kitchen",
  size: [1, 1],
  height: 50,
  solid: true,
  occludes: false,
  container: { capacity: 10, loot: "sink", label: "Under the Sink" },
  draw(f) {
    drawCounterBase(f);
    f.top(0, 0, f.W, f.D, 38.5, (ctx, w, d) => {
      ctx.fillStyle = "#9ea3a4";
      ctx.beginPath();
      ctx.roundRect(5, 9, w - 10, d - 13, 3);
      ctx.fill();
      ctx.fillStyle = "#6f7576";
      ctx.beginPath();
      ctx.roundRect(7, 11, w - 14, d - 17, 2);
      ctx.fill();
      ctx.fillStyle = "#3f4445";
      ctx.beginPath();
      ctx.arc(w / 2, d / 2 + 2, 1.3, 0, Math.PI * 2);
      ctx.fill();
    });
    // faucet
    f.box(14.5, 3, 38.5, 17.5, 6, 46, "#b8bcbd");
    f.box(15, 6, 44, 17, 12, 46, "#b8bcbd");
  },
};
