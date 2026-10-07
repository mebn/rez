import type { ObjectComponent } from "../../core/types";

const WOOD = "#8b6a47";

export const kitchenTable: ObjectComponent = {
  kind: "object",
  id: "kitchen_table",
  name: "Kitchen Table",
  category: "kitchen",
  size: [1, 1],
  height: 34,
  solid: true,
  occludes: false,
  draw(f) {
    f.groundShade(0.18);
    f.boxes([
      [3, 3, 0, 6, 6, 27, WOOD],
      [26, 3, 0, 29, 6, 27, WOOD],
      [3, 26, 0, 6, 29, 27, WOOD],
      [26, 26, 0, 29, 29, 27, WOOD],
    ]);
    f.box(1, 1, 27, 31, 31, 30, WOOD);
    f.top(1, 1, 31, 31, 30, (ctx, w, d) => {
      ctx.fillStyle = "#d9d3c2";
      ctx.fillRect(6, 7, w - 12, d - 14);
      ctx.strokeStyle = "#b44a3f";
      ctx.lineWidth = 0.6;
      for (let i = 8; i < w - 6; i += 3) {
        ctx.beginPath();
        ctx.moveTo(i, 7);
        ctx.lineTo(i, d - 7);
        ctx.stroke();
      }
    });
  },
};
