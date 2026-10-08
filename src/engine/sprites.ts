import { Frame } from "../art/frame";
import { Painter } from "../art/painter";
import { drawCharacter, drawCorpse, type CharacterLook, type Stance, CHAR_SPRITE, CORPSE_SPRITE } from "../art/character";
import { HALF_H, HALF_W } from "../core/iso";
import { registry } from "../core/registry";
import type { Facing, Side } from "../core/types";
import { hash2 } from "../core/rng";
import { drawVehicle, VEHICLE_SPRITE } from "../art/vehicle";
import { VEHICLE_TYPES } from "../game/vehicles";

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
/** held: id of the item in the hands, "" for none. */
export const charKey = (lookId: string, dir: number, frame: number, stance: Stance = "stand", held = "") =>
  `c|${lookId}|${dir}|${frame}|${stance}|${held}`;
/** A body on the ground, anchored at its centre (for a dead player before they rise). */
export const corpseKey = (lookId: string, dir: number) => `k|${lookId}|${dir}`;
/** Planks nailed across a door or window: n of 4. */
export const barricadeKey = (side: Side, n: number) => `b|${side}|${n}`;
export const vehicleKey = (typeId: string, dir16: number, paint: string) => `v|${typeId}|${dir16}|${paint}`;

const looks = new Map<string, CharacterLook>();
export function registerLook(id: string, look: CharacterLook): void {
  looks.set(id, look);
}

export function getLook(id: string): CharacterLook {
  const look = looks.get(id);
  if (!look) throw new Error(`Unknown character look ${id}`);
  return look;
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
            ctx.rect(-1, -1, 34, 34);
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
    case "b": {
      const side = parts[1] as Side;
      const n = Number(parts[2]);
      const pad = 8;
      return {
        w: HALF_W * 2 + pad * 2,
        h: HALF_H * 2 + 92 + pad * 2,
        ax: HALF_W + pad,
        ay: 92 + pad,
        draw(p) {
          const f = new Frame(p, 1, 0, side === "N" ? "S" : "E");
          // boards on the visible face, alternating tilt like they were nailed up in a hurry
          const boards: [number, number][] = [[22, 4], [44, -4], [62, 3], [80, -3]];
          for (let i = 0; i < n; i++) {
            const [z, tilt] = boards[i];
            f.box(-1, 3, z - tilt, 16, 5, z - tilt + 7, "#b86f50");
            f.box(16, 3, z + tilt, 33, 5, z + tilt + 7, "#c28569");
          }
        },
      };
    }
    case "v": {
      const type = VEHICLE_TYPES[parts[1]];
      const heading = (Number(parts[2]) * Math.PI) / 8;
      const paint = parts[3];
      return {
        ...VEHICLE_SPRITE,
        draw(p) {
          drawVehicle(p, type.shape, paint, heading);
        },
      };
    }
    case "k": {
      const look = getLook(parts[1]);
      const dir = Number(parts[2]);
      return {
        ...CORPSE_SPRITE,
        draw(p) {
          drawCorpse(p.ctx, look, dir);
        },
      };
    }
    case "c": {
      const look = getLook(parts[1]);
      const dir = Number(parts[2]);
      const frame = Number(parts[3]);
      const stance = (parts[4] ?? "stand") as Stance;
      const held = parts[5] ?? "";
      return {
        ...CHAR_SPRITE,
        draw(p) {
          drawCharacter(p.ctx, look, dir, frame, stance, held);
        },
      };
    }
  }
  throw new Error(`Bad sprite key ${key}`);
}
