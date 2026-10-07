import type { ObjectComponent } from "../../core/types";

export const rug: ObjectComponent = {
  kind: "object",
  id: "rug",
  name: "Rug",
  category: "living",
  size: [2, 2],
  height: 4,
  solid: false,
  layer: 0.2,
  occludes: false,
  draw(f) {
    f.top(3, 3, f.W - 3, f.D - 3, 0.4, (ctx, w, d) => {
      ctx.fillStyle = "#7c3f35";
      ctx.fillRect(0, 0, w, d);
      ctx.strokeStyle = "#c9a96a";
      ctx.lineWidth = 1.4;
      ctx.strokeRect(3, 3, w - 6, d - 6);
      ctx.strokeStyle = "#3e5560";
      ctx.lineWidth = 1;
      ctx.strokeRect(7, 7, w - 14, d - 14);
      ctx.fillStyle = "#c9a96a";
      ctx.beginPath();
      ctx.moveTo(w / 2, 12);
      ctx.lineTo(w - 14, d / 2);
      ctx.lineTo(w / 2, d - 12);
      ctx.lineTo(14, d / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#7c3f35";
      ctx.beginPath();
      ctx.arc(w / 2, d / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      for (let i = 0; i < 300; i++) ctx.fillRect((i * 37) % w, (i * 61) % d, 0.7, 0.7);
    });
  },
};
