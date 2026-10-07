import type { FloorComponent } from "../../core/types";
import { base } from "./_util";

export const sidewalk: FloorComponent = {
  kind: "floor",
  id: "sidewalk",
  name: "Sidewalk",
  category: "floor",
  variants: 2,
  draw(ctx, variant, seed) {
    base(ctx, variant ? "#9b978e" : "#a09c93", ["#8d8980", "#aaa69d", "#85817a"], seed, 160, 0.8);
    ctx.strokeStyle = "#7d7a72";
    ctx.lineWidth = 0.7;
    ctx.strokeRect(0, 0, 32, 32);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(31, 1);
    ctx.stroke();
  },
};
