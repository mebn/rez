import type { FloorComponent } from "../../core/types";
import { Rng } from "../../core/rng";
import { shade } from "../../art/color";

export const woodFloor: FloorComponent = {
  kind: "floor",
  id: "wood_floor",
  name: "Wood Floor",
  category: "floor",
  variants: 3,
  draw(ctx, variant, seed) {
    const rng = new Rng(seed);
    const baseCol = ["#8a6340", "#86603e", "#8e6844"][variant];
    // planks run along u, 4 per tile with staggered joints
    for (let row = 0; row < 4; row++) {
      const c = shade(baseCol, rng.range(0.9, 1.08));
      ctx.fillStyle = c;
      ctx.fillRect(-1, row * 8, 34, 8);
      ctx.strokeStyle = "rgba(255,230,190,0.07)";
      ctx.lineWidth = 0.4;
      for (let g = 0; g < 3; g++) {
        const y = row * 8 + rng.range(1, 7);
        ctx.beginPath();
        ctx.moveTo(-1, y);
        ctx.bezierCurveTo(10, y + rng.range(-1, 1), 20, y + rng.range(-1, 1), 33, y);
        ctx.stroke();
      }
      ctx.fillStyle = "#4b331e";
      ctx.fillRect(-1, row * 8 + 7.5, 34, 0.6);
      const j = (row * 13 + variant * 7) % 32;
      ctx.fillRect(j, row * 8, 0.6, 8);
    }
  },
};
