import { cylinder } from "../../art/shapes";
import type { ObjectComponent } from "../../core/types";

export const floorLamp: ObjectComponent = {
  kind: "object",
  id: "floor_lamp",
  name: "Floor Lamp",
  category: "living",
  size: [1, 1],
  height: 76,
  solid: true,
  draw(f) {
    const c = f.w(16, 16, 0);
    f.groundShade(0.12);
    cylinder(f.p, c[0], c[1], 5, 0, 2, "#3d3a35");
    cylinder(f.p, c[0], c[1], 0.9, 2, 58, "#6b665c");
    cylinder(f.p, c[0], c[1], 8, 56, 72, "#d6c9a0", "#efe4c0");
  },
};
