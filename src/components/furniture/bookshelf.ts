import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";
import { Rng } from "../../core/rng";

const WOOD = "#7a5a3c";
const SPINES = ["#7d3b32", "#3d5a6e", "#c7b78a", "#4f6b3d", "#8a6d3a", "#5e4a6b", "#b46f40", "#2f3a3f"];

export const bookshelf: ObjectComponent = {
  kind: "object",
  id: "bookshelf",
  name: "Bookshelf",
  category: "living",
  size: [1, 1],
  height: 76,
  solid: true,
  container: { capacity: 8, loot: "bookshelf" },
  draw(f) {
    f.groundShade(0.2);
    f.box(1, 2, 0, 31, 15, 72, WOOD);
    f.face("front", 1, 2, 0, 31, 15, 72, (ctx, w, h) => {
      const rng = new Rng(42);
      ctx.fillStyle = "#2c2118";
      ctx.fillRect(2, 2, w - 4, h - 4);
      const shelves = 4;
      const sh = (h - 4) / shelves;
      for (let s = 0; s < shelves; s++) {
        const y0 = 2 + s * sh;
        let x = 3;
        while (x < w - 4) {
          const bw = rng.range(1.6, 3.2);
          const bh = rng.range(sh * 0.55, sh * 0.85);
          if (rng.chance(0.12)) {
            x += bw;
            continue;
          }
          ctx.fillStyle = rng.pick(SPINES);
          ctx.fillRect(x, y0 + sh - bh - 1, bw, bh);
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fillRect(x, y0 + sh - bh - 1, 0.5, bh);
          x += bw + 0.2;
        }
        ctx.fillStyle = shade(WOOD, 0.9);
        ctx.fillRect(1, y0 + sh - 1.2, w - 2, 1.8);
      }
    });
  },
};
