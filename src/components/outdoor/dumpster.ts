import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";

const GREEN = "#3f5f45";

export const dumpster: ObjectComponent = {
  kind: "object",
  id: "dumpster",
  name: "Dumpster",
  category: "outdoor",
  size: [2, 1],
  height: 44,
  solid: true,
  occludes: false,
  container: { capacity: 40, loot: "dumpster" },
  draw(f) {
    const W = f.W;
    f.groundShade(0.25);
    f.box(3, 3, 3, W - 3, 29, 32, GREEN, { edge: shade(GREEN, 0.5) });
    f.face("front", 3, 3, 3, W - 3, 29, 32, (ctx, w, h) => {
      ctx.strokeStyle = shade(GREEN, 0.6);
      ctx.lineWidth = 1;
      for (let x = 10; x < w; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, 2);
        ctx.lineTo(x, h - 1);
        ctx.stroke();
      }
      ctx.fillStyle = "#c9c4b4";
      ctx.fillRect(w / 2 - 8, 8, 16, 5);
      ctx.fillStyle = "rgba(100,60,30,0.4)";
      ctx.fillRect(4, h - 7, 10, 5);
    });
    // lids, one flipped open against the back
    f.box(3, 3, 32, W / 2, 29, 34, shade(GREEN, 0.8));
    f.box(W / 2 + 1, 0, 32, W - 3, 3, 56, shade(GREEN, 0.8));
    f.top(W / 2 + 1, 3, W - 3, 29, 32, (ctx, w, d) => {
      ctx.fillStyle = "#2a2a26";
      ctx.fillRect(1, 1, w - 2, d - 2);
      ctx.fillStyle = "#6b5a40";
      ctx.fillRect(4, 5, 7, 6);
      ctx.fillStyle = "#4a5a6a";
      ctx.fillRect(14, 10, 8, 7);
    });
    // wheels
    f.boxes([
      [5, 5, 0, 9, 9, 3, "#222"],
      [W - 9, 25, 0, W - 5, 29, 3, "#222"],
    ]);
  },
};
