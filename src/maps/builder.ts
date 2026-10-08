import type { Facing, Side } from "../core/types";
import type { EdgePlacement, LevelData, MapData, ObjectPlacement, StairPlacement, VehiclePlacement } from "../world/map-data";

const DIR: Record<Facing, [number, number]> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
const OPPOSITE: Record<Facing, Facing> = { N: "S", S: "N", E: "W", W: "E" };

type EdgeDraft =
  | { kind: "wall" | "window"; x: number; y: number; side: Side; exterior: string }
  | { kind: "fixed"; x: number; y: number; side: Side; type: string; state?: string };

export interface RoomOptions {
  floor: string;
  /** Interior wall style key (wall_<key>). */
  wall: string;
  /** Style shown on the outside faces of this room's walls. */
  exterior?: string;
}

/**
 * Helper for authoring maps in code. Produces plain MapData, the same format a
 * world builder would save.
 */
export class MapBuilder {
  private palette: string[] = [];
  private tiles: number[];
  /** Interior wall style per tile (null = outdoors). */
  private zone: (string | null)[];
  private edges = new Map<string, EdgeDraft>();
  private objects: ObjectPlacement[] = [];
  private vehicles: VehiclePlacement[] = [];
  private storeys: MapBuilder[] = [];
  private flights: StairPlacement[] = [];

  constructor(
    private name: string,
    readonly width: number,
    readonly height: number,
    private seed: number,
  ) {
    this.tiles = new Array(width * height).fill(-1);
    this.zone = new Array(width * height).fill(null);
  }

  private pal(id: string): number {
    let i = this.palette.indexOf(id);
    if (i < 0) i = this.palette.push(id) - 1;
    return i;
  }

  /** Fill floor in [x0,x1) x [y0,y1). */
  floor(x0: number, y0: number, x1: number, y1: number, id: string): this {
    const p = this.pal(id);
    for (let y = Math.max(0, y0); y < Math.min(this.height, y1); y++)
      for (let x = Math.max(0, x0); x < Math.min(this.width, x1); x++) this.tiles[y * this.width + x] = p;
    return this;
  }

  setFloor(x: number, y: number, id: string): this {
    return this.floor(x, y, x + 1, y + 1, id);
  }

