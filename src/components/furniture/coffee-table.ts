import type { ObjectComponent } from "../../core/types";

const WOOD = "#5f442e";

export const coffeeTable: ObjectComponent = {
  kind: "object",
  id: "coffee_table",
  name: "Coffee Table",
  category: "living",
  size: [1, 1],
  height: 24,
  solid: true,
  occludes: false,
  draw(f) {
    f.groundShade(0.15);
    f.boxes([
      [5, 7, 0, 8, 10, 13, WOOD],
      [24, 7, 0, 27, 10, 13, WOOD],
      [5, 22, 0, 8, 25, 13, WOOD],
      [24, 22, 0, 27, 25, 13, WOOD],
    ]);
    f.box(3, 5, 13, 29, 27, 16, WOOD);
    f.top(3, 5, 29, 27, 16, (ctx) => {
      // a magazine and a mug
      ctx.fillStyle = "#c9c0a5";
      ctx.save();
      ctx.translate(9, 9);
      ctx.rotate(0.3);
      ctx.fillRect(0, 0, 8, 10);
      ctx.fillStyle = "#a54a3c";
      ctx.fillRect(1, 1, 6, 3);
      ctx.restore();
      ctx.fillStyle = "#e5e0d0";
      ctx.beginPath();
      ctx.arc(19, 15, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a3020";
      ctx.beginPath();
      ctx.arc(19, 15, 1.4, 0, Math.PI * 2);
      ctx.fill();
    });
  },
};
