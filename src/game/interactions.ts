import { createItem } from "../items/registry";
import type { Item } from "../items/types";
import type { Tile } from "../world/pathfinding";
import type { EdgeInstance, Interactable, ObjectInstance, World } from "../world/world";
import type { Player } from "./player";
import type { SkillId } from "./survivor";
import type { Vehicle } from "./vehicles";
import type { Zombie } from "./zombies";

export type Target = Interactable | { kind: "zombie"; z: Zombie } | { kind: "vehicle"; v: Vehicle };

/** One thing the player can do to something in the world. */
export interface Interaction {
  id: string;
  label: string;
  /** Missing tools or materials, as readable names. Empty = can do it now. */
  needs: string[];
  /** Chance of success, or null when it can't fail. */
  chance: number | null;
  /** Seconds of work; 0 = instant. */
  time: number;
  /** Skill trained by trying. */
  skill?: SkillId;
  /** How far the racket carries, in tiles. */
  noise?: number;
  run(ok: boolean): void;
}

/** What the interaction rules need from the game. */
export interface Host {
  readonly world: World;
  readonly player: Player;
  say(text: string, ms?: number): void;
  hurt(): void;
  hasItem(id: string): boolean;
  takeItem(id: string): Item | undefined;
  /** Use up n rounds from a box-style item (nails). */
  takeRounds(id: string, n: number): boolean;
  give(items: Item[]): void;
  dropItems(x: number, y: number, items: Item[]): void;
  open(o: ObjectInstance): void;
  toggleDoor(e: EdgeInstance): void;
  sit(o: ObjectInstance): void;
}

/** Things you can sit on. */
export const SEATS = new Set(["bench", "chair", "sofa", "armchair", "picnic_table"]);

const NAMES: Record<string, string> = {
  hammer: "hammer", plank: "plank", nails: "nails", crowbar: "crowbar", sledgehammer: "sledgehammer",
  fire_axe: "axe", saw: "saw", wrench: "wrench",
};

const WOOD_WALLS = new Set(["siding", "wallpaper", "kitchen", "bathroom"]);
const METAL_THINGS = /metal|fridge|stove|dumpster|toolbox|sink|bathtub|toilet|tire_rack|parts_shelf|drinks_cooler|trash_can|mailbox|checkout|vanity/;
const BOTTLES = new Set(["water", "hot_sauce", "pickles"]);

export function isBottle(item: Item): boolean {
  return BOTTLES.has(item.def.id);
}

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const randInt = (lo: number, hi: number) => Math.floor(rand(lo, hi + 1));
const items = (id: string, n: number) => Array.from({ length: n }, () => createItem(id));

/** Every action available on a target right now, in menu order. */
export function interactionsFor(h: Host, t: Target): Interaction[] {
  if (t.kind === "edge") return edgeActions(h, t.edge);
  if (t.kind === "object") return objectActions(h, t.obj);
  if (t.kind === "vehicle") return vehicleActions(h, t.v);
  return [];
}

/** The first of these tools the player is carrying. */
function bestTool(h: Host, ids: string[]): string | null {
  return ids.find((id) => h.hasItem(id)) ?? null;
}

function sv(h: Host) {
  return h.player.survivor;
}

/** Heavier work goes faster for stronger people. */
function strengthTime(h: Host, t: number): number {
  return t * (1.3 - sv(h).attributes.strength * 0.06);
}

/** The tile across an edge from where the player stands. */
function acrossEdge(h: Host, e: EdgeInstance): Tile {
  const a = { x: e.x, y: e.y };
  const b = e.side === "N" ? { x: e.x, y: e.y - 1 } : { x: e.x - 1, y: e.y };
  const p = h.player;
  return p.tileX === a.x && p.tileY === a.y ? b : a;
}

function moveTo(h: Host, t: Tile): void {
  h.player.x = t.x + 0.5;
  h.player.y = t.y + 0.5;
}

/** A climbing accident. */
function fall(h: Host, height: "low" | "high"): void {
  const hp = h.player.health;
  if (height === "high") {
    hp.bruise(rand(6, 18));
    if (Math.random() < 0.35) hp.injure("laceration", 3);
    h.say("I slipped and fell! That hurt.", 2400);
  } else {
    hp.bruise(rand(1, 4));
    if (Math.random() < 0.2) hp.injure("scratch", 1);
    h.say("Stumbled. Didn't make it over.", 1800);
  }
  h.hurt();
}

