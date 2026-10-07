import type { FloorComponent } from "../../core/types";
import { base } from "./_util";

/** Asphalt with the yellow centre dash; the dash runs along the tile's x axis. */
export const roadLine: FloorComponent = {
  kind: "floor",
  id: "road_line",
  name: "Road (center line)",
  category: "floor",
  variants: 1,
  draw(ctx, _variant, seed) {
    base(ctx, "#4b4b4d", ["#414143", "#57575a", "#3a3a3c"], seed, 300, 0.8);
    ctx.fillStyle = "#c2a23e";
    ctx.fillRect(4, -0.6, 22, 1.6);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(8, -0.6, 2, 1.6);
  },
};
