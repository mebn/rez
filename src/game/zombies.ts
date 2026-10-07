import { IDLE_FRAME, WALK_FRAMES } from "../art/character";
import { registerLook } from "../engine/sprites";
import type { Item } from "../items/types";
import { findPath, nearestWalkable, type Tile } from "../world/pathfinding";
import type { EdgeInstance, World } from "../world/world";

/** Direction index (0 = +x, clockwise in 45° steps) from a movement vector. */
function dirFromVec(dx: number, dy: number): number {
  return (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
}

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const randInt = (lo: number, hi: number) => Math.floor(rand(lo, hi + 1));

// colours picked straight from the palette so the grey, dead skin survives pixelisation
const ZOMBIE_LOOKS = [
  { skin: "#8b9bb4", hair: "#3e2731", shirt: "#733e39", pants: "#3a4466", shoes: "#181425", hairStyle: "short" },
  { skin: "#c0cbdc", hair: "#68386c", shirt: "#265c42", pants: "#262b44", shoes: "#3e2731", hairStyle: "long" },
  { skin: "#8b9bb4", hair: "#181425", shirt: "#5a6988", pants: "#733e39", shoes: "#181425", hairStyle: "bald" },
  { skin: "#c0cbdc", hair: "#b86f50", shirt: "#3e8948", pants: "#3a4466", shoes: "#3e2731", hairStyle: "short" },
  { skin: "#8b9bb4", hair: "#3e2731", shirt: "#c28569", pants: "#262b44", shoes: "#181425", hairStyle: "long" },
  { skin: "#c0cbdc", hair: "#181425", shirt: "#124e89", pants: "#5a6988", shoes: "#3e2731", hairStyle: "short" },
] as const;

export function registerZombieLooks(): void {
  ZOMBIE_LOOKS.forEach((l, i) => registerLook(`zombie${i}`, { ...l, zombie: true }));
}

type Mode = "idle" | "wander" | "migrate" | "investigate" | "chase";

export class Zombie {
  x: number;
  y: number;
  dir = Math.floor(Math.random() * 8);
  hp = rand(2.5, 4);
  mode: Mode = "idle";
  path: Tile[] = [];
  walkTime = 0;
  moving = false;
  /** Walkers, not runners: an aimless shuffle, and a slightly more purposeful one when they want you. */
  walkSpeed = rand(0.35, 0.6);
  chaseSpeed = rand(0.75, 1.15);
  home: Tile;
  goal: Tile | null = null;
  /** Migrants leave the map when they reach this edge tile. */
  exit: Tile | null = null;
  lastSeen: { x: number; y: number } | null = null;
  memory = 0;
  pause = rand(0, 4);
  repath = 0;
  sense = Math.random() * 0.3;
  attackCd = 0;
  windup = 0;
  stagger = 0;
  flash = 0;
  /** Lying on the ground before getting up (a freshly turned survivor). */
  rise = 0;
  banging: EdgeInstance | null = null;
  bangTime = 0;
  /** Climbing through a window or over a fence: seconds left and where it lands. */
  climb = 0;
  climbTo: Tile | null = null;
  /** What it carried in life; ends up on the corpse. */
  items: Item[] = [];
  label = "Zombie";

  constructor(x: number, y: number, readonly look: string) {
    this.x = x;
    this.y = y;
    this.home = { x: Math.floor(x), y: Math.floor(y) };
  }

  get tileX(): number {
    return Math.floor(this.x);
  }
  get tileY(): number {
    return Math.floor(this.y);
  }

  animFrame(): number {
    if (this.climbTo) return 4;
    if (this.banging) return Math.floor(this.bangTime * 4) % 2 ? 2 : 6;
    if (this.windup > 0) return 2;
    if (!this.moving) return IDLE_FRAME;
    return Math.floor(this.walkTime * 7) % WALK_FRAMES;
  }
}

/** What the director needs to know about the player each frame. */
export interface PlayerView {
  x: number;
  y: number;
  alive: boolean;
  /** < 1 sneaky, > 1 noisy. */
  noticeFactor: number;
  /** Extra reach to the target's edge (a car is bigger than a person). */
  radius: number;
}

export interface DirectorHooks {
  attack(z: Zombie): void;
  doorBang(e: EdgeInstance): void;
  doorBroken(e: EdgeInstance): void;
  windowBroken(e: EdgeInstance): void;
  hordeEnters(from: string): void;
}

interface Arrival {
  at: number;
  tile: Tile;
  exit: Tile;
}

const SIGHT = 9;
const ATTACK_RANGE = 0.8;
const DOOR_HP = 9;

/**
 * Owns every zombie. The population is fixed: zombies on the map plus a pool out in the
 * wider world. Nothing is ever created from nothing. Zombies drift in and out across the
 * map edges, and every so often a horde migrates through. Kills are permanent.
 */
export class ZombieDirector {
  readonly zombies: Zombie[] = [];
  /** Zombies roaming off-map that can migrate in. */
  pool = 70;
  private hordeTimer = rand(150, 240);
  private trickleTimer = rand(40, 80);
  private arrivals: Arrival[] = [];
  private time = 0;

  constructor(
    private world: World,
    private hooks: DirectorHooks,
    avoid: Tile,
  ) {
    const { width: W, height: H } = world;
    const placed: Tile[] = [];
    for (let tries = 0; placed.length < 14 && tries < 2000; tries++) {
      const t = { x: randInt(1, W - 2), y: randInt(1, H - 2) };
      if (!world.isWalkable(t.x, t.y) || Math.hypot(t.x - avoid.x, t.y - avoid.y) < 14) continue;
      placed.push(t);
    }
    for (const t of placed) this.add(t.x + 0.5, t.y + 0.5);
  }

  get population(): number {
    return this.zombies.length + this.pool + this.arrivals.length;
  }

  private add(x: number, y: number, look = `zombie${randInt(0, ZOMBIE_LOOKS.length - 1)}`): Zombie {
    const z = new Zombie(x, y, look);
    this.zombies.push(z);
    return z;
  }

  /** Bring one zombie in from the off-map pool to stand at (x, y). */
  spawnAt(x: number, y: number, items: Item[] = []): Zombie | null {
    if (this.pool <= 0) return null;
    this.pool--;
    const z = this.add(x, y);
    z.items = items;
    return z;
  }

  /** A body that will get up again in a moment. */
  spawnRisen(x: number, y: number, look: string, dir: number, items: Item[], label: string): Zombie {
    const z = this.add(x, y, look);
    z.dir = dir;
    z.rise = 7;
    z.items = items;
    z.label = label;
    z.hp = 4;
    return z;
  }

  remove(z: Zombie): void {
    const i = this.zombies.indexOf(z);
    if (i >= 0) this.zombies.splice(i, 1);
  }

  /** Hit a zombie. Returns true if it died. */
  damage(z: Zombie, amount: number, fromX: number, fromY: number): boolean {
    z.hp -= amount;
    z.flash = 0.15;
    z.stagger = 0.55;
    z.windup = 0;
    if (z.hp <= 0) return true;
    // knocked back a little, and now it's angry
    const d = Math.hypot(z.x - fromX, z.y - fromY) || 1;
    this.shove(z, ((z.x - fromX) / d) * 0.3, ((z.y - fromY) / d) * 0.3);
    z.mode = "chase";
    z.lastSeen = { x: fromX, y: fromY };
    z.memory = 8;
    return false;
  }

  /** A sound at (x, y) heard within radius tiles. Zombies come to look. */
  noise(x: number, y: number, radius: number): void {
    for (const z of this.zombies) {
      if (z.rise > 0 || z.mode === "chase") continue;
      if (Math.hypot(z.x - x, z.y - y) > radius) continue;
      z.mode = "investigate";
      z.goal = { x: Math.floor(x), y: Math.floor(y) };
      z.exit = null;
      z.repath = 0;
      z.path = [];
    }
  }

  update(dt: number, player: PlayerView): void {
    this.time += dt;
    this.migration(dt);
    for (const z of this.zombies) this.think(z, dt, player);
    this.separate(player);
    // migrants that walked off the edge rejoin the wider world
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (z.mode === "migrate" && z.exit && !z.path.length && z.tileX === z.exit.x && z.tileY === z.exit.y) {
        this.zombies.splice(i, 1);
        this.pool++;
      }
    }
  }

  // --------------------------------------------------------------- migration

  private edgeTile(side: "N" | "S" | "E" | "W", along: number): Tile {
    const { width: W, height: H } = this.world;
    const a = Math.max(0, Math.min((side === "N" || side === "S" ? W : H) - 1, Math.round(along)));
    if (side === "N") return { x: a, y: 0 };
    if (side === "S") return { x: a, y: H - 1 };
    if (side === "W") return { x: 0, y: a };
    return { x: W - 1, y: a };
  }

  /** A walkable route across the map, preferring the road. */
  private route(): { from: Tile; to: Tile; side: string } | null {
    const { width: W, height: H } = this.world;
    const opposite = { N: "S", S: "N", E: "W", W: "E" } as const;
    const names = { N: "north", S: "south", E: "east", W: "west" };
    for (let tries = 0; tries < 12; tries++) {
      let side: "N" | "S" | "E" | "W";
      let a: number;
      let b: number;
      if (Math.random() < 0.6) {
        // along the street
        side = Math.random() < 0.5 ? "W" : "E";
        a = randInt(29, 34);
        b = randInt(29, 34);
      } else {
        side = (["N", "S", "E", "W"] as const)[randInt(0, 3)];
        const len = side === "N" || side === "S" ? W : H;
        a = randInt(2, len - 3);
        b = randInt(2, len - 3);
      }
      const from = this.edgeTile(side, a);
      const to = this.edgeTile(opposite[side], b);
      if (!this.world.isWalkable(from.x, from.y) || !this.world.isWalkable(to.x, to.y)) continue;
      if (!findPath(this.world, from, [to], { doors: false })) continue;
      return { from, to, side: names[side] };
    }
    return null;
  }

  private migration(dt: number): void {
    // horde: a big group crossing the map together
    this.hordeTimer -= dt;
    if (this.hordeTimer <= 0) {
      this.hordeTimer = rand(240, 480);
      const size = Math.min(this.pool, randInt(8, 16));
      const r = size >= 4 ? this.route() : null;
      if (r) {
        this.pool -= size;
        const alongX = r.from.y === 0 || r.from.y === this.world.height - 1;
        for (let i = 0; i < size; i++) {
          const off = randInt(-3, 3);
          const tile = alongX ? { x: r.from.x + off, y: r.from.y } : { x: r.from.x, y: r.from.y + off };
          const eoff = randInt(-3, 3);
          const exit = alongX ? { x: r.to.x + eoff, y: r.to.y } : { x: r.to.x, y: r.to.y + eoff };
          this.arrivals.push({ at: this.time + i * rand(0.4, 0.9), tile, exit });
        }
        this.hooks.hordeEnters(r.side);
      }
    }

    // stragglers: the odd zombie wanders in on its own
    this.trickleTimer -= dt;
    if (this.trickleTimer <= 0) {
      this.trickleTimer = rand(50, 100);
      if (this.pool > 0 && this.zombies.length < 40 && Math.random() < 0.6) {
        const r = this.route();
        if (r) {
          this.pool--;
          const z = this.add(r.from.x + 0.5, r.from.y + 0.5);
          z.mode = "investigate";
          z.goal = { x: randInt(4, this.world.width - 5), y: randInt(4, this.world.height - 5) };
        }
      }
    }

    for (let i = this.arrivals.length - 1; i >= 0; i--) {
      const a = this.arrivals[i];
      if (a.at > this.time) continue;
      this.arrivals.splice(i, 1);
      const clamp = (t: Tile) => ({
        x: Math.max(0, Math.min(this.world.width - 1, t.x)),
        y: Math.max(0, Math.min(this.world.height - 1, t.y)),
      });
      const tile = clamp(a.tile);
      const exit = clamp(a.exit);
      if (!this.world.isWalkable(tile.x, tile.y)) {
        this.pool++;
        continue;
      }
      const z = this.add(tile.x + 0.5, tile.y + 0.5);
      z.mode = "migrate";
      z.exit = this.world.isWalkable(exit.x, exit.y) ? exit : null;
      z.walkSpeed = rand(0.7, 1.0);
      if (!z.exit) z.mode = "idle";
    }
  }

  // ---------------------------------------------------------------- behaviour

  private think(z: Zombie, dt: number, p: PlayerView): void {
    z.flash = Math.max(0, z.flash - dt);
    z.attackCd = Math.max(0, z.attackCd - dt);
    z.moving = false;
    if (z.rise > 0) {
      z.rise -= dt;
      return;
    }
    if (z.stagger > 0) {
      z.stagger -= dt;
      return;
    }

    // senses, a few times a second
    z.sense -= dt;
    if (z.sense <= 0 && p.alive) {
      z.sense = 0.25;
      const dx = p.x - z.x;
      const dy = p.y - z.y;
      const d = Math.hypot(dx, dy);
      const range = SIGHT * p.noticeFactor;
      const ang = (z.dir * Math.PI) / 4;
      const facing = (Math.cos(ang) * dx + Math.sin(ang) * dy) / (d || 1);
      const close = d < 2.2 * p.noticeFactor;
      if (d < range && (close || facing > -0.3) && this.world.canSee(z.x, z.y, p.x, p.y)) {
        if (z.mode !== "chase") this.alertNeighbours(z, p);
        z.mode = "chase";
        z.lastSeen = { x: p.x, y: p.y };
        z.memory = 6;
        z.exit = null;
      }
    }

    switch (z.mode) {
      case "chase":
        return this.chase(z, dt, p);
      case "investigate":
        if (!z.goal) return void (z.mode = "idle");
        return this.travel(z, dt, z.goal, Math.min(z.chaseSpeed, z.walkSpeed * 1.6), true, () => {
          z.mode = "idle";
          z.home = { x: z.tileX, y: z.tileY };
        });
      case "migrate":
        if (!z.exit) return void (z.mode = "idle");
        return this.travel(z, dt, z.exit, z.walkSpeed, false, () => {});
      case "wander":
        if (!z.goal) return void (z.mode = "idle");
        return this.travel(z, dt, z.goal, z.walkSpeed, false, () => {
          z.mode = "idle";
          z.pause = rand(3, 10);
        });
      case "idle": {
        z.banging = null;
        z.pause -= dt;
        if (z.pause > 0) return;
        // now and then an idle zombie drifts off toward the edge of the map and leaves
        if (Math.random() < 0.005) {
          const r = this.route();
          if (r) {
            z.mode = "migrate";
            z.exit = r.to;
            z.path = [];
            return;
          }
        }
        const g = { x: z.home.x + randInt(-4, 4), y: z.home.y + randInt(-4, 4) };
        if (this.world.isWalkable(g.x, g.y)) {
          z.mode = "wander";
          z.goal = g;
          z.path = [];
          z.repath = 0;
        } else z.pause = rand(1, 3);
      }
    }
  }

  /** Nearby zombies that weren't chasing come to see what the fuss is. Groups move together. */
  private alertNeighbours(z: Zombie, p: PlayerView): void {
    for (const o of this.zombies) {
      if (o === z || o.mode === "chase" || o.rise > 0) continue;
      if (Math.hypot(o.x - z.x, o.y - z.y) > 5) continue;
      o.mode = "investigate";
      o.goal = { x: Math.floor(p.x), y: Math.floor(p.y) };
      o.exit = null;
      o.path = [];
      o.repath = 0;
    }
  }

  private chase(z: Zombie, dt: number, p: PlayerView): void {
    const dx = p.x - z.x;
    const dy = p.y - z.y;
    const d = Math.hypot(dx, dy);
    const sees = p.alive && d < 1.6 + p.radius && this.world.canSee(z.x, z.y, p.x, p.y);

    if (z.windup > 0) {
      z.windup -= dt;
      z.dir = dirFromVec(dx, dy);
      if (z.windup <= 0) {
        // plenty of grabs miss
        if (p.alive && d < ATTACK_RANGE + p.radius + 0.25 && Math.random() < 0.5 && this.world.canSee(z.x, z.y, p.x, p.y)) this.hooks.attack(z);
        z.attackCd = rand(2, 3);
      }
      return;
    }

    if (sees) {
      z.banging = null;
      z.dir = dirFromVec(dx, dy);
      if (d < ATTACK_RANGE + p.radius) {
        if (z.attackCd <= 0) z.windup = 0.6;
        return;
      }
      // close enough to lunge straight at them
      this.steer(z, dx / d, dy / d, z.chaseSpeed * dt);
      return;
    }

    if (!p.alive) z.memory = Math.min(z.memory, 2);
    z.memory -= dt;
    const target = z.lastSeen;
    if (!target || z.memory <= -4) {
      z.mode = "idle";
      z.home = { x: z.tileX, y: z.tileY };
      z.pause = rand(2, 6);
      return;
    }
    // head for wherever they last actually saw you; no tracking through walls
    this.travel(z, dt, { x: Math.floor(z.lastSeen!.x), y: Math.floor(z.lastSeen!.y) }, z.chaseSpeed, true, () => {
      if (z.memory <= 0) {
        z.mode = "idle";
        z.home = { x: z.tileX, y: z.tileY };
        z.pause = rand(2, 6);
      }
    });
  }

  /** Path toward a tile and follow it. Through closed doors (by bashing them) when `doors`. */
  private travel(z: Zombie, dt: number, goal: Tile, speed: number, doors: boolean, arrived: () => void): void {
    z.repath -= dt;
    // the target may be inside a car or a wall corner: head for the closest spot beside it
    if (!this.world.isWalkable(goal.x, goal.y)) goal = nearestWalkable(this.world, goal.x, goal.y, 3) ?? goal;
    const pathGoal = z.path[z.path.length - 1];
    const stale = !pathGoal || pathGoal.x !== goal.x || pathGoal.y !== goal.y;
    if ((stale && z.repath <= 0) || (!z.path.length && (z.tileX !== goal.x || z.tileY !== goal.y) && z.repath <= 0)) {
      z.repath = z.mode === "chase" ? rand(0.4, 0.7) : rand(1.5, 3);
      const path = findPath(this.world, { x: z.tileX, y: z.tileY }, [goal], { doors, bashers: doors, doorCost: 4, limit: 4000 });
      if (!path) {
        z.path = [];
        arrived();
        return;
      }
      z.path = path;
    }
    if (!z.path.length) {
      z.banging = null;
      arrived();
      return;
    }
    this.follow(z, dt, speed, doors);
  }

  private follow(z: Zombie, dt: number, speed: number, bash: boolean): void {
    if (z.climbTo) {
      z.climb -= dt;
      if (z.climb > 0) return;
      z.x = z.climbTo.x + 0.5;
      z.y = z.climbTo.y + 0.5;
      z.climbTo = null;
      if (z.path[0] && z.path[0].x === z.tileX && z.path[0].y === z.tileY) z.path.shift();
      return;
    }
    let budget = speed * dt;
    while (budget > 0 && z.path.length) {
      const next = z.path[0];
      const cx = z.tileX;
      const cy = z.tileY;
      if (next.x !== cx || next.y !== cy) {
        const dx = Math.sign(next.x - cx);
        const dy = Math.sign(next.y - cy);
        if (!this.world.canStep(cx, cy, dx, dy)) {
          const e = dx === 0 || dy === 0 ? this.world.edgeBetween(cx, cy, dx, dy) : undefined;
          if (e && bash && this.world.isWalkable(next.x, next.y)) {
            const win = e.comp.category === "window";
            if ((e.barricade ?? 0) > 0 || (e.comp.door && e.state !== "open") || (win && e.state === "default")) {
              this.bang(z, e, dt, next);
              return;
            }
            // broken windows and low fences: clamber over, slowly
            if (win || (e.comp.category === "fence" && e.comp.height < 60)) {
              z.banging = null;
              z.climbTo = next;
              z.climb = win && e.state === "broken" ? 2.2 : 1.6;
              z.dir = dirFromVec(next.x + 0.5 - z.x, next.y + 0.5 - z.y);
              return;
            }
          }
          z.path = [];
          z.repath = 0;
          return;
        }
      }
      z.banging = null;
      const tx = next.x + 0.5;
      const ty = next.y + 0.5;
      const ddx = tx - z.x;
      const ddy = ty - z.y;
      const dist = Math.hypot(ddx, ddy);
      if (dist > 1e-4) z.dir = dirFromVec(ddx, ddy);
      z.moving = true;
      if (dist <= budget) {
        z.x = tx;
        z.y = ty;
        budget -= dist;
        z.path.shift();
      } else {
        z.x += (ddx / dist) * budget;
        z.y += (ddy / dist) * budget;
        budget = 0;
      }
    }
    z.walkTime += dt * (speed / 1.2);
  }

  /** Pound on a barricade, door or window. Planks go first, then the door or glass. */
  private bang(z: Zombie, e: EdgeInstance, dt: number, toward: Tile): void {
    z.dir = dirFromVec(toward.x + 0.5 - z.x, toward.y + 0.5 - z.y);
    if (z.banging !== e) z.bangTime = 0;
    z.banging = e;
    z.bangTime += dt;
    if (Math.floor(z.bangTime - dt) !== Math.floor(z.bangTime)) this.hooks.doorBang(e);
    if ((e.barricade ?? 0) > 0) {
      e.barricadeHp = (e.barricadeHp ?? 5) - dt;
      if (e.barricadeHp <= 0) {
        e.barricade = (e.barricade ?? 1) - 1;
        e.barricadeHp = 5;
        z.banging = null;
      }
      return;
    }
    if (e.comp.category === "window") {
      e.hp = (e.hp ?? 2.5) - dt;
      if (e.hp <= 0) {
        e.state = "broken";
        z.banging = null;
        this.hooks.windowBroken(e);
      }
      return;
    }
    e.hp = (e.hp ?? DOOR_HP) - dt;
    if (e.hp <= 0) {
      e.state = "open";
      e.broken = true;
      z.banging = null;
      this.hooks.doorBroken(e);
    }
  }

  /** Move in a direction without crossing walls. */
  private steer(z: Zombie, nx: number, ny: number, dist: number): void {
    z.path = [];
    this.shove(z, nx * dist, ny * dist);
    z.moving = true;
    z.walkTime += dist / 1.2;
  }

  private shove(z: Zombie, dx: number, dy: number): void {
    const nx = z.x + dx;
    const ny = z.y + dy;
    const sx = Math.floor(nx) - z.tileX;
    const sy = Math.floor(ny) - z.tileY;
    if ((sx === 0 && sy === 0) || (Math.abs(sx) <= 1 && Math.abs(sy) <= 1 && this.world.canStep(z.tileX, z.tileY, sx, sy))) {
      z.x = nx;
      z.y = ny;
    }
  }

  /** Keep bodies from stacking on one spot, and out of the player. */
  private separate(p: PlayerView): void {
    const zs = this.zombies;
    for (let i = 0; i < zs.length; i++) {
      const a = zs[i];
      if (a.rise > 0) continue;
      for (let j = i + 1; j < zs.length; j++) {
        const b = zs[j];
        if (b.rise > 0) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.2 || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = (0.45 - d) * 0.25;
        this.shove(a, (-dx / d) * push, (-dy / d) * push);
        this.shove(b, (dx / d) * push, (dy / d) * push);
      }
      if (p.alive) {
        const dx = a.x - p.x;
        const dy = a.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.5 && d > 1e-4) this.shove(a, (dx / d) * (0.5 - d) * 0.5, (dy / d) * (0.5 - d) * 0.5);
      }
    }
  }
}
