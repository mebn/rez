import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";
import { Rng } from "../../core/rng";

const BODY = "#c9c6bb";
const GOODS = ["#b5443a", "#d9b44a", "#3e6a8a", "#5f8a4c", "#e0d6bc", "#8a4f7a", "#d27c3a", "#4a4a4a"];

export const storeShelf: ObjectComponent = {
  kind: "object",
  id: "store_shelf",
  name: "Store Shelf",
  category: "store",
  size: [2, 1],
  height: 62,
  solid: true,
  container: { capacity: 30, loot: "store_shelf", label: "Shelf" },
  draw(f) {
    const W = f.W;
    const rng = new Rng(W + 3);
    f.groundShade(0.2);
    f.box(0, 12, 0, W, 16, 58, BODY);
    f.box(0, 2, 0, W, 30, 6, shade(BODY, 0.9));
    for (const z of [6, 22, 38]) {
      f.box(0, 16, z, W, 30, z + 1.5, BODY);
      let u = 1.5;
      while (u < W - 4) {
        const w = rng.range(3, 6);
        const h = rng.range(6, 12);
        const col = rng.pick(GOODS);
        if (rng.chance(0.15)) {
          u += w;
          continue;
        }
        f.box(u, 18, z + 1.5, u + w - 0.6, 27, z + 1.5 + h, col, { edge: shade(col, 0.55) });
        u += w;
      }
    }
  },
};
