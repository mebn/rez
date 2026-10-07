import { registry } from "../core/registry";
import { hash2, Rng } from "../core/rng";
import type { EdgeComponent, Facing, ObjectComponent, Side } from "../core/types";
import { rollLoot } from "../items/loot";
import { createItem } from "../items/registry";
import { Inventory } from "./inventory";
import type { MapData, ObjectPlacement } from "./map-data";

export interface ObjectInstance {
  uid: number;
  comp: ObjectComponent;
  x: number;
  y: number;
  facing: Facing;
  state: string;
  /** Footprint size in world tiles (after rotation). */
  wx: number;
  wy: number;
  placement: ObjectPlacement;
  inventory?: Inventory;
  fade: number;
}

export interface EdgeInstance {
  uid: number;
  comp: EdgeComponent;
  x: number;
  y: number;
  side: Side;
  state: string;
  fade: number;
}

export interface FloorInstance {
  id: string;
  variant: number;
}

export type Interactable = { kind: "object"; obj: ObjectInstance } | { kind: "edge"; edge: EdgeInstance };

const edgeId = (x: number, y: number, side: Side) => `${x},${y},${side}`;

export class World {
  readonly width: number;
  readonly height: number;
  readonly floors: (FloorInstance | null)[];
  readonly objects: ObjectInstance[] = [];
  readonly edges = new Map<string, EdgeInstance>();
  private solid: (ObjectInstance | null)[];
  private uid = 1;
  readonly seed: number;

  constructor(readonly data: MapData) {
    this.width = data.width;
    this.height = data.height;
    this.seed = data.seed;
    this.floors = data.tiles.map((t, i) => {
      if (t < 0) return null;
      const id = data.floorPalette[t];
      const comp = registry.floor(id);
      const x = i % data.width;
      const y = Math.floor(i / data.width);
      return { id, variant: hash2(x, y, data.seed) % comp.variants };
    });
    this.solid = new Array(this.width * this.height).fill(null);
    for (const e of data.edges) this.addEdge(e.type, e.x, e.y, e.side, e.state);
    for (const o of data.objects) this.addObject(o);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  addEdge(type: string, x: number, y: number, side: Side, state?: string): EdgeInstance {
    const comp = registry.edge(type);
    const inst: EdgeInstance = { uid: this.uid++, comp, x, y, side, state: state ?? comp.states[0], fade: 1 };
    this.edges.set(edgeId(x, y, side), inst);
    return inst;
  }

  addObject(p: ObjectPlacement): ObjectInstance {
    const comp = registry.object(p.type);
    const facing = p.facing ?? "S";
    const swap = facing === "E" || facing === "W";
    const inst: ObjectInstance = {
      uid: this.uid++,
      comp,
      x: p.x,
      y: p.y,
      facing,
      state: p.state ?? comp.states?.[0] ?? "default",
      wx: swap ? comp.size[1] : comp.size[0],
      wy: swap ? comp.size[0] : comp.size[1],
      placement: p,
      fade: 1,
    };
    this.objects.push(inst);
    if (comp.solid) {
      for (let dy = 0; dy < inst.wy; dy++)
        for (let dx = 0; dx < inst.wx; dx++) {
          const tx = p.x + dx;
          const ty = p.y + dy;
          if (this.inBounds(tx, ty)) this.solid[ty * this.width + tx] = inst;
        }
    }
    return inst;
  }

  edge(x: number, y: number, side: Side): EdgeInstance | undefined {
    return this.edges.get(edgeId(x, y, side));
  }

  solidAt(x: number, y: number): ObjectInstance | null {
    return this.inBounds(x, y) ? this.solid[y * this.width + x] : null;
  }

  isWalkable(x: number, y: number): boolean {
    return this.inBounds(x, y) && !this.solid[y * this.width + x] && this.floors[y * this.width + x] !== null;
  }

  /** The edge crossed by an orthogonal step, if any. */
  edgeBetween(x: number, y: number, dx: number, dy: number): EdgeInstance | undefined {
    if (dx === 1) return this.edge(x + 1, y, "W");
    if (dx === -1) return this.edge(x, y, "W");
    if (dy === 1) return this.edge(x, y + 1, "N");
    if (dy === -1) return this.edge(x, y, "N");
    return undefined;
  }

  /** Whether an edge blocks a step. Closed doors count as open when `throughDoors` is set. */
  private edgeBlocks(e: EdgeInstance | undefined, throughDoors: boolean): boolean {
    if (!e) return false;
    if (throughDoors && e.comp.door) return false;
    return e.comp.blocksMovement(e.state);
  }

  /** Can you step from (x,y) by (dx,dy)? Diagonals need both orthogonal routes clear (no corner cutting). */
  canStep(x: number, y: number, dx: number, dy: number, throughDoors = false, ignoreTarget = false): boolean {
    const nx = x + dx;
    const ny = y + dy;
    if (!ignoreTarget && !this.isWalkable(nx, ny)) return false;
    if (dx !== 0 && dy !== 0) {
      if (!this.isWalkable(x + dx, y) || !this.isWalkable(x, y + dy)) return false;
      return (
        !this.edgeBlocks(this.edgeBetween(x, y, dx, 0), false) &&
        !this.edgeBlocks(this.edgeBetween(x + dx, y, 0, dy), false) &&
        !this.edgeBlocks(this.edgeBetween(x, y, 0, dy), false) &&
        !this.edgeBlocks(this.edgeBetween(x, y + dy, dx, 0), false)
      );
    }
    return !this.edgeBlocks(this.edgeBetween(x, y, dx, dy), throughDoors);
  }

  /** Tiles a player can stand on to use the thing. */
  interactTiles(target: Interactable): { x: number; y: number }[] {
    if (target.kind === "edge") {
      const e = target.edge;
      const other = e.side === "N" ? { x: e.x, y: e.y - 1 } : { x: e.x - 1, y: e.y };
      return [{ x: e.x, y: e.y }, other].filter((t) => this.isWalkable(t.x, t.y));
    }
    const o = target.obj;
    const out: { x: number; y: number }[] = [];
    const seen = new Set<string>();
    for (let dy = 0; dy < o.wy; dy++)
      for (let dx = 0; dx < o.wx; dx++) {
        const fx = o.x + dx;
        const fy = o.y + dy;
        for (const [sx, sy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const tx = fx + sx;
          const ty = fy + sy;
          const k = `${tx},${ty}`;
          if (seen.has(k) || this.solidAt(tx, ty) === o) continue;
          // must be able to reach across the shared border (no wall in between)
          if (!this.isWalkable(tx, ty) || !this.canStep(tx, ty, -sx, -sy, false, true)) continue;
          seen.add(k);
          out.push({ x: tx, y: ty });
        }
      }
    return out;
  }

  /** Container inventory, rolled from the loot table the first time it's opened. */
  containerOf(o: ObjectInstance): Inventory | undefined {
    const spec = o.comp.container;
    if (!spec) return undefined;
    if (!o.inventory) {
      const inv = new Inventory(spec.label ?? o.comp.name, spec.capacity);
      if (o.placement.contents) {
        for (const c of o.placement.contents) for (let i = 0; i < (c.count ?? 1); i++) inv.items.push(createItem(c.item));
      } else {
        inv.items.push(...rollLoot(spec.loot, new Rng(hash2(o.x, o.y, this.seed + o.uid))));
      }
      o.inventory = inv;
    }
    return o.inventory;
  }
}
