import { drawCorpse } from "../../art/character";
import type { ObjectComponent } from "../../core/types";
import { getLook } from "../../engine/sprites";

/**
 * A dead body left where it fell. State is "<lookId>:<dir>" so each body keeps the clothes
 * it died in. Its pockets are filled by the game, not a loot table roll.
 */
export const corpse: ObjectComponent = {
  kind: "object",
  id: "corpse",
  name: "Corpse",
  category: "outdoor",
  size: [1, 1],
  height: 12,
  pad: 18,
  solid: false,
  layer: 1,
  occludes: false,
  container: { capacity: 25, loot: "zombie" },
  draw(f, state, p) {
    const [lookId, dir] = state.split(":");
    const [cx, cy] = p.pt([0.5, 0.5, 0]);
    const ctx = p.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    drawCorpse(ctx, getLook(lookId), Number(dir));
    ctx.restore();
  },
};
