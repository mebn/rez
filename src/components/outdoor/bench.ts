import type { ObjectComponent } from "../../core/types";

const WOOD = "#7a5a3a";
const IRON = "#3a3a38";

export const bench: ObjectComponent = {
  kind: "object",
  id: "bench",
  name: "Park Bench",
  category: "outdoor",
  size: [2, 1],
  height: 40,
  solid: true,
  occludes: false,
  draw(f) {
    const W = f.W;
    f.groundShade(0.18);
    f.boxes([
      [6, 10, 0, 9, 26, 16, IRON],
      [W - 9, 10, 0, W - 6, 26, 16, IRON],
      [6, 9, 16, 9, 12, 34, IRON],
      [W - 9, 9, 16, W - 6, 12, 34, IRON],
    ]);
    for (let i = 0; i < 3; i++) f.box(2, 13 + i * 4.5, 16, W - 2, 16.5 + i * 4.5, 18, WOOD);
    for (let i = 0; i < 2; i++) f.box(2, 9, 22 + i * 6, W - 2, 11, 26 + i * 6, WOOD);
  },
};