  /** A walled room covering [x0,x1) x [y0,y1). */
  room(x0: number, y0: number, x1: number, y1: number, o: RoomOptions): this {
    const ext = o.exterior ?? "siding";
    this.floor(x0, y0, x1, y1, o.floor);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) this.zone[y * this.width + x] = o.wall;
    for (let x = x0; x < x1; x++) {
      this.wall(x, y0, "N", ext);
      this.wall(x, y1, "N", ext);
    }
    for (let y = y0; y < y1; y++) {
      this.wall(x0, y, "W", ext);
      this.wall(x1, y, "W", ext);
    }
    return this;
  }

  private key(x: number, y: number, side: Side): string {
    return `${x},${y},${side}`;
  }

  wall(x: number, y: number, side: Side, exterior = "siding"): this {
    const prev = this.edges.get(this.key(x, y, side));
    // keep the first-assigned exterior so shared walls stay consistent
    const ext = prev && prev.kind !== "fixed" ? prev.exterior : exterior;
    this.edges.set(this.key(x, y, side), { kind: "wall", x, y, side, exterior: ext });
    return this;
  }

  window(x: number, y: number, side: Side): this {
    const prev = this.edges.get(this.key(x, y, side));
    const ext = prev && prev.kind !== "fixed" ? prev.exterior : "siding";
    this.edges.set(this.key(x, y, side), { kind: "window", x, y, side, exterior: ext });
    return this;
  }

  door(x: number, y: number, side: Side, type = "door_white", state = "closed"): this {
    this.edges.set(this.key(x, y, side), { kind: "fixed", x, y, side, type, state });
    return this;
  }

  /** Remove an edge (e.g. a garage door opening). */
  open(x: number, y: number, side: Side): this {
    this.edges.delete(this.key(x, y, side));
    return this;
  }

  edge(x: number, y: number, side: Side, type: string): this {
    this.edges.set(this.key(x, y, side), { kind: "fixed", x, y, side, type });
    return this;
  }

  /** Fence around the border of [x0,x1) x [y0,y1); pass sides to limit which are drawn. */
  fence(x0: number, y0: number, x1: number, y1: number, type: string, sides = "NSWE", gaps: [number, number, Side][] = []): this {
    const skip = new Set(gaps.map(([x, y, s]) => this.key(x, y, s)));
    const put = (x: number, y: number, s: Side) => {
      if (!skip.has(this.key(x, y, s))) this.edge(x, y, s, type);
    };
    for (let x = x0; x < x1; x++) {
      if (sides.includes("N")) put(x, y0, "N");
      if (sides.includes("S")) put(x, y1, "N");
    }
    for (let y = y0; y < y1; y++) {
      if (sides.includes("W")) put(x0, y, "W");
      if (sides.includes("E")) put(x1, y, "W");
    }
    return this;
  }

  place(type: string, x: number, y: number, facing: Facing = "S", contents?: ObjectPlacement["contents"]): this {
    this.objects.push({ type, x, y, facing, ...(contents ? { contents } : {}) });
    return this;
  }

  /**
   * The builder for storey z (1 = first floor up). Upper storeys start as open air; lay rooms
   * on them like on the ground. Only call this on the ground builder.
   */
  storey(z: number): MapBuilder {
    while (this.storeys.length < z) {
      const s = new MapBuilder(this.name, this.width, this.height, this.seed);
      this.storeys.push(s);
    }
    return this.storeys[z - 1];
  }

  /**
   * A staircase on storey z, bottom step at (x, y), climbing toward dir for three tiles to
   * storey z + 1. The storey above gets a railed opening over the lower two steps; the top
   * step's tile up there is the landing and keeps its floor.
   */
  stairs(x: number, y: number, dir: Facing, z = 0): this {
    const [dx, dy] = DIR[dir];
    const tx = x + dx * 2;
    const ty = y + dy * 2;
    const at = z === 0 ? this : this.storey(z);
    at.objects.push({ type: "stairs_wood", x: Math.min(x, tx), y: Math.min(y, ty), facing: OPPOSITE[dir] });
    this.flights.push({ x, y, dir, z });
    return this;
  }

  private layer(): LevelData {
    return { floorPalette: this.palette, tiles: this.tiles, edges: this.edgeList(), objects: this.objects };
  }

  /** Cut the stairwell into the storey above each flight and rail it off. */
  private cutStairwells(): void {
    for (const s of this.flights) {
      const up = this.storey(s.z + 1);
      const [dx, dy] = DIR[s.dir];
      const b0 = { x: s.x, y: s.y };
      const b1 = { x: s.x + dx, y: s.y + dy };
      // the lower step is open air, the next one is where you step down onto the flight
      up.tiles[b0.y * up.width + b0.x] = -1;
      up.setFloor(b1.x, b1.y, "stair_gap");
      const [px, py] = [-dy, dx];
      for (const t of [b0, b1])
        for (const sgn of [1, -1]) up.rail(t.x, t.y, px * sgn, py * sgn);
      up.rail(b0.x, b0.y, -dx, -dy);
    }
  }

  /** Railing on the border of (x, y) toward (dx, dy). */
  private rail(x: number, y: number, dx: number, dy: number): void {
    const [ex, ey, side]: [number, number, Side] =
      dx === 1 ? [x + 1, y, "W"] : dx === -1 ? [x, y, "W"] : dy === 1 ? [x, y + 1, "N"] : [x, y, "N"];
    if (!this.edges.has(this.key(ex, ey, side))) this.edge(ex, ey, side, "railing_wood");
  }

  vehicle(v: VehiclePlacement): this {
    this.vehicles.push(v);
    return this;
  }

  build(spawn: { x: number; y: number }): MapData {
    this.cutStairwells();
    return {
      version: 1,
      name: this.name,
      width: this.width,
      height: this.height,
      seed: this.seed,
      floorPalette: this.palette,
      tiles: this.tiles,
      edges: this.edgeList(),
      objects: this.objects,
      vehicles: this.vehicles,
      ...(this.storeys.length ? { levels: this.storeys.map((s) => s.layer()), stairs: this.flights } : {}),
      spawn,
    };
  }

  private edgeList(): EdgePlacement[] {
    const edges: EdgePlacement[] = [];
    for (const e of this.edges.values()) {
      if (e.kind === "fixed") {
        edges.push({ type: e.type, x: e.x, y: e.y, side: e.side, ...(e.state ? { state: e.state } : {}) });
        continue;
      }
      // The visible face of an edge faces the tile it belongs to (x, y).
      const inside = e.x < this.width && e.y < this.height ? this.zone[e.y * this.width + e.x] : null;
      const style = inside ?? e.exterior;
      edges.push({ type: `${e.kind}_${style}`, x: e.x, y: e.y, side: e.side });
    }
    return edges;
  }
}
