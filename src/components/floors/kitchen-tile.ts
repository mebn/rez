import type { FloorComponent } from "../../core/types";

export const kitchenTile: FloorComponent = {
  kind: "floor",
  id: "kitchen_tile",
  name: "Checkered Linoleum",
  category: "floor",
  variants: 1,
  draw(ctx) {
    const n = 4;
    const s = 32 / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = (i + j) % 2 ? "#cfc6b0" : "#8c8676";
        ctx.fillRect(i * s - (i === 0 ? 1 : 0), j * s - (j === 0 ? 1 : 0), s + 1, s + 1);
      }
    ctx.fillStyle = "rgba(80,70,50,0.12)";
    ctx.fillRect(-1, -1, 34, 34);
  },
};
