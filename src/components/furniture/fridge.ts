import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";

const BODY = "#d8d4c6";

export const fridge: ObjectComponent = {
  kind: "object",
  id: "fridge",
  name: "Fridge",
  category: "kitchen",
  size: [1, 1],
  height: 80,
  solid: true,
  container: { capacity: 20, loot: "fridge" },
  draw(f) {
    f.groundShade(0.25);
    f.box(3, 3, 0, 29, 27, 76, BODY, { edge: shade(BODY, 0.55) });
    f.face("front", 3, 3, 0, 29, 27, 76, (ctx, w, h) => {
      ctx.strokeStyle = "rgba(40,40,40,0.55)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(1, 24);
      ctx.lineTo(w - 1, 24);
      ctx.stroke();
      // handles
      ctx.fillStyle = "#8f8b80";
      ctx.fillRect(w - 5, 9, 1.8, 11);
      ctx.fillRect(w - 5, 29, 1.8, 18);
      // magnets and a note
      ctx.fillStyle = "#e7e1c9";
      ctx.fillRect(6, 34, 7, 8);
      ctx.fillStyle = "#b5443a";
      ctx.fillRect(9, 33, 1.6, 1.6);
      ctx.fillStyle = "#3e6a8a";
      ctx.fillRect(15, 40, 2, 2);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, h - 3, w, 3);
    });
  },
};
