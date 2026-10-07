import { shade } from "../../art/color";
import { cabinetFront } from "../../art/shapes";
import type { Frame } from "../../art/frame";
import type { ObjectComponent } from "../../core/types";

export const CABINET = "#9a7a54";
export const COUNTERTOP = "#b9b096";

/** Base cabinet + countertop, shared by counter and sink. */
export function drawCounterBase(f: Frame, top = COUNTERTOP): void {
  f.groundShade(0.2);
  f.box(0, 2, 0, f.W, f.D - 4, 4, "#3b2e22");
  f.box(0, 2, 4, f.W, f.D - 2, 35, CABINET);
  f.face("front", 0, 2, 4, f.W, f.D - 2, 35, (ctx, w, h) => cabinetFront(ctx, w, h, CABINET));
  f.box(-0.5, 0, 35, f.W + 0.5, f.D, 38.5, top, { edge: shade(top, 0.5) });
}

export const kitchenCounter: ObjectComponent = {
  kind: "object",
  id: "kitchen_counter",
  name: "Kitchen Cupboard",
  category: "kitchen",
  size: [1, 1],
  height: 44,
  solid: true,
  occludes: false,
  container: { capacity: 15, loot: "kitchen" },
  draw(f) {
    drawCounterBase(f);
  },
};
