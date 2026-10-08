import { shade } from "../../art/color";
import type { EdgeComponent, FloorComponent, ObjectComponent } from "../../core/types";
import { WALL_H } from "./wall";

const WOOD = "#9a6a43";
const STEPS = 12;

/**
 * A straight flight up to the next storey: 1 tile wide, 3 deep. The front faces where you
 * step on; it rises toward the back and reaches exactly one wall height at the top.
 */
export const stairsWood: ObjectComponent = {
  kind: "object",
  id: "stairs_wood",
  name: "Stairs",
  category: "living",
  size: [1, 3],
  height: WALL_H + 4,
  solid: false,
  occludes: false,
  draw(f) {
    const D = f.D;
    const run = D / STEPS;
    const rise = WALL_H / STEPS;
    const parts: [number, number, number, number, number, number, string][] = [];
    for (let i = 0; i < STEPS; i++) {
      const v1 = D - i * run;
      const c = i % 2 ? WOOD : shade(WOOD, 1.08);
      parts.push([3, v1 - run, 0, 29, v1, (i + 1) * rise, c]);
    }
    f.boxes(parts);
    // stringers along both sides, following the slope
    for (const u of [1, 29]) {
      for (let i = 0; i < STEPS; i++) {
        const v1 = D - i * run;
        f.box(u, v1 - run, 0, u + 2, v1, (i + 1) * rise + 2, shade(WOOD, 0.75));
      }
    }
  },
};

/** Waist-high banister around a stairwell or landing. */
export const railingWood: EdgeComponent = {
  kind: "edge",
  id: "railing_wood",
  name: "Railing",
  category: "fence",
  height: 30,
  states: ["default"],
  blocksMovement: () => true,
  draw(f) {
    const c = "#7a5236";
    for (let u = 3; u < 32; u += 6) f.box(u, -0.6, 0, u + 1.4, 0.6, 24, shade(c, 1.1));
    f.box(-1, -1.2, 24, 33, 1.2, 27, c);
    f.box(-1.5, -1.5, 0, 1.5, 1.5, 28, shade(c, 0.9));
  },
};

/** The opening at the top of a staircase: no floor of its own, you see the steps below. */
export const stairGap: FloorComponent = {
  kind: "floor",
  id: "stair_gap",
  name: "Stairwell",
  category: "floor",
  variants: 1,
  draw() {},
};
