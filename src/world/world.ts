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
  /** Doors: how much more banging they can take before giving way. */
  hp?: number;
  /** Doors smashed open by zombies can't be closed again. */
  broken?: boolean;
  /** Planks nailed across (0..4). Blocks everything until torn off. */
  barricade?: number;
  /** Banging left before the outermost plank gives. */
  barricadeHp?: number;
}

/** Can a zombie get through this edge by bashing or climbing (door, window, barricade, low fence)? */
export function zombiePassable(e: EdgeInstance): boolean {
  if ((e.barricade ?? 0) > 0) return true;
  if (e.comp.door || e.comp.category === "window") return true;
  return e.comp.category === "fence" && e.comp.height < 60;
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
  /** Vehicle id + 1 per tile, 0 = none. Vehicles move, so this is kept separate from `solid`. */
  private vehicles: Int32Array;
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
    this.vehicles = new Int32Array(this.width * this.height);
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

  removeObject(o: ObjectInstance): void {
    const i = this.objects.indexOf(o);
    if (i >= 0) this.objects.splice(i, 1);
    for (let dy = 0; dy < o.wy; dy++)
      for (let dx = 0; dx < o.wx; dx++)
        if (this.solidAt(o.x + dx, o.y + dy) === o) this.solid[(o.y + dy) * this.width + o.x + dx] = null;
  }

  vehicleAt(x: number, y: number): number {
    return this.inBounds(x, y) ? this.vehicles[y * this.width + x] : 0;
  }

  /** Move a vehicle's claim from one set of tiles (keys are y*4096+x) to another. */
  setVehicleTiles(id: number, from: number[], to: number[]): void {
    for (const k of from) {
      const x = k % 4096;
      const y = Math.floor(k / 4096);
      if (this.inBounds(x, y) && this.vehicles[y * this.width + x] === id) this.vehicles[y * this.width + x] = 0;
    }
    for (const k of to) {
      const x = k % 4096;
      const y = Math.floor(k / 4096);
      if (this.inBounds(x, y)) this.vehicles[y * this.width + x] = id;
    }
  }

  /** Does an edge block an orthogonal step from (x, y) by (dx, dy)? */
  stepBlocked(x: number, y: number, dx: number, dy: number): boolean {
    const e = this.edgeBetween(x, y, dx, dy);
    return !!e && e.comp.blocksMovement(e.state);
  }

  edge(x: number, y: number, side: Side): EdgeInstance | undefined {
    return this.edges.get(edgeId(x, y, side));
  }

  solidAt(x: number, y: number): ObjectInstance | null {
    return this.inBounds(x, y) ? this.solid[y * this.width + x] : null;
  }

  isWalkable(x: number, y: number): boolean {
    const i = y * this.width + x;
    return this.inBounds(x, y) && !this.solid[i] && !this.vehicles[i] && this.floors[i] !== null;
  }

  /** The edge crossed by an orthogonal step, if any. */
  edgeBetween(x: number, y: number, dx: number, dy: number): EdgeInstance | undefined {
    if (dx === 1) return this.edge(x + 1, y, "W");
    if (dx === -1) return this.edge(x, y, "W");
    if (dy === 1) return this.edge(x, y + 1, "N");
    if (dy === -1) return this.edge(x, y, "N");
    return undefined;
  }

  /**
   * Whether an edge blocks a step. With `throughDoors` (pathing for the player through doors
   * they'll open, or zombies who bash and climb) passable obstacles don't count.
   */
  private edgeBlocks(e: EdgeInstance | undefined, throughDoors: boolean): boolean {
    if (!e) return false;
    if (throughDoors && this.bashers && zombiePassable(e)) return false;
    if ((e.barricade ?? 0) > 0) return true;
    if (throughDoors && e.comp.door) return false;
    return e.comp.blocksMovement(e.state);
  }

  /** Set while pathing for zombies: windows, barricades and low fences count as passable. */
  bashers = false;

  removeEdge(e: EdgeInstance): void {
    this.edges.delete(edgeId(e.x, e.y, e.side));
  }

  /** Slide an object by (dx, dy) tiles if the space is free and no wall is in the way. */
  moveObject(o: ObjectInstance, dx: number, dy: number): boolean {
    for (let ty = 0; ty < o.wy; ty++)
      for (let tx = 0; tx < o.wx; tx++) {
        const nx = o.x + tx + dx;
        const ny = o.y + ty + dy;
        const occupant = this.solidAt(nx, ny);
        if (!this.inBounds(nx, ny) || this.floors[ny * this.width + nx] === null || this.vehicleAt(nx, ny)) return false;
        if (occupant && occupant !== o) return false;
        if (this.stepBlocked(o.x + tx, o.y + ty, dx, dy) || this.edgeBarricaded(o.x + tx, o.y + ty, dx, dy)) return false;
      }
    const solid = o.comp.solid;
    if (solid) this.removeObject(o);
    o.x += dx;
    o.y += dy;
    if (solid) {
      this.objects.push(o);
      for (let ty = 0; ty < o.wy; ty++) for (let tx = 0; tx < o.wx; tx++) this.solid[(o.y + ty) * this.width + o.x + tx] = o;
    }
    return true;
  }

  private edgeBarricaded(x: number, y: number, dx: number, dy: number): boolean {
    return (this.edgeBetween(x, y, dx, dy)?.barricade ?? 0) > 0;
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

  /** Does this edge block line of sight? Solid walls and closed wooden doors do; windows, fences and glass don't. */
  blocksSight(e: EdgeInstance | undefined): boolean {
    if (!e) return false;
    if ((e.barricade ?? 0) >= 2) return true;
    if (e.comp.door) return e.state !== "open" && e.comp.id !== "door_glass";
    return e.comp.category === "wall";
  }

  /**
   * Line of sight between two points in tile space, walking the tile grid along the line and
   * checking every border crossed.
   */
  canSee(x0: number, y0: number, x1: number, y1: number): boolean {
    let tx = Math.floor(x0);
    let ty = Math.floor(y0);
    const ex = Math.floor(x1);
    const ey = Math.floor(y1);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);
    const tdx = sx ? Math.abs(1 / dx) : Infinity;
    const tdy = sy ? Math.abs(1 / dy) : Infinity;
    let tmx = sx > 0 ? (tx + 1 - x0) * tdx : sx < 0 ? (x0 - tx) * tdx : Infinity;
    let tmy = sy > 0 ? (ty + 1 - y0) * tdy : sy < 0 ? (y0 - ty) * tdy : Infinity;
    for (let guard = 0; guard < 128 && (tx !== ex || ty !== ey); guard++) {
      if (tmx < tmy) {
        if (this.blocksSight(this.edgeBetween(tx, ty, sx, 0))) return false;
        tx += sx;
        tmx += tdx;
      } else {
        if (this.blocksSight(this.edgeBetween(tx, ty, 0, sy))) return false;
        ty += sy;
        tmy += tdy;
      }
    }
    return true;
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
    if (!o.comp.solid && this.isWalkable(o.x, o.y)) {
      out.push({ x: o.x, y: o.y });
      seen.add(`${o.x},${o.y}`);
    }
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
