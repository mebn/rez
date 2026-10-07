import type { VehicleShape } from "../art/vehicle";
import { Inventory } from "../world/inventory";
import type { Tile } from "../world/pathfinding";
import type { EdgeInstance, ObjectInstance, World } from "../world/world";

/** What a car ran into. */
export type Obstacle =
  | { kind: "edge"; e: EdgeInstance }
  | { kind: "object"; o: ObjectInstance }
  | { kind: "vehicle"; id: number }
  | { kind: "other" };

export interface VehicleType {
  id: string;
  name: string;
  shape: VehicleShape;
  paints: string[];
  /** Tiles per second on good wheels with a healthy engine. */
  maxSpeed: number;
  accel: number;
  brake: number;
  /** Steering rate (rad/s) at low speed. */
  turn: number;
  /** How much steering fades with speed. Big, heavy things turn wide. */
  understeer: number;
  /** How quickly sideways sliding is killed. Low = loose, slidey. */
  grip: number;
  /** Fuel tank in litres. */
  tank: number;
  /** Litres per tile driven. */
  burn: number;
  /** Divides collision damage. */
  toughness: number;
  trunk: number;
}

export const VEHICLE_TYPES: Record<string, VehicleType> = {
  compact: {
    id: "compact", name: "Hatchback",
    shape: { length: 1.9, width: 0.95, bodyH: 22, cabinH: 40, cabin: [0.18, 0.72] },
    paints: ["#3e8948", "#feae34", "#c0cbdc", "#0099db"],
    maxSpeed: 8, accel: 4.5, brake: 10, turn: 2.8, understeer: 0.06, grip: 8, tank: 35, burn: 0.035, toughness: 0.8, trunk: 25,
  },
  sedan: {
    id: "sedan", name: "Sedan",
    shape: { length: 2.3, width: 1.0, bodyH: 24, cabinH: 42, cabin: [0.25, 0.7] },
    paints: ["#5a6988", "#a22633", "#ead4aa", "#262b44"],
    maxSpeed: 9.5, accel: 4.5, brake: 9, turn: 2.3, understeer: 0.08, grip: 7, tank: 50, burn: 0.05, toughness: 1, trunk: 40,
  },
  pickup: {
    id: "pickup", name: "Pickup Truck",
    shape: { length: 2.6, width: 1.05, bodyH: 28, cabinH: 50, cabin: [0.45, 0.76], bed: true },
    paints: ["#733e39", "#124e89", "#c0cbdc", "#be4a2f"],
    maxSpeed: 9, accel: 4, brake: 8, turn: 1.9, understeer: 0.12, grip: 5, tank: 70, burn: 0.08, toughness: 1.6, trunk: 60,
  },
  sports: {
    id: "sports", name: "Sports Car",
    shape: { length: 2.2, width: 1.0, bodyH: 18, cabinH: 32, cabin: [0.3, 0.64] },
    paints: ["#e43b44", "#feae34", "#181425", "#ffffff"],
    maxSpeed: 13, accel: 7.5, brake: 11, turn: 2.6, understeer: 0.05, grip: 4.5, tank: 45, burn: 0.09, toughness: 0.7, trunk: 15,
  },
  van: {
    id: "van", name: "Van",
    shape: { length: 2.6, width: 1.1, bodyH: 26, cabinH: 58, cabin: [0.04, 0.88], van: true },
    paints: ["#ffffff", "#8b9bb4", "#265c42", "#68386c"],
    maxSpeed: 7.5, accel: 3, brake: 7, turn: 1.7, understeer: 0.14, grip: 4, tank: 70, burn: 0.085, toughness: 1.3, trunk: 80,
  },
};

const COLOR_NAMES: Record<string, string> = {
  "#3e8948": "Green", "#feae34": "Yellow", "#c0cbdc": "Silver", "#0099db": "Blue", "#5a6988": "Grey", "#a22633": "Red",
  "#ead4aa": "Beige", "#262b44": "Navy", "#733e39": "Brown", "#124e89": "Blue", "#be4a2f": "Orange", "#e43b44": "Red",
  "#181425": "Black", "#ffffff": "White", "#8b9bb4": "Grey", "#265c42": "Dark Green", "#68386c": "Purple",
};

