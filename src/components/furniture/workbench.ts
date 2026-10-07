import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";

const WOOD = "#8a6b46";

export const workbench: ObjectComponent = {
  kind: "object",
  id: "workbench",
  name: "Workbench",
  category: "garage",
  size: [2, 1],
  height: 80,
  solid: true,
  container: { capacity: 15, loot: "workbench" },
  draw(f) {
    const W = f.W;
    f.groundShade(0.22);
    // pegboard against the wall
    f.box(2, 0, 34, W - 2, 3, 76, "#a58a62");
    f.face("front", 2, 0, 34, W - 2, 3, 76, (ctx, w, h) => {
      ctx.fillStyle = "rgba(60,40,20,0.5)";
      for (let x = 3; x < w; x += 4) for (let y = 3; y < h; y += 4) ctx.fillRect(x, y, 0.8, 0.8);
      // hanging tools: saw, wrench, hammer
      ctx.fillStyle = "#9da1a3";
      ctx.beginPath();
      ctx.moveTo(8, 8);
      ctx.lineTo(22, 8);
      ctx.lineTo(22, 15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#6b4426";
      ctx.fillRect(4, 7, 5, 4);
      ctx.fillStyle = "#7b7f80";
      ctx.fillRect(30, 6, 2, 16);
      ctx.fillRect(28.5, 5, 5, 3);
      ctx.fillStyle = "#6b4426";
      ctx.fillRect(42, 8, 2, 16);
      ctx.fillStyle = "#4a4d4e";
      ctx.fillRect(39, 6, 8, 3.5);
      ctx.fillStyle = "#b5443a";
      ctx.fillRect(52, 9, 3, 12);
    });
    f.boxes([
      [3, 4, 0, 6, 7, 32, WOOD],
      [W - 6, 4, 0, W - 3, 7, 32, WOOD],
      [3, 25, 0, 6, 28, 32, WOOD],
      [W - 6, 25, 0, W - 3, 28, 32, WOOD],
    ]);
    f.box(3, 4, 8, W - 3, 28, 10, shade(WOOD, 0.9));
    f.box(1, 3, 32, W - 1, 30, 36, WOOD);
    // vise and a paint can on the top
    f.box(W - 16, 20, 36, W - 8, 30, 41, "#4c5a63");
    f.box(8, 8, 36, 15, 15, 44, "#7a8c5a");
  },
};
