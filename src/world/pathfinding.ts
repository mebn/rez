import type { World } from "./world";

export interface Tile {
  x: number;
  y: number;
}

const DIRS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/** Binary min-heap keyed by f-score. */
class Heap {
  private a: { i: number; f: number }[] = [];
  get size(): number {
    return this.a.length;
  }
  push(i: number, f: number): void {
    const a = this.a;
    a.push({ i, f });
    let n = a.length - 1;
    while (n > 0) {
      const p = (n - 1) >> 1;
      if (a[p].f <= a[n].f) break;
      [a[p], a[n]] = [a[n], a[p]];
      n = p;
    }
  }
  pop(): number {
    const a = this.a;
    const top = a[0].i;
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let n = 0;
      for (;;) {
        const l = n * 2 + 1;
        const r = l + 1;
        let m = n;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === n) break;
        [a[m], a[n]] = [a[n], a[m]];
        n = m;
      }
    }
    return top;
  }
}

/**
 * A* over the tile grid with 8-way movement. Walls/fences block; closed doors are
 * passable at an extra cost (the player opens them on the way through, zombies bash them).
 * With `doors: false` closed doors block like walls.
 * Returns the tile path excluding the start, or null if no goal is reachable.
 */
export function findPath(
  world: World,
  start: Tile,
  goals: Tile[],
  opts: { doors?: boolean; doorCost?: number; limit?: number; bashers?: boolean } = {},
): Tile[] | null {
  world.bashers = !!opts.bashers;
  try {
    return search(world, start, goals, opts);
  } finally {
    world.bashers = false;
  }
}

function search(world: World, start: Tile, goals: Tile[], opts: { doors?: boolean; doorCost?: number; limit?: number }): Tile[] | null {
  const doors = opts.doors ?? true;
  const doorCost = opts.doorCost ?? 1.5;
  if (!goals.length) return null;
  const W = world.width;
  const goalSet = new Set(goals.map((g) => g.y * W + g.x));
  const startI = start.y * W + start.x;
  if (goalSet.has(startI)) return [];
  const h = (i: number) => {
    const x = i % W;
    const y = (i / W) | 0;
    let best = Infinity;
    for (const g of goals) {
      const dx = Math.abs(g.x - x);
      const dy = Math.abs(g.y - y);
      best = Math.min(best, Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy));
    }
    return best;
  };
  const gScore = new Map<number, number>([[startI, 0]]);
  const came = new Map<number, number>();
  const open = new Heap();
  open.push(startI, h(startI));
  const closed = new Set<number>();
  let iterations = 0;
  while (open.size && iterations++ < (opts.limit ?? 20000)) {
    const cur = open.pop();
    if (closed.has(cur)) continue;
    if (goalSet.has(cur)) {
      const path: Tile[] = [];
      let n: number | undefined = cur;
      while (n !== undefined && n !== startI) {
        path.push({ x: n % W, y: (n / W) | 0 });
        n = came.get(n);
      }
      return path.reverse();
    }
    closed.add(cur);
    const cx = cur % W;
    const cy = (cur / W) | 0;
    for (const [dx, dy, cost] of DIRS) {
      if (!world.canStep(cx, cy, dx, dy, doors)) continue;
      const ni = (cy + dy) * W + cx + dx;
      if (closed.has(ni)) continue;
      let c = cost;
      const e = dx === 0 || dy === 0 ? world.edgeBetween(cx, cy, dx, dy) : undefined;
      if (e && ((e.comp.door && e.comp.blocksMovement(e.state)) || (e.barricade ?? 0) > 0 || (world.bashers && e.comp.blocksMovement(e.state)))) c += doorCost;
      const g = gScore.get(cur)! + c;
      if (g < (gScore.get(ni) ?? Infinity)) {
        gScore.set(ni, g);
        came.set(ni, cur);
        open.push(ni, g + h(ni));
      }
    }
  }
  return null;
}

/** Nearest walkable tile to (x, y) within a small radius, for clicks on blocked tiles. */
export function nearestWalkable(world: World, x: number, y: number, radius = 3): Tile | null {
  if (world.isWalkable(x, y)) return { x, y };
  let best: Tile | null = null;
  let bd = Infinity;
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) {
      const d = dx * dx + dy * dy;
      if (d < bd && world.isWalkable(x + dx, y + dy)) {
        bd = d;
        best = { x: x + dx, y: y + dy };
      }
    }
  return best;
}
