import { IDLE_FRAME, WALK_FRAMES } from "../art/character";
import type { Item } from "../items/types";
import { Inventory } from "../world/inventory";
import type { Tile } from "../world/pathfinding";
import type { World } from "../world/world";
import { Health } from "./health";
import type { Survivor } from "./survivor";

/** Direction index (0 = +x, clockwise in 45° steps) from a movement vector. */
function dirFromVec(dx: number, dy: number): number {
  const a = Math.atan2(dy, dx);
  return (Math.round(a / (Math.PI / 4)) + 8) % 8;
}

export class Player {
  x: number;
  y: number;
  dir = 1;
  private path: Tile[] = [];
  private walkTime = 0;
  private arrive: (() => void) | null = null;
  readonly inventory: Inventory;
  readonly health: Health;
  equipped: Item | null = null;
  /** 100 = full, 0 = starving. */
  satiety = 72;
  dead = false;
  /** Seconds survived and zombies killed by this survivor. */
  alive = 0;
  kills = 0;

  constructor(
    spawn: Tile,
    readonly survivor: Survivor,
  ) {
    this.x = spawn.x + 0.5;
    this.y = spawn.y + 0.5;
    this.inventory = new Inventory("Inventory", survivor.carryCapacity);
    this.health = new Health(survivor);
  }

  get tileX(): number {
    return Math.floor(this.x);
  }
  get tileY(): number {
    return Math.floor(this.y);
  }
  get moving(): boolean {
    return this.path.length > 0;
  }

  /** Follow a tile path; onArrive fires when the last tile is reached. */
  walk(path: Tile[], onArrive: (() => void) | null = null): void {
    this.path = path;
    this.arrive = onArrive;
    if (!path.length) this.finish();
  }

  stop(): void {
    this.path = [];
    this.arrive = null;
  }

  face(tx: number, ty: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    if (Math.abs(dx) + Math.abs(dy) > 0.01) this.dir = dirFromVec(dx, dy);
  }

  private finish(): void {
    const cb = this.arrive;
    this.arrive = null;
    cb?.();
  }

  update(dt: number, world: World): void {
    if (this.dead) return;
    this.alive += dt;
    this.satiety = Math.max(0, this.satiety - dt * this.survivor.hungerRate);
    this.health.update(dt, this.satiety);
    if (!this.path.length) {
      this.walkTime = 0;
      return;
    }
    let budget = this.survivor.speed * dt;
    while (budget > 0 && this.path.length) {
      const next = this.path[0];
      const cx = this.tileX;
      const cy = this.tileY;
      // stepping into a new tile: open doors on the way, bail if something now blocks us
      if (next.x !== cx || next.y !== cy) {
        const dx = Math.sign(next.x - cx);
        const dy = Math.sign(next.y - cy);
        const door = dx === 0 || dy === 0 ? world.edgeBetween(cx, cy, dx, dy) : undefined;
        if (door?.comp.door && door.state !== "open") door.state = "open";
        if (!world.canStep(cx, cy, dx, dy)) {
          this.stop();
          return;
        }
      }
      const tx = next.x + 0.5;
      const ty = next.y + 0.5;
      const ddx = tx - this.x;
      const ddy = ty - this.y;
      const dist = Math.hypot(ddx, ddy);
      if (dist > 1e-4) this.dir = dirFromVec(ddx, ddy);
      if (dist <= budget) {
        this.x = tx;
        this.y = ty;
        budget -= dist;
        this.path.shift();
        if (!this.path.length) this.finish();
      } else {
        this.x += (ddx / dist) * budget;
        this.y += (ddy / dist) * budget;
        budget = 0;
      }
    }
    this.walkTime += dt;
  }

  animFrame(): number {
    if (!this.path.length) return IDLE_FRAME;
    return Math.floor(this.walkTime * 11) % WALK_FRAMES;
  }
}
