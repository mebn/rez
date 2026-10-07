import { shade } from "../../art/color";
import type { Frame } from "../../art/frame";
import type { ObjectComponent } from "../../core/types";

const FABRIC = "#6c7d64";

function upholstered(f: Frame, color: string): void {
  const W = f.W;
  f.groundShade(0.22);
  f.box(2, 4, 0, W - 2, 29, 5, "#3a2c20");
  f.boxes([
    [2, 4, 5, W - 2, 12, 36, color], // back
    [2, 4, 5, 8, 29, 25, shade(color, 0.95)], // left arm
    [W - 8, 4, 5, W - 2, 29, 25, shade(color, 0.95)], // right arm
  ]);
  f.box(8, 12, 5, W - 8, 29, 15, color);
  const n = Math.round((W - 16) / 24);
  const cw = (W - 16) / n;
  for (let i = 0; i < n; i++) {
    f.box(8 + i * cw + 0.5, 12, 15, 8 + (i + 1) * cw - 0.5, 29, 19.5, shade(color, 1.04));
  }
  // re-draw the near arm so it overlaps cushions correctly
  if (f.visible("right")) f.box(W - 8, 4, 5, W - 2, 29, 25, shade(color, 0.95));
  if (f.visible("left")) f.box(2, 4, 5, 8, 29, 25, shade(color, 0.95));
}

export const sofa: ObjectComponent = {
  kind: "object",
  id: "sofa",
  name: "Sofa",
  category: "living",
  size: [2, 1],
  height: 44,
  solid: true,
  occludes: false,
  container: { capacity: 4, loot: "sofa", label: "Between the Cushions" },
  draw(f) {
    upholstered(f, FABRIC);
  },
};

export const armchair: ObjectComponent = {
  kind: "object",
  id: "armchair",
  name: "Armchair",
  category: "living",
  size: [1, 1],
  height: 44,
  solid: true,
  occludes: false,
  container: { capacity: 2, loot: "sofa", label: "Between the Cushions" },
  draw(f) {
    upholstered(f, "#8a5b4a");
  },
};
