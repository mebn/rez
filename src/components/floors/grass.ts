import type { FloorComponent } from "../../core/types";
import { base } from "./_util";

const BASES = ["#66783a", "#61743a", "#6b7c3e", "#5d7036"];

export const grass: FloorComponent = {
  kind: "floor",
  id: "grass",
  name: "Grass",
  category: "floor",
  variants: 4,
  draw(ctx, variant, seed) {
    const rng = base(ctx, BASES[variant], ["#55682f", "#748843", "#4f6129", "#7e8f4a", "#5a6b33"], seed, 260, 1.1);
    // little blade tufts
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 26; i++) {
      const x = rng.range(1, 31);
      const y = rng.range(1, 31);
      ctx.strokeStyle = rng.chance(0.5) ? "#86994f" : "#4a5c27";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 0.8, y - 1.6);
      ctx.stroke();
    }
    if (variant === 3) {
      // a few tiny wildflowers
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = rng.pick(["#d8d0a0", "#c9b75a", "#b9a7c7"]);
        ctx.fillRect(rng.range(3, 29), rng.range(3, 29), 1.1, 1.1);
      }
    }
  },
};
