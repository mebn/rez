import type { ObjectComponent } from "../../core/types";

const WOOD = "#7d5c3d";

export const chair: ObjectComponent = {
  kind: "object",
  id: "chair",
  name: "Chair",
  category: "kitchen",
  size: [1, 1],
  height: 44,
  solid: true,
  occludes: false,
  draw(f) {
    f.groundShade(0.15);
    f.boxes([
      [9, 9, 0, 11, 11, 17, WOOD],
      [21, 9, 0, 23, 11, 17, WOOD],
      [9, 21, 0, 11, 23, 17, WOOD],
      [21, 21, 0, 23, 23, 17, WOOD],
    ]);
    f.box(8, 8, 17, 24, 24, 19.5, WOOD);
    // backrest at the back
    f.boxes([
      [8, 8, 19.5, 10, 10, 38, WOOD],
      [22, 8, 19.5, 24, 10, 38, WOOD],
    ]);
    f.box(8, 8, 31, 24, 10, 38, WOOD);
  },
};
