import { ATTACK_FRAME, ATTACK_FRAMES, IDLE_FRAME, SIT_FRAME, type Stance, WALK_FRAMES } from "../art/character";
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

export type { Stance };

const STANCE_SPEED: Record<Stance, number> = { stand: 1, crouch: 0.55, crawl: 0.3 };
const STANCE_NOTICE: Record<Stance, number> = { stand: 1, crouch: 0.6, crawl: 0.4 };
const SPRINT_SPEED = 1.75;
/** Stamina needed before you can sprint again after running dry. */
const WINDED_UNTIL = 30;

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
  /** Storey the player is on: 0 = ground. */
  level = 0;
  stance: Stance = "stand";
  /**
   * Sitting on a bench or chair. The player stays on the tile they sat down from (so paths and
   * zombies work as usual); this is just where they're drawn and the draw-order key for it.
   */
  seat: { x: number; y: number; dir: number; key: number } | null = null;
  /** Attack animation: seconds left, and how long the whole swing lasts. */
  private swingLeft = 0;
  private swingTime = 0.4;
  /** Set by the game each frame while Shift is held. */
  wantsSprint = false;
  /** True while actually running this frame. */
  sprinting = false;
  /** 100 = fresh, 0 = spent. */
  stamina = 100;
  /** Ran out of breath: no sprinting until stamina recovers a bit. */
  winded = false;

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
    return this.path.length > 0 || !!this.steerDir;
  }

  /** WASD: walk straight along (dx, dy) in world tiles (any length), or null to stop. */
  private steerDir: [number, number] | null = null;
  steer(dir: [number, number] | null): void {
    if (dir) {
      const l = Math.hypot(dir[0], dir[1]);
      this.seat = null;
      this.path = [];
      this.arrive = null;
      this.steerDir = [dir[0] / l, dir[1] / l];
    } else this.steerDir = null;
  }

  /** Follow a tile path; onArrive fires when the last tile is reached. */
  walk(path: Tile[], onArrive: (() => void) | null = null): void {
    this.seat = null;
    this.path = path;
    this.arrive = onArrive;
    if (!path.length) this.finish();
  }

  stop(): void {
    this.seat = null;
    this.path = [];
    this.arrive = null;
  }

  /** Stand -> crouch -> crawl -> stand. */
  cycleStance(): void {
    this.stance = this.stance === "stand" ? "crouch" : this.stance === "crouch" ? "crawl" : "stand";
  }

  /** Multiplier on how far away zombies notice you, from posture and pace. */
  get noticeFactor(): number {
    return this.survivor.noticeFactor * STANCE_NOTICE[this.stance] * (this.sprinting ? 1.4 : 1);
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

  /** Play the attack animation (a shove with empty hands). */
  swing(duration: number): void {
    this.seat = null;
    this.swingTime = this.swingLeft = duration;
  }

  update(dt: number, world: World): void {
    this.swingLeft = Math.max(0, this.swingLeft - dt);
    if (this.dead) return;
    this.alive += dt;
    this.satiety = Math.max(0, this.satiety - dt * this.survivor.hungerRate);
    this.health.update(dt, this.satiety);
    this.updateStamina(dt);
    if (this.steerDir) return this.updateSteer(dt, world);
    if (!this.path.length) {
      this.walkTime = 0;
      return;
    }
    const pace = this.sprinting ? SPRINT_SPEED : STANCE_SPEED[this.stance];
    let budget = this.survivor.speed * pace * dt;
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
    this.walkTime += dt * pace;
  }

  /**
   * Free movement for WASD. Crossing into a tile opens doors and needs a legal step; a blocked
   * diagonal slides along whichever axis is open, and you stop a little short of walls.
   */
  private updateSteer(dt: number, world: World): void {
    const [dx, dy] = this.steerDir!;
    const pace = this.sprinting ? SPRINT_SPEED : STANCE_SPEED[this.stance];
    const step = this.survivor.speed * pace * dt;
    this.dir = dirFromVec(dx, dy);
    this.walkTime += dt * pace;
    const tryMove = (mx: number, my: number): boolean => {
      const nx = this.x + mx;
      const ny = this.y + my;
      const cx = this.tileX;
      const cy = this.tileY;
      const sx = Math.floor(nx) - cx;
      const sy = Math.floor(ny) - cy;
      if (sx || sy) {
        const door = sx === 0 || sy === 0 ? world.edgeBetween(cx, cy, sx, sy) : undefined;
        if (door?.comp.door && door.state !== "open" && !door.barricade && !door.broken) door.state = "open";
        if (!world.canStep(cx, cy, sx, sy)) return false;
      }
      this.x = nx;
      this.y = ny;
      return true;
    };
    if (!tryMove(dx * step, dy * step) && !(dx && tryMove(Math.sign(dx) * step * 0.8, 0))) {
      if (dy) tryMove(0, Math.sign(dy) * step * 0.8);
    }
    // keep a body's width off anything you can't walk through
    const M = 0.22;
    const cx = this.tileX;
    const cy = this.tileY;
    const fx = this.x - cx;
    const fy = this.y - cy;
    if (fx < M && !world.canStep(cx, cy, -1, 0)) this.x = cx + M;
    if (fx > 1 - M && !world.canStep(cx, cy, 1, 0)) this.x = cx + 1 - M;
    if (fy < M && !world.canStep(cx, cy, 0, -1)) this.y = cy + M;
    if (fy > 1 - M && !world.canStep(cx, cy, 0, 1)) this.y = cy + 1 - M;
  }

  /** Sprinting burns stamina (fitter people last longer); anything else gets it back. */
  private updateStamina(dt: number): void {
    const fit = this.survivor.attributes.fitness;
    if (this.stamina >= WINDED_UNTIL) this.winded = false;
    this.sprinting = this.wantsSprint && !this.winded && this.moving;
    if (this.sprinting) {
      // running gets you up off the floor
      this.stance = "stand";
      this.stamina = Math.max(0, this.stamina - dt * (16 - fit * 0.7));
      if (this.stamina <= 0) this.winded = true;
    } else {
      const rest = this.moving ? 6 : this.seat ? 22 : this.stance === "stand" ? 12 : 16;
      this.stamina = Math.min(100, this.stamina + dt * rest * (0.8 + fit * 0.04));
    }
  }

  animFrame(): number {
    if (this.seat) return SIT_FRAME;
    if (this.steerDir && this.swingLeft <= 0) return Math.floor(this.walkTime * 11) % WALK_FRAMES;
    if (this.swingLeft > 0) {
      // quick wind-up, then hold the hit a moment before recovering
      const t = 1 - this.swingLeft / this.swingTime;
      return ATTACK_FRAME + Math.min(ATTACK_FRAMES - 1, t < 0.15 ? 0 : t < 0.45 ? 1 : t < 0.7 ? 2 : 3);
    }
    if (!this.path.length) return IDLE_FRAME;
    return Math.floor(this.walkTime * 11) % WALK_FRAMES;
  }
}
