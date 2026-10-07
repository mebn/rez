import { shade } from "../../art/color";
import { cabinetFront } from "../../art/shapes";
import type { ObjectComponent } from "../../core/types";

const WOOD = "#d0c8b4";

export const vanity: ObjectComponent = {
  kind: "object",
  id: "vanity",
  name: "Bathroom Cabinet",
  category: "bathroom",
  size: [1, 1],
  height: 76,
  solid: true,
  occludes: false,
  container: { capacity: 6, loot: "medicine" },
  draw(f) {
    f.groundShade(0.18);
    f.box(2, 4, 0, 30, 24, 32, WOOD);
    f.face("front", 2, 4, 0, 30, 24, 32, (ctx, w, h) => cabinetFront(ctx, w, h, WOOD, false));
    f.box(1, 3, 32, 31, 25, 34.5, "#d9d6cc", { edge: "#8c8a83" });
    f.top(1, 3, 31, 25, 34.5, (ctx, w, d) => {
      ctx.fillStyle = "#b9bdbd";
      ctx.beginPath();
      ctx.ellipse(w / 2, d / 2 + 1, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    f.box(14.5, 3, 34.5, 17.5, 6, 40, "#b8bcbd");
    // mirror cabinet on the wall
    f.box(5, 0, 46, 27, 4, 72, shade(WOOD, 0.95));
    f.face("front", 5, 0, 46, 27, 4, 72, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#c5d4d6");
      g.addColorStop(1, "#7f9396");
      ctx.fillStyle = g;
      ctx.fillRect(1.5, 1.5, w - 3, h - 3);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.moveTo(4, h - 5);
      ctx.lineTo(w * 0.5, 4);
      ctx.stroke();
    });
  },
};
