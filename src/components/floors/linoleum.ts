import type { FloorComponent } from "../../core/types";
import { base } from "./_util";

/** Store floor: large pale tiles. */
export const linoleum: FloorComponent = {
  kind: "floor",
  id: "linoleum",
  name: "Store Linoleum",
  category: "floor",
  variants: 2,
  draw(ctx, variant, seed) {
    base(ctx, variant ? "#c4bea9" : "#bdb7a2", ["#b2ac98", "#cac4b0", "#a9a38f"], seed, 120, 0.8);
    ctx.strokeStyle = "rgba(90,85,70,0.4)";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0, 0, 32, 32);
  },
};
