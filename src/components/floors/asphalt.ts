import type { FloorComponent } from "../../core/types";
import { base } from "./_util";

export const asphalt: FloorComponent = {
  kind: "floor",
  id: "asphalt",
  name: "Asphalt",
  category: "floor",
  variants: 3,
  draw(ctx, variant, seed) {
    const rng = base(ctx, "#4b4b4d", ["#414143", "#57575a", "#3a3a3c", "#5f5e5c"], seed, 300, 0.8);
    if (variant === 2) {
      // crack
      ctx.strokeStyle = "#2f2f31";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      let x = rng.range(4, 28);
      let y = rng.range(4, 10);
      ctx.moveTo(x, y);
      for (let i = 0; i < 5; i++) {
        x += rng.range(-3, 3);
        y += rng.range(2, 5);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },
};
