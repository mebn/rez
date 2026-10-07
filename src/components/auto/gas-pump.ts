import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";

const BODY = "#e8e0c8";
const RED = "#be4a2f";

/** Fuel pump. Each one holds a limited amount of gas, tracked by the game. */
export const gasPump: ObjectComponent = {
  kind: "object",
  id: "gas_pump",
  name: "Gas Pump",
  category: "outdoor",
  size: [1, 1],
  height: 66,
  solid: true,
  draw(f) {
    f.groundShade(0.2);
    f.box(4, 6, 0, 28, 26, 4, "#8b9bb4");
    f.box(8, 9, 4, 24, 23, 60, BODY, { edge: shade(BODY, 0.5) });
    f.box(8, 9, 40, 24, 23, 60, RED, { edge: shade(RED, 0.5) });
    f.face("front", 8, 9, 4, 24, 23, 60, (ctx, w) => {
      ctx.fillStyle = "#181425";
      ctx.fillRect(3, 22, w - 6, 8);
      ctx.fillStyle = "#63c74d";
      ctx.fillRect(5, 24, w - 10, 4);
      ctx.fillStyle = "#3a4466";
      ctx.fillRect(w - 6, 34, 3, 12);
    });
    // hose and nozzle on the side
    f.box(24, 14, 22, 26, 17, 40, "#262b44");
  },
};
