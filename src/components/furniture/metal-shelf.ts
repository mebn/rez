import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";
import { Rng } from "../../core/rng";

const STEEL = "#7d8285";

export const metalShelf: ObjectComponent = {
  kind: "object",
  id: "metal_shelf",
  name: "Metal Shelving",
  category: "garage",
  size: [1, 1],
  height: 76,
  solid: true,
  container: { capacity: 20, loot: "garage_shelf" },
  draw(f) {
    const rng = new Rng(7);
    f.groundShade(0.18);
    const posts: [number, number, number, number, number, number, string][] = [
      [1, 2, 0, 3, 4, 72, STEEL],
      [29, 2, 0, 31, 4, 72, STEEL],
    ];
    f.boxes(posts);
    for (const z of [6, 26, 46, 66]) {
      f.box(1, 2, z, 31, 18, z + 1.5, STEEL);
      if (z > 60) continue;
      // clutter: boxes and cans
      let u = 3;
      while (u < 27) {
        const w = rng.range(5, 9);
        const h = rng.range(6, 15);
        const col = rng.pick(["#9c7b52", "#8a6a44", "#5a6e7a", "#a34a3a", "#6a7b4c", "#c2b48a"]);
        if (u + w > 29) break;
        f.box(u, 4, z + 1.5, u + w, 16, z + 1.5 + h, col, { edge: shade(col, 0.5) });
        u += w + rng.range(0.5, 3);
      }
    }
    f.boxes([
      [1, 16, 0, 3, 18, 72, STEEL],
      [29, 16, 0, 31, 18, 72, STEEL],
    ]);
  },
};