function edgeActions(h: Host, e: EdgeInstance): Interaction[] {
  const out: Interaction[] = [];
  const s = sv(h);
  const c = e.comp;
  const door = !!c.door;
  const win = c.category === "window";
  const fence = c.category === "fence";
  const wall = c.category === "wall";
  const barr = e.barricade ?? 0;
  const equipped = h.player.equipped;

  if (door && !barr && !e.broken)
    out.push({ id: "toggle", label: e.state === "open" ? "Close" : "Open", needs: [], chance: null, time: 0, run: () => h.toggleDoor(e) });

  if (win && (e.state === "default" || e.state === "raised") && !barr)
    out.push({
      id: "window", label: e.state === "raised" ? "Close window" : "Open window", needs: [], chance: null, time: 0.6, noise: 2,
      run: () => {
        e.state = e.state === "raised" ? "default" : "raised";
      },
    });

  if (win && e.state === "default" && !barr)
    out.push({
      id: "smash", label: equipped ? `Smash window (${equipped.def.name.toLowerCase()})` : "Smash window (bare hands)",
      needs: [], chance: null, time: 1, noise: 12,
      run: () => {
        e.state = "broken";
        // glass falls both ways: some at your feet, some on the far side
        h.dropItems(h.player.tileX, h.player.tileY, items("glass_shard", randInt(1, 2)));
        const far = acrossEdge(h, e);
        if (h.world.isWalkable(far.x, far.y)) h.dropItems(far.x, far.y, items("glass_shard", randInt(1, 2)));
        if (!h.player.equipped && Math.random() < 0.5) {
          h.player.health.injure("laceration", 4, Math.random() < 0.5 ? "Left Hand" : "Right Hand");
          h.hurt();
          h.say("Smashed it, and sliced my hand open.", 2400);
        } else h.say("CRASH. Glass everywhere.", 1600);
      },
    });

  if (win && e.state === "broken" && !barr)
    out.push({
      id: "clear", label: "Clear out the glass", needs: [], chance: null, time: 3,
      run: () => {
        e.state = "open";
        if (!h.player.equipped && Math.random() < 0.3) {
          h.player.health.injure("scratch", 1, "Right Hand");
          h.say("Nicked my fingers on the last bits.", 1800);
        }
      },
    });

  if (win && e.state !== "default" && !barr) {
    const jagged = e.state === "broken";
    out.push({
      id: "climb", label: jagged ? "Climb through (jagged glass)" : "Climb through", needs: [], skill: "athletics",
      ...s.task("athletics", jagged ? 0.8 : 0.95, 2.5),
      run: (ok) => {
        if (!ok) return fall(h, "low");
        moveTo(h, acrossEdge(h, e));
        if (jagged && Math.random() < 0.35) {
          h.player.health.injure("laceration", 4);
          h.hurt();
          h.say("Made it through, but the glass got me.", 2200);
        }
      },
    });
  }

  if (fence)
    out.push({
      id: "climb", label: "Climb over", needs: [], skill: "athletics",
      ...s.task("athletics", c.height < 40 ? 0.95 : 0.8, 2.5),
      run: (ok) => (ok ? moveTo(h, acrossEdge(h, e)) : fall(h, "low")),
    });

  if (wall || (door && e.state !== "open") || (win && e.state === "default"))
    out.push({
      id: "climb", label: "Climb over the top", needs: [], skill: "athletics",
      ...s.task("athletics", 0.3 + s.attributes.fitness * 0.02 + s.attributes.strength * 0.01, 8),
      run: (ok) => (ok ? moveTo(h, acrossEdge(h, e)) : fall(h, "high")),
    });

  if ((door || win) && barr < 4) {
    const needs = ["hammer", "plank"].filter((id) => !h.hasItem(id)).map((id) => NAMES[id]);
    if (!h.hasItem("nails")) needs.push("nails");
    out.push({
      id: "barricade", label: barr ? `Add a plank (${barr}/4)` : "Barricade", needs, skill: "carpentry", noise: 8,
      ...s.task("carpentry", 0.8, 10),
      run: (ok) => {
        if (!ok) {
          h.takeRounds("nails", 1);
          return h.say("Bent the nail. Again.", 1600);
        }
        if (!h.takeRounds("nails", 2) || !h.takeItem("plank")) return;
        e.barricade = barr + 1;
        e.barricadeHp = 5;
        h.say(e.barricade === 4 ? "That's as solid as it gets." : "Nailed a plank across.", 1600);
      },
    });
  }

  if (barr > 0) {
    const tool = bestTool(h, ["crowbar", "hammer"]);
    out.push({
      id: "unbarricade", label: "Pry off a plank", needs: tool ? [] : ["a hammer or crowbar"], skill: "carpentry", noise: 6,
      ...s.task("carpentry", tool === "crowbar" ? 0.9 : 0.8, 6),
      run: (ok) => {
        if (!ok) return h.say("It's nailed in tight.", 1500);
        e.barricade = barr - 1;
        e.barricadeHp = 5;
        if (Math.random() < 0.7) h.give(items("plank", 1));
        else h.say("The plank split coming off.", 1500);
      },
    });
  }

  if (door && e.state !== "open" && !e.broken && !barr) {
    const tool = bestTool(h, ["sledgehammer", "fire_axe", "crowbar"]);
    const [base, time] = tool === "sledgehammer" ? [0.75, 10] : tool === "fire_axe" ? [0.7, 12] : tool === "crowbar" ? [0.6, 14] : [0.2, 8];
    out.push({
      id: "breakdoor", label: tool ? `Break it down (${NAMES[tool]})` : "Kick it in", needs: [], skill: "carpentry", noise: 14,
      chance: Math.min(0.97, s.task("carpentry", base, time).chance + s.attributes.strength * 0.02),
      time: strengthTime(h, time),
      run: (ok) => {
        if (!ok) {
          if (!tool && Math.random() < 0.15) {
            h.player.health.bruise(3);
            return h.say("Ow. My foot.", 1500);
          }
          return h.say("It held. Again.", 1400);
        }
        e.state = "open";
        e.broken = true;
        h.say("The door bursts open.", 1600);
      },
    });
  }

  // tear the whole thing down
  const demoTools = wall ? ["sledgehammer"] : fence ? ["sledgehammer", "fire_axe", "crowbar", "saw"] : ["sledgehammer", "fire_axe", "crowbar"];
  const tool = bestTool(h, demoTools);
  const style = c.id.split("_").slice(1).join("_");
  const baseTime = wall ? 45 : win ? 35 : door ? 25 : 15;
  out.push({
    id: "demolish", label: wall ? "Demolish wall" : `Tear down ${c.name.toLowerCase()}`,
    needs: tool ? [] : [wall ? "a sledgehammer" : "a sledgehammer, axe or crowbar"], skill: "carpentry", noise: wall ? 18 : 12,
    chance: s.task("carpentry", 0.7, baseTime).chance,
    time: strengthTime(h, s.task("carpentry", 0.7, baseTime).time),
    run: (ok) => {
      if (!ok) return h.say("It's not giving way yet. Keep at it.", 1800);
      h.world.removeEdge(e);
      const planks = fence ? (c.height > 40 ? 2 : 1) : door && c.id !== "door_glass" ? 2 : WOOD_WALLS.has(style) ? randInt(1, 2) : 0;
      if (planks) h.dropItems(h.player.tileX, h.player.tileY, items("plank", planks));
      // inexperienced demolition can bring bits down on your head
      if (wall && Math.random() < 0.12 * (1 - s.skills.carpentry * 0.1)) {
        h.player.health.bruise(rand(5, 12));
        h.hurt();
        h.say("Down it came, and part of it on me.", 2200);
      } else h.say(wall ? "The wall comes down." : "Torn down.", 1600);
    },
  });
  return out;
}

