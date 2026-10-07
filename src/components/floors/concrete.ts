import type { FloorComponent } from "../../core/types";
import { base } from "./_util";

export const concrete: FloorComponent = {
  kind: "floor",
  id: "concrete",
  name: "Concrete",
  category: "floor",
  variants: 3,
  draw(ctx, variant, seed) {
    const rng = base(ctx, "#8b8882", ["#7f7c76", "#97948e", "#75726d"], seed, 180, 0.9);
    if (variant === 1) {
      // oil stain
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, rng.range(6, 10));
      g.addColorStop(0, "rgba(30,28,24,0.45)");
      g.addColorStop(1, "rgba(30,28,24,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 32, 32);
    }
    ctx.strokeStyle = "rgba(60,58,54,0.35)";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0, 0, 32, 32);
  },
};
