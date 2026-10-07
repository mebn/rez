import type { ObjectComponent } from "../../core/types";

/** Things lying on the ground. Removed when emptied. */
export const itemPile: ObjectComponent = {
  kind: "object",
  id: "item_pile",
  name: "Something on the ground",
  category: "outdoor",
  size: [1, 1],
  height: 8,
  pad: 4,
  solid: false,
  layer: 0.5,
  occludes: false,
  container: { capacity: 50, loot: "none", label: "Ground" },
  draw(f, _state, p) {
    // a dropped keyring catching the light
    const [x, y] = p.pt([0.5, 0.5, 0]);
    const ctx = p.ctx;
    ctx.fillStyle = "#181425";
    ctx.fillRect(x - 5, y - 1, 10, 3);
    ctx.strokeStyle = "#c0cbdc";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x - 1, y - 2, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#feae34";
    ctx.fillRect(x + 1, y - 3, 5, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 3, y - 5, 1, 1);
  },
};
