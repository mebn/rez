import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";

const BODY = "#2f5f73";

export const drinksCooler: ObjectComponent = {
  kind: "object",
  id: "drinks_cooler",
  name: "Drinks Cooler",
  category: "store",
  size: [1, 1],
  height: 82,
  solid: true,
  container: { capacity: 25, loot: "cooler" },
  draw(f) {
    f.groundShade(0.22);
    f.box(1, 3, 0, 31, 28, 78, BODY, { edge: shade(BODY, 0.5) });
    f.face("front", 1, 3, 0, 31, 28, 78, (ctx, w, h) => {
      ctx.fillStyle = "#c9dfe2";
      ctx.fillRect(3, 12, w - 6, h - 20);
      const cols = ["#b5443a", "#3e6a8a", "#d9b44a", "#5f8a4c", "#e8e4d6"];
      for (let row = 0; row < 4; row++) {
        const y = 14 + row * ((h - 24) / 4);
        ctx.fillStyle = "#7d9aa0";
        ctx.fillRect(3, y + 11, w - 6, 1);
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = cols[(row + i) % cols.length];
          ctx.fillRect(5 + i * 3.8, y + 3.5, 2.6, 7.5);
          ctx.fillRect(5.6 + i * 3.8, y + 2, 1.4, 1.6);
        }
      }
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.moveTo(5, h - 10);
      ctx.lineTo(12, h - 10);
      ctx.lineTo(w - 5, 20);
      ctx.lineTo(w - 9, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e3d9bd";
      ctx.font = "bold 6px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("COLD", w / 2, 8.5);
      ctx.fillStyle = "#a9adae";
      ctx.fillRect(w - 5, h * 0.4, 1.6, 14);
    });
  },
};
