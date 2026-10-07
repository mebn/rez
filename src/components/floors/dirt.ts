import type { FloorComponent } from "../../core/types";
import { base } from "./_util";

export const dirt: FloorComponent = {
  kind: "floor",
  id: "dirt",
  name: "Dirt",
  category: "floor",
  variants: 3,
  draw(ctx, variant, seed) {
    const rng = base(ctx, ["#7a6447", "#735e43", "#806a4c"][variant], ["#6a553a", "#8d7656", "#5e4b34", "#958063"], seed, 240, 1.2);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "#9a8a70";
      ctx.beginPath();
      ctx.arc(rng.range(2, 30), rng.range(2, 30), rng.range(0.5, 1.1), 0, Math.PI * 2);
      ctx.fill();
    }
  },
};
