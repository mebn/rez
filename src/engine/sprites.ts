import { Frame } from "../art/frame";
import { Painter } from "../art/painter";
import { drawCharacter, type CharacterLook, CHAR_SPRITE } from "../art/character";
import { HALF_H, HALF_W } from "../core/iso";
import { registry } from "../core/registry";
import type { Facing, Side } from "../core/types";
import { hash2 } from "../core/rng";

/** A sprite recipe: size in world px, anchor (where world origin sits), and how to draw it. */
export interface SpriteDef {
  w: number;
  h: number;
  ax: number;
  ay: number;
  draw(p: Painter): void;
}

export const floorKey = (id: string, variant: number) => `f|${id}|${variant}`;
export const edgeKey = (id: string, side: Side, state: string) => `e|${id}|${side}|${state}`;
export const objectKey = (id: string, facing: Facing, state: string) => `o|${id}|${facing}|${state}`;
export const MARKER_KEY = "m|dest";
export const charKey = (lookId: string, dir: number, frame: number) => `c|${lookId}|${dir}|${frame}`;

const looks = new Map<string, CharacterLook>();
export function registerLook(id: string, look: CharacterLook): void {
  looks.set(id, look);
}

/** Build a sprite recipe from a key. Called lazily by the atlas the first time a key is used. */
export function spriteDef(key: string): SpriteDef {
  const parts = key.split("|");
  switch (parts[0]) {
    case "f": {
      const comp = registry.floor(parts[1]);
      const variant = Number(parts[2]);
      return {
        w: HALF_W * 2 + 2,
        h: HALF_H * 2 + 2,
        ax: HALF_W + 1,
        ay: 1,
        draw(p) {
          p.plane([0, 0, 0], [1 / 32, 0, 0], [0, 1 / 32, 0], (ctx) => {
            // slight overdraw hides seams between neighbouring tiles
            ctx.beginPath();
            ctx.rect(-0.6, -0.6, 33.2, 33.2);
            ctx.clip();
            comp.draw(ctx, variant, hash2(variant, 7, comp.id.length));
          });
        },
      };
    }
    case "e": {
      const comp = registry.edge(parts[1]);
      const side = parts[2] as Side;
      const state = parts[3];
      const pad = 8;
      return {
        w: HALF_W * 2 + pad * 2,
        h: HALF_H * 2 + comp.height + pad * 2,
        ax: HALF_W + pad,
        ay: comp.height + pad,
        draw(p) {
          comp.draw(new Frame(p, 1, 0, side === "N" ? "S" : "E"), state);
        },
      };
    }
    case "o": {
      const comp = registry.object(parts[1]);
      const facing = parts[2] as Facing;
      const state = parts[3];
      const pad = comp.pad ?? 6;
      const swap = facing === "E" || facing === "W";
      const wx = swap ? comp.size[1] : comp.size[0];
      const wy = swap ? comp.size[0] : comp.size[1];
      return {
        w: (wx + wy) * HALF_W + pad * 2,
        h: (wx + wy) * HALF_H + comp.height + pad * 2,
        ax: wy * HALF_W + pad,
        ay: comp.height + pad,
        draw(p) {
          comp.draw(new Frame(p, comp.size[0], comp.size[1], facing), state, p);
        },
      };
    }
    case "m": {
      // destination marker: a soft diamond on the ground
      return {
        w: HALF_W * 2 + 4,
        h: HALF_H * 2 + 4,
        ax: HALF_W + 2,
        ay: 2,
        draw(p) {
          p.poly([[0.18, 0.18, 0], [0.82, 0.18, 0], [0.82, 0.82, 0], [0.18, 0.82, 0]], "rgba(230,220,180,0.18)", "rgba(240,230,190,0.9)", 1.4);
        },
      };
    }
    case "c": {
      const look = looks.get(parts[1]);
      if (!look) throw new Error(`Unknown character look ${parts[1]}`);
      const dir = Number(parts[2]);
      const frame = Number(parts[3]);
      return {
        ...CHAR_SPRITE,
        draw(p) {
          drawCharacter(p.ctx, look, dir, frame);
        },
      };
    }
  }
  throw new Error(`Bad sprite key ${key}`);
}
