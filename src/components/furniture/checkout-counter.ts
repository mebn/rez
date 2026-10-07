import { shade } from "../../art/color";
import type { ObjectComponent } from "../../core/types";

const BODY = "#6b4f3a";

export const checkoutCounter: ObjectComponent = {
  kind: "object",
  id: "checkout_counter",
  name: "Checkout Counter",
  category: "store",
  size: [2, 1],
  height: 56,
  solid: true,
  occludes: false,
  container: { capacity: 10, loot: "checkout", label: "Behind the Counter" },
  draw(f) {
    const W = f.W;
    f.groundShade(0.2);
    f.box(0, 4, 0, W, 28, 34, BODY);
    f.face("front", 0, 4, 0, W, 28, 34, (ctx, w, h) => {
      ctx.fillStyle = "#3f7468";
      ctx.fillRect(0, 6, w, 3);
      ctx.strokeStyle = shade(BODY, 0.6);
      for (let x = 8; x < w; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, 12);
        ctx.lineTo(x, h - 2);
        ctx.stroke();
      }
    });
    f.box(-1, 2, 34, W + 1, 30, 37, "#bfb8a0");
    // cash register
    f.box(W - 26, 8, 37, W - 6, 24, 45, "#4a4a48");
    f.box(W - 24, 8, 45, W - 8, 14, 54, "#3a3a38");
    f.face("front", W - 24, 8, 45, W - 8, 14, 54, (ctx, w, h) => {
      ctx.fillStyle = "#7fbf8a";
      ctx.fillRect(2, 2, w - 4, h - 5);
    });
    f.top(W - 26, 14, W - 6, 24, 45, (ctx, w, d) => {
      ctx.fillStyle = "#cfcabb";
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) ctx.fillRect(2 + i * 4.5, 2 + j * 4, 3, 2.5);
      void d;
    });
    // gum rack
    f.box(4, 22, 37, 18, 29, 44, "#d9b44a");
  },
};
