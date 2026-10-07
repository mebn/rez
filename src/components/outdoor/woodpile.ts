import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";

const BARK = "#6b4a2e";

export const woodpile: ObjectComponent = {
  kind: "object",
  id: "woodpile",
  name: "Woodpile",
  category: "outdoor",
  size: [1, 1],
  height: 28,
  solid: true,
  occludes: false,
  container: { capacity: 15, loot: "woodpile" },
  draw(f) {
    f.groundShade(0.2);
    f.box(2, 8, 0, 30, 26, 20, BARK);
    f.face("front", 2, 8, 0, 30, 26, 20, (ctx, w, h) => {
      ctx.fillStyle = shade(BARK, 0.6);
      ctx.fillRect(0, 0, w, h);
      for (let row = 0; row < 3; row++)
        for (let i = 0; i < 5; i++) {
          const x = 3.2 + i * 5.6 + (row % 2) * 2.8;
          const y = h - 3.5 - row * 6.2;
          if (x > w - 2) continue;
          ctx.fillStyle = "#b8925f";
          ctx.beginPath();
          ctx.arc(x, y, 2.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#7a5634";
          ctx.lineWidth = 0.6;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, 1.3, 0, Math.PI * 2);
          ctx.stroke();
        }
    });
    f.top(2, 8, 30, 26, 20, (ctx, w, d) => {
      ctx.strokeStyle = shade(BARK, 1.15);
      ctx.lineWidth = 0.6;
      for (let x = 3; x < w; x += 5) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, d);
        ctx.stroke();
      }
    });
    // axe-split stick leaning on the pile
    f.box(26, 22, 0, 28, 24, 26, "#8a6a44");
  },
};
