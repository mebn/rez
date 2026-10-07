import type { ObjectComponent } from "../../core/types";

export const mailbox: ObjectComponent = {
  kind: "object",
  id: "mailbox",
  name: "Mailbox",
  category: "outdoor",
  size: [1, 1],
  height: 44,
  solid: true,
  occludes: false,
  container: { capacity: 2, loot: "mailbox" },
  draw(f) {
    f.groundShade(0.12);
    f.box(15, 15, 0, 17, 17, 28, "#6b4e33");
    f.box(11, 7, 28, 21, 25, 37, "#3d5d7a");
    f.top(11, 7, 21, 25, 37, (ctx, w, d) => {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(w / 2 - 1, 0, 2, d);
    });
    // red flag
    f.box(21, 14, 30, 22, 16, 41, "#b5443a");
    f.box(21, 14, 38, 22, 20, 41, "#b5443a");
  },
};