/** Wheel slots: front-left, front-right, rear-left, rear-right. */
export const WHEEL_NAMES = ["Front left", "Front right", "Rear left", "Rear right"];
/** Where each wheel sits, as (forward, right) signs. */
const WHEEL_POS: [number, number][] = [[1, -1], [1, 1], [-1, -1], [-1, 1]];

export interface Wheel {
  /** 0..100, flat at 0. */
  condition: number;
}

/** Sub-steps per frame are capped at this many tiles so fast cars don't tunnel through walls. */
const STEP = 0.2;

export class Vehicle {
  x: number;
  y: number;
  heading: number;
  vx = 0;
  vy = 0;
  readonly type: VehicleType;
  paint: string;
  /** Overall engine and body condition, 0..100. Won't start at 0. */
  condition: number;
  fuel: number;
  wheels: (Wheel | null)[];
  engine = false;
  hotwired = false;
  readonly trunk: Inventory;
  /** Tiles currently claimed in the world's vehicle layer. */
  tiles: number[] = [];
  /** Throttle (-1..1) and steering (-1..1) from the driver. */
  throttle = 0;
  steer = 0;
  handbrake = false;
  /** Fades when the player walks behind it. */
  fade = 1;
  /** Set by a collision test that failed. */
  private hit: Obstacle = { kind: "other" };

  constructor(
    readonly id: number,
    typeId: string,
    x: number,
    y: number,
    heading: number,
  ) {
    this.type = VEHICLE_TYPES[typeId];
    this.x = x;
    this.y = y;
    this.heading = heading;
    this.paint = this.type.paints[id % this.type.paints.length];
    this.condition = 80;
    this.fuel = this.type.tank * 0.3;
    this.wheels = [0, 1, 2, 3].map(() => ({ condition: 90 }));
    this.trunk = new Inventory(`${this.type.name}: trunk & glovebox`, this.type.trunk);
  }

  get name(): string {
    const c = COLOR_NAMES[this.paint];
    return c ? `${c} ${this.type.name}` : this.type.name;
  }

  get forward(): [number, number] {
    return [Math.cos(this.heading), Math.sin(this.heading)];
  }

  /** Signed speed along the heading. */
  get speed(): number {
    const [fx, fy] = this.forward;
    return this.vx * fx + this.vy * fy;
  }

  /** 16-way sprite direction. */
  get dir16(): number {
    return ((Math.round(this.heading / (Math.PI / 8)) % 16) + 16) % 16;
  }

  wheelWorld(i: number): [number, number] {
    const [fx, fy] = this.forward;
    const L = this.type.shape.length / 2 - 0.35;
    const W = this.type.shape.width / 2;
    const [a, b] = WHEEL_POS[i];
    return [this.x + fx * a * L - fy * b * W, this.y + fy * a * L + fx * b * W];
  }

  /** Top speed after damage: flat or missing wheels and a worn engine slow you down. */
  get topSpeed(): number {
    let s = this.type.maxSpeed;
    for (const w of this.wheels) {
      if (!w) s *= 0.3;
      else if (w.condition <= 0) s *= 0.6;
    }
    if (this.condition < 30) s *= 0.55 + this.condition / 100;
    return s;
  }

  /** Chance the engine turns over on one try. */
  get startChance(): number {
    if (this.condition <= 0) return 0;
    return Math.min(1, 0.35 + this.condition / 100 * 0.75);
  }

  /** Points (forward, right) around the body, for collision tests. */
  private samples(x: number, y: number, h: number): [number, number][] {
    const f = [Math.cos(h), Math.sin(h)];
    const L = this.type.shape.length / 2;
    const W = this.type.shape.width / 2 - 0.05;
    const out: [number, number][] = [];
    for (let fw = -L; fw <= L + 1e-6; fw += L / 2)
      for (const rt of [-W, 0, W]) out.push([x + f[0] * fw - f[1] * rt, y + f[1] * fw + f[0] * rt]);
    return out;
  }

