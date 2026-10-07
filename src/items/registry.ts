import { AUTO } from "./auto";
import { FOOD } from "./food";
import { MISC } from "./misc";
import { pixelize } from "../art/pixel";
import type { Item, ItemDef } from "./types";
import { WEAPONS } from "./weapons";

const defs = new Map<string, ItemDef>();
for (const d of [...FOOD, ...WEAPONS, ...MISC, ...AUTO]) {
  if (defs.has(d.id)) throw new Error(`Duplicate item id ${d.id}`);
  defs.set(d.id, d);
}

export function itemDef(id: string): ItemDef {
  const d = defs.get(id);
  if (!d) throw new Error(`Unknown item ${id}`);
  return d;
}

export function allItemDefs(): ItemDef[] {
  return [...defs.values()];
}

let nextUid = 1;
export function createItem(id: string, condition?: number): Item {
  const def = itemDef(id);
  return {
    uid: nextUid++,
    def,
    condition: def.durability ? (condition ?? 1) : undefined,
  };
}

const iconCache = new Map<string, string>();
/** Icon as a data URL for the DOM UI: native 32px, palette-snapped, upscaled with pixelated CSS. */
export function itemIcon(def: ItemDef): string {
  let url = iconCache.get(def.id);
  if (!url) {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    def.icon(ctx);
    ctx.putImageData(pixelize(ctx.getImageData(0, 0, 32, 32)), 0, 0);
    url = c.toDataURL();
    iconCache.set(def.id, url);
  }
  return url;
}
