import type { Facing, Side } from "../core/types";
import { createItem } from "../items/registry";
import type { Item } from "../items/types";
import { Inventory } from "../world/inventory";
import type { ObjectPlacement } from "../world/map-data";
import type { ObjectInstance, World } from "../world/world";

/**
 * Save games live in localStorage as one JSON blob. The map itself is rebuilt from code on load
 * and everything that can change during play (doors, barricades, moved and dropped things,
 * containers, zombies, cars, the survivor) is laid back over it.
 */
export const SAVE_KEY = "rez.save.v1";

export interface SavedItem {
  id: string;
  c?: number;
  r?: number;
  k?: number;
  l?: string;
  f?: number;
}

export interface SavedInventory {
  label: string;
  cap: number;
  items: SavedItem[];
}

export interface SavedEdge {
  t: string;
  x: number;
  y: number;
  s: Side;
  st: string;
  hp?: number;
  br?: boolean;
  b?: number;
  bh?: number;
}

export interface SavedObject {
  t: string;
  x: number;
  y: number;
  f: Facing;
  st: string;
  contents?: ObjectPlacement["contents"];
  inv?: SavedInventory;
  /** Gas pumps: litres left. */
  pump?: number;
}

export interface SavedLevel {
  edges: SavedEdge[];
  objects: SavedObject[];
}

export function saveItem(i: Item): SavedItem {
  const s: SavedItem = { id: i.def.id };
  if (i.condition !== undefined) s.c = i.condition;
  if (i.rounds !== undefined) s.r = i.rounds;
  if (i.keyFor !== undefined) s.k = i.keyFor;
  if (i.label !== undefined) s.l = i.label;
  if (i.fuel !== undefined) s.f = i.fuel;
  return s;
}

/** Null for items that no longer exist in the game (renamed or removed since the save). */
export function loadItem(s: SavedItem): Item | null {
  let i: Item;
  try {
    i = createItem(s.id, s.c);
  } catch {
    return null;
  }
  if (s.r !== undefined) i.rounds = s.r;
  if (s.k !== undefined) i.keyFor = s.k;
  if (s.l !== undefined) i.label = s.l;
  if (s.f !== undefined) i.fuel = s.f;
  return i;
}

export function loadItems(list: SavedItem[]): Item[] {
  return list.map(loadItem).filter((i): i is Item => !!i);
}

export function saveInventory(inv: Inventory): SavedInventory {
  return { label: inv.label, cap: inv.capacity, items: inv.items.map(saveItem) };
}

export function loadInventory(s: SavedInventory): Inventory {
  const inv = new Inventory(s.label, s.cap);
  inv.items = loadItems(s.items);
  return inv;
}

export function saveLevel(w: World, pumps: Map<number, number>): SavedLevel {
  return {
    edges: [...w.edges.values()].map((e) => {
      const s: SavedEdge = { t: e.comp.id, x: e.x, y: e.y, s: e.side, st: e.state };
      if (e.hp !== undefined) s.hp = e.hp;
      if (e.broken) s.br = true;
      if (e.barricade) s.b = e.barricade;
      if (e.barricadeHp !== undefined) s.bh = e.barricadeHp;
      return s;
    }),
    objects: w.objects.map((o) => {
      const s: SavedObject = { t: o.comp.id, x: o.x, y: o.y, f: o.facing, st: o.state };
      if (o.placement.contents) s.contents = o.placement.contents;
      if (o.inventory) s.inv = saveInventory(o.inventory);
      const pump = pumps.get(o.uid);
      if (pump !== undefined) s.pump = pump;
      return s;
    }),
  };
}

/** Replace a storey's edges and objects with the saved ones. */
export function loadLevel(w: World, s: SavedLevel, pumps: Map<number, number>): void {
  w.edges.clear();
  for (const e of s.edges) {
    try {
      const inst = w.addEdge(e.t, e.x, e.y, e.s, e.st);
      if (e.hp !== undefined) inst.hp = e.hp;
      if (e.br) inst.broken = true;
      if (e.b) inst.barricade = e.b;
      if (e.bh !== undefined) inst.barricadeHp = e.bh;
    } catch {
      // a component that no longer exists
    }
  }
  for (const o of [...w.objects]) w.removeObject(o);
  for (const o of s.objects) {
    let inst: ObjectInstance;
    try {
      inst = w.addObject({ type: o.t, x: o.x, y: o.y, facing: o.f, state: o.st, contents: o.contents });
    } catch {
      continue;
    }
    if (o.inv) inst.inventory = loadInventory(o.inv);
    if (o.pump !== undefined) pumps.set(inst.uid, o.pump);
  }
}
