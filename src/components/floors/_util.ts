import { Rng } from "../../core/rng";
import { speckle } from "../../art/painter";

/** Fill the tile square with a base colour plus painterly speckle. */
export function base(ctx: CanvasRenderingContext2D, color: string, noise: string[], seed: number, count = 160, size = 0.9): Rng {
  const rng = new Rng(seed);
  ctx.fillStyle = color;
  ctx.fillRect(-1, -1, 34, 34);
  speckle(ctx, 32, 32, noise, count, () => rng.next(), size);
  return rng;
}