  /** Every tile the body covers. */
  footprint(): number[] {
    return [...new Set(this.samples(this.x, this.y, this.heading).map(([px, py]) => Math.floor(py) * 4096 + Math.floor(px)))];
  }

  /** Walkable tiles next to the car, for getting in and working on it. */
  accessTiles(world: World): Tile[] {
    const own = new Set(this.footprint());
    const out: Tile[] = [];
    const seen = new Set<number>();
    for (const k of own) {
      const tx = k % 4096;
      const ty = Math.floor(k / 4096);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = tx + dx;
        const ny = ty + dy;
        const nk = ny * 4096 + nx;
        if (own.has(nk) || seen.has(nk) || !world.isWalkable(nx, ny)) continue;
        if (!world.canStep(nx, ny, -dx, -dy, false, true)) continue;
        seen.add(nk);
        out.push({ x: nx, y: ny });
      }
    }
    return out;
  }

  /** Can the body sit at (x, y, h)? Checks floor, solid objects, other cars and walls crossed. */
  private fits(world: World, x: number, y: number, h: number, fromX: number, fromY: number, fromH: number): boolean {
    const from = this.samples(fromX, fromY, fromH);
    const to = this.samples(x, y, h);
    for (let i = 0; i < to.length; i++) {
      const [px, py] = to[i];
      const tx = Math.floor(px);
      const ty = Math.floor(py);
      if (!world.inBounds(tx, ty) || !world.floors[ty * world.width + tx]) return this.blocked({ kind: "other" });
      const solid = world.solidAt(tx, ty);
      if (solid) return this.blocked({ kind: "object", o: solid });
      const other = world.vehicleAt(tx, ty);
      if (other !== 0 && other !== this.id + 1) return this.blocked({ kind: "vehicle", id: other - 1 });
      const ox = Math.floor(from[i][0]);
      const oy = Math.floor(from[i][1]);
      if (ox === tx && oy === ty) continue;
      const dx = Math.sign(tx - ox);
      const dy = Math.sign(ty - oy);
      if (Math.abs(tx - ox) > 1 || Math.abs(ty - oy) > 1) return this.blocked({ kind: "other" });
      if (dx !== 0 && dy !== 0) {
        const viaX = !this.edgeIn(world, ox, oy, dx, 0) && !this.edgeIn(world, ox + dx, oy, 0, dy);
        const viaY = !this.edgeIn(world, ox, oy, 0, dy) && !this.edgeIn(world, ox, oy + dy, dx, 0);
        if (!viaX && !viaY) return this.blocked(this.edgeObstacle(world, ox, oy, dx, 0) ?? this.edgeObstacle(world, ox, oy, 0, dy) ?? { kind: "other" });
      } else if (this.edgeIn(world, ox, oy, dx, dy)) return this.blocked(this.edgeObstacle(world, ox, oy, dx, dy)!);
    }
    return true;
  }

  private blocked(o: Obstacle): false {
    this.hit = o;
    return false;
  }

  /** Walls, closed doors, windows, fences and barricades all stop a car. */
  private edgeIn(world: World, x: number, y: number, dx: number, dy: number): boolean {
    const e = world.edgeBetween(x, y, dx, dy);
    return !!e && (e.comp.blocksMovement(e.state) || (e.barricade ?? 0) > 0);
  }

  private edgeObstacle(world: World, x: number, y: number, dx: number, dy: number): Obstacle | null {
    const e = world.edgeBetween(x, y, dx, dy);
    return e && this.edgeIn(world, x, y, dx, dy) ? { kind: "edge", e } : null;
  }

  claim(world: World): void {
    world.setVehicleTiles(this.id + 1, this.tiles, (this.tiles = this.footprint()));
  }

  /**
   * Advance the physics. Returns the impact speed if the car hit something solid this frame.
   * Distance driven is reported through `drove`.
   */
  update(dt: number, world: World): { impact: number; drove: number; hit: Obstacle | null; vx: number; vy: number } {
    const t = this.type;
    const [fx, fy] = this.forward;
    let fwd = this.vx * fx + this.vy * fy;
    let latX = this.vx - fx * fwd;
    let latY = this.vy - fy * fwd;

    const running = this.engine && this.fuel > 0;
    const top = this.topSpeed;
    if (running && this.throttle > 0) {
      if (fwd < -0.2) fwd = Math.min(0, fwd + t.brake * dt);
      else fwd = Math.min(top, fwd + t.accel * this.throttle * dt * (1 - Math.max(0, fwd) / (top + 0.01) * 0.5));
    } else if (this.throttle < 0) {
      if (fwd > 0.2) fwd = Math.max(0, fwd - t.brake * dt);
      else if (running) fwd = Math.max(-top * 0.35, fwd - t.accel * 0.6 * dt);
    }
    // rolling resistance and drag
    const drag = (this.handbrake ? 6 : 0.9) + Math.abs(fwd) * 0.08;
    fwd -= Math.sign(fwd) * Math.min(Math.abs(fwd), drag * dt);

    // steering fades with speed; reversing turns the other way
    const speedFactor = Math.max(-1, Math.min(1, fwd / 2.5));
    let turn = t.turn / (1 + Math.abs(fwd) * t.understeer * 3);
    // bad wheels make it pull to one side and steer worse
    let pull = 0;
    this.wheels.forEach((w, i) => {
      if (!w || w.condition <= 0) {
        pull += WHEEL_POS[i][1] * (w ? 0.25 : 0.5);
        turn *= 0.85;
      }
    });
    const prevHeading = this.heading;
    this.heading += (this.steer * turn + pull * 0.6) * speedFactor * dt;
    // can't swing the nose into a wall
    if (!this.fits(world, this.x, this.y, this.heading, this.x, this.y, prevHeading)) this.heading = prevHeading;

    // sideways slide dies off with grip (less on the handbrake)
    const g = Math.exp(-(this.handbrake ? t.grip * 0.25 : t.grip) * dt);
    latX *= g;
    latY *= g;
    const [nfx, nfy] = this.forward;
    this.vx = nfx * fwd + latX;
    this.vy = nfy * fwd + latY;

    // move in small steps so nothing gets skipped at speed
    const dist = Math.hypot(this.vx, this.vy) * dt;
    const steps = Math.max(1, Math.ceil(dist / STEP));
    let impact = 0;
    let drove = 0;
    let hit: Obstacle | null = null;
    const vx0 = this.vx;
    const vy0 = this.vy;
    for (let i = 0; i < steps; i++) {
      const nx = this.x + (this.vx * dt) / steps;
      const ny = this.y + (this.vy * dt) / steps;
      if (this.fits(world, nx, ny, this.heading, this.x, this.y, this.heading)) {
        drove += Math.hypot(nx - this.x, ny - this.y);
        this.x = nx;
        this.y = ny;
      } else {
        impact = Math.hypot(this.vx, this.vy);
        hit = this.hit;
        this.vx *= -0.2;
        this.vy *= -0.2;
        break;
      }
    }

    if (running) this.fuel = Math.max(0, this.fuel - drove * t.burn - dt * 0.004);
    if (this.engine && this.fuel <= 0) this.engine = false;
    // a little tire wear with every tile
    for (const w of this.wheels) if (w && w.condition > 0) w.condition = Math.max(0, w.condition - drove * 0.02);
    if (drove > 0 || impact) this.claim(world);
    return { impact, drove, hit, vx: vx0, vy: vy0 };
  }

  /** Damage from a crash, scaled by toughness. Wheels may burst. */
  crash(impact: number): void {
    const dmg = (impact * impact * 0.35) / this.type.toughness;
    this.condition = Math.max(0, this.condition - dmg);
    if (impact > 4) {
      const w = this.wheels[Math.floor(Math.random() * 4)];
      if (w) w.condition = Math.max(0, w.condition - dmg * 2);
    }
  }
}
