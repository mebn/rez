import type { ObjectComponent } from "../../core/types";

const WOOD = "#8f6e48";

export const picnicTable: ObjectComponent = {
  kind: "object",
  id: "picnic_table",
  name: "Picnic Table",
  category: "outdoor",
  size: [2, 1],
  height: 34,
  solid: true,
  occludes: false,
  container: { capacity: 4, loot: "picnic", label: "Under the Table" },
  draw(f) {
    const W = f.W;
    f.groundShade(0.2);
    f.boxes([
      [8, 2, 0, 11, 30, 14, WOOD],
      [W - 11, 2, 0, W - 8, 30, 14, WOOD],
    ]);
    f.box(2, 1, 14, W - 2, 6, 16, WOOD);
    f.box(2, 26, 14, W - 2, 31, 16, WOOD);
    f.boxes([
      [9, 11, 0, 11, 21, 26, WOOD],
      [W - 11, 11, 0, W - 9, 21, 26, WOOD],
    ]);
    for (let i = 0; i < 3; i++) f.box(1, 9 + i * 5, 26, W - 1, 13.5 + i * 5, 28, WOOD);
  },
};
