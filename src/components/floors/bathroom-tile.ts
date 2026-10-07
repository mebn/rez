import type { FloorComponent } from "../../core/types";
import { base } from "./_util";

export const bathroomTile: FloorComponent = {
  kind: "floor",
  id: "bathroom_tile",
  name: "Bathroom Tile",
  category: "floor",
  variants: 1,
  draw(ctx, _v, seed) {
    base(ctx, "#b9c4c4", ["#aab5b5", "#c7d1d0"], seed, 80, 0.8);
    ctx.strokeStyle = "#8b9898";
    ctx.lineWidth = 0.6;
    for (let i = 0; i <= 32; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, -1);
      ctx.lineTo(i, 33);
      ctx.moveTo(-1, i);
      ctx.lineTo(33, i);
      ctx.stroke();
    }
  },
};