function objectActions(h: Host, o: ObjectInstance): Interaction[] {
  const out: Interaction[] = [];
  const s = sv(h);
  const c = o.comp;
  const nature = c.category === "nature";
  const tree = c.id.startsWith("tree_");
  const special = c.id === "item_pile" || c.id === "gas_pump" || c.id === "stairs_wood";

  if (c.container) out.push({ id: "open", label: c.id === "corpse" ? "Search" : "Open", needs: [], chance: null, time: 0, run: () => h.open(o) });
  if (SEATS.has(c.id)) out.push({ id: "sit", label: "Sit down", needs: [], chance: null, time: 0, run: () => h.sit(o) });

  // push or drag things around: block doors, clear a path
  if (!nature && !special && o.wx * o.wy <= 2) {
    const heavy = c.height >= 60 || o.wx * o.wy > 1;
    const base = (heavy ? 0.5 : 0.9) + s.attributes.strength * 0.03;
    out.push({
      id: "push", label: c.id === "corpse" ? "Drag" : "Push", needs: [], skill: "athletics", noise: 6,
      chance: Math.min(0.98, s.task("athletics", base, heavy ? 4 : 2).chance), time: s.task("athletics", base, heavy ? 4 : 2).time,
      run: (ok) => {
        if (!ok) return h.say("Too heavy. It barely moved.", 1600);
        const p = h.player;
        const cx = o.x + o.wx / 2 - p.x;
        const cy = o.y + o.wy / 2 - p.y;
        const [dx, dy] = Math.abs(cx) > Math.abs(cy) ? [Math.sign(cx), 0] : [0, Math.sign(cy)];
        if (!h.world.moveObject(o, dx, dy)) h.say("Something's in the way.", 1500);
      },
    });
  }

  // vault low furniture
  if (c.solid && c.height <= 60 && !nature && !special)
    out.push({
      id: "climb", label: "Climb over", needs: [], skill: "athletics", ...s.task("athletics", 0.92, 2.5),
      run: (ok) => {
        if (!ok) return fall(h, "low");
        const p = h.player;
        const dx = Math.sign(Math.round(o.x + o.wx / 2 - 0.5 - p.tileX));
        const dy = Math.sign(Math.round(o.y + o.wy / 2 - 0.5 - p.tileY));
        for (let i = 1; i <= 3; i++) {
          const t = { x: p.tileX + dx * i, y: p.tileY + dy * i };
          if (h.world.solidAt(t.x, t.y) === o) continue;
          if (h.world.isWalkable(t.x, t.y)) return moveTo(h, t);
          break;
        }
        h.say("There's nowhere to land on the other side.", 1800);
      },
    });

  if (tree) {
    const tool = bestTool(h, ["fire_axe", "saw"]);
    out.push({
      id: "chop", label: "Chop down", needs: tool ? [] : ["an axe or saw"], skill: "carpentry", noise: 10,
      chance: s.task("carpentry", tool === "saw" ? 0.7 : 0.8, 1).chance,
      time: strengthTime(h, s.task("carpentry", 0.8, tool === "saw" ? 70 : 40).time),
      run: (ok) => {
        if (!ok) return h.say("Barely a dent. Keep chopping.", 1600);
        h.world.removeObject(o);
        h.dropItems(o.x, o.y, items("plank", randInt(3, 5)));
        h.say("Timber!", 1600);
      },
    });
  } else if (nature) {
    out.push({
      id: "clear", label: "Clear away", needs: [], chance: null, time: h.hasItem("machete") || h.hasItem("fire_axe") ? 3 : 8,
      run: () => {
        h.world.removeObject(o);
        if (o.inventory?.items.length) h.dropItems(o.x, o.y, o.inventory.items);
      },
    });
  }

  // break furniture down for materials
  if (!nature && !special && c.id !== "corpse") {
    const metal = METAL_THINGS.test(c.id);
    const tool = bestTool(h, metal ? ["wrench", "sledgehammer", "crowbar"] : ["saw", "hammer", "crowbar", "sledgehammer"]);
    const time = 12 + c.height / 5 + o.wx * o.wy * 4;
    out.push({
      id: "dismantle", label: "Take apart", needs: tool ? [] : [metal ? "a wrench, crowbar or sledgehammer" : "a saw, hammer or crowbar"],
      skill: "carpentry", noise: 8, ...s.task("carpentry", 0.75, time),
      run: (ok) => {
        if (!ok) return h.say("Can't get it apart. Try again.", 1600);
        h.world.removeObject(o);
        const loot = [...(o.inventory?.items ?? [])];
        const n = Math.max(1, Math.round(c.height / 30 + o.wx * o.wy - 1));
        loot.push(...items(metal ? "scrap_metal" : "plank", Math.min(4, n)));
        h.dropItems(o.x, o.y, loot);
        h.say(`Took the ${c.name.toLowerCase()} apart.`, 1600);
      },
    });
  }
  return out;
}

function vehicleActions(h: Host, v: Vehicle): Interaction[] {
  const s = sv(h);
  return [
    {
      id: "push", label: "Push", needs: [], skill: "athletics", ...s.task("athletics", 0.6 + s.attributes.strength * 0.03, 2),
      run: (ok) => {
        if (!ok) return h.say("It won't budge.", 1400);
        const p = h.player;
        const dx = v.x - p.x;
        const dy = v.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const shove = (1.6 + s.attributes.strength * 0.12) / v.type.toughness;
        v.handbrake = false;
        v.vx += (dx / d) * shove;
        v.vy += (dy / d) * shove;
      },
    },
    {
      id: "climb", label: "Climb over", needs: [], skill: "athletics", ...s.task("athletics", 0.85, 3),
      run: (ok) => {
        if (!ok) return fall(h, "low");
        const p = h.player;
        const dx = v.x - p.x;
        const dy = v.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        for (let k = d + 0.6; k < d + 3.5; k += 0.3) {
          const t = { x: Math.floor(p.x + (dx / d) * k), y: Math.floor(p.y + (dy / d) * k) };
          if (h.world.isWalkable(t.x, t.y)) return moveTo(h, t);
        }
        h.say("No room on the other side.", 1500);
      },
    },
  ];
}
