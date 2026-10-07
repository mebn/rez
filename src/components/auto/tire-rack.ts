import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";
import { cylinder } from "../../art/shapes";

const STEEL = "#8b9bb4";

/** Rack of spare wheels at a garage. */
export const tireRack: ObjectComponent = {
  kind: "object",
  id: "tire_rack",
  name: "Tire Rack",
  category: "garage",
  size: [1, 1],
  height: 64,
  solid: true,
  container: { capacity: 40, loot: "tires", label: "Spare wheels" },
  draw(f) {
    f.groundShade(0.18);
    f.boxes([
      [2, 4, 0, 4, 6, 60, STEEL],
      [28, 4, 0, 30, 6, 60, STEEL],
    ]);
    for (const z of [4, 30]) {
      f.box(2, 4, z, 30, 28, z + 2, STEEL, { edge: shade(STEEL, 0.5) });
      for (const u of [9, 23]) {
        const c = f.w(u, 16, 0);
        cylinder(f.p, c[0], c[1], 6, z + 2, z + 20, "#262b44", "#3a4466");
      }
    }
    f.boxes([
      [2, 26, 0, 4, 28, 60, STEEL],
      [28, 26, 0, 30, 28, 60, STEEL],
    ]);
  },
};
