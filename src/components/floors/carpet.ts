import type { FloorComponent } from "../../core/types";
import { base } from "./_util";

export const carpet: FloorComponent = {
  kind: "floor",
  id: "carpet",
  name: "Carpet",
  category: "floor",
  variants: 2,
  draw(ctx, _v, seed) {
    base(ctx, "#6e5a62", ["#64515a", "#79656c", "#5c4a52", "#83707a"], seed, 420, 0.7);
  },
};
