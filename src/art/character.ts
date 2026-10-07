export interface CharacterLook {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  shoes: string;
  /** "short" | "long" | "bald" */
  hairStyle: "short" | "long" | "bald";
  /** Shambling pose: arms reaching forward, bloodied clothes. */
  zombie?: boolean;
}

/** Sprite bounds for every character frame; anchor is between the feet. */
export const CHAR_SPRITE = { w: 40, h: 72, ax: 20, ay: 66 };

/** Frames 0..7 are the walk cycle; this one is standing still. */
export const IDLE_FRAME = 8;
export const WALK_FRAMES = 8;

/** Corpse sprite bounds; anchor is the middle of the body on the ground. */
export const CORPSE_SPRITE = { w: 84, h: 40, ax: 42, ay: 20 };

const INK = "#181425";
const BLOOD = "#a22633";
/** Size of one sprite "pixel" in world px. Chunky on purpose. */
const C = 2;

type Rect = [number, number, number, number, string];

/**
 * Collects cell-sized rectangles, then paints them with a 1px dark outline around the
 * whole silhouette: the classic flat 8-bit sprite look.
 */
class Sprite8 {
  private rects: Rect[] = [];

  constructor(
    private ox: number,
    private oy: number,
  ) {}

  /** Fill cells (cx, cy) .. (cx + w, cy + h), in cells relative to the origin. */
  fill(cx: number, cy: number, w: number, h: number, color: string): void {
    this.rects.push([this.ox + cx * C, this.oy + cy * C, w * C, h * C, color]);
  }

  paint(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = INK;
    for (const [x, y, w, h] of this.rects) ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    for (const [x, y, w, h, c] of this.rects) {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    }
  }
}

/** Dithered contact shadow, matching the rest of the world. */
function shadow(ctx: CanvasRenderingContext2D, rx: number, ry: number): void {
  ctx.fillStyle = INK;
  for (let j = -ry; j <= ry; j++)
    for (let i = -rx; i <= rx; i++) {
      if ((i + j) & 1 || (i * i) / (rx * rx) + (j * j) / (ry * ry) > 1) continue;
      ctx.fillRect(i, j, 1, 1);
    }
}

type View = "front" | "back" | "left" | "right";

/** 8 movement directions -> 4 drawn views. Dir 1 (+x+y) faces the camera. */
function viewFor(dir: number): View {
  return (["front", "front", "front", "left", "back", "back", "back", "right"] as const)[dir];
}

/**
 * A person, 11 x 29 chunky cells, drawn as flat blocks. Feet at the origin.
 * Walking swaps leg lengths and swings the arms; zombies hold their arms out.
 */
export function drawCharacter(ctx: CanvasRenderingContext2D, look: CharacterLook, dir: number, frame: number): void {
  const view = viewFor(dir);
  const walking = frame !== IDLE_FRAME;
  const step = walking ? Math.round(Math.sin((frame / WALK_FRAMES) * Math.PI * 2)) : 0;
  const bob = walking && step === 0 ? 1 : 0;
  const zombie = !!look.zombie;

  shadow(ctx, 11, 4);
  // cells: x from -5.5 to 5.5 around the centre line, y from -29 (top of head) to 0 (soles)
  const s = new Sprite8(-11, -58);
  const top = bob;

  if (view === "front" || view === "back") {
    // legs: the stepping leg lifts a cell
    const lift = (side: number) => (walking && step === side ? 1 : 0);
    for (const [side, x] of [[-1, 2], [1, 6]] as const) {
      const l = lift(side);
      s.fill(x, 17 + top, 3, 10 - l - top, look.pants);
      s.fill(x, 27 - l, 3, 2, look.shoes);
    }
    // torso and belt
    s.fill(2, 7 + top, 7, 9, look.shirt);
    s.fill(2, 16 + top, 7, 1, look.pants);
    if (zombie && view === "front") {
      // arms reaching at the camera: short sleeves and hands in front of the chest
      s.fill(0, 7 + top, 2, 3, look.shirt);
      s.fill(9, 7 + top, 2, 3, look.shirt);
      s.fill(2, 9 + top, 2, 2, look.skin);
      s.fill(7, 9 + top, 2, 2, look.skin);
    } else if (zombie) {
      s.fill(0, 7 + top, 2, 3, look.shirt);
      s.fill(9, 7 + top, 2, 3, look.shirt);
    } else {
      for (const [side, x] of [[-1, 0], [1, 9]] as const) {
        const swing = walking ? (step === side ? -1 : step === -side ? 1 : 0) : 0;
        s.fill(x, 7 + top + swing, 2, 7, look.shirt);
        s.fill(x, 14 + top + swing, 2, 2, look.skin);
      }
    }
    if (zombie && view === "front") {
      s.fill(4, 12 + top, 1, 1, BLOOD);
      s.fill(6, 13 + top, 2, 1, BLOOD);
    }
    // head
    s.fill(2, 0 + top, 7, 7, look.skin);
    if (view === "front") {
      if (look.hairStyle !== "bald") {
        s.fill(2, 0 + top, 7, 2, look.hair);
        s.fill(2, 2 + top, 1, 2, look.hair);
        s.fill(8, 2 + top, 1, 2, look.hair);
        if (look.hairStyle === "long") {
          s.fill(1, 2 + top, 1, 7, look.hair);
          s.fill(9, 2 + top, 1, 7, look.hair);
        }
      }
      const eye = zombie ? "#ead4aa" : INK;
      s.fill(4, 4 + top, 1, 1, eye);
      s.fill(6, 4 + top, 1, 1, eye);
    } else {
      if (look.hairStyle !== "bald") s.fill(2, 0 + top, 7, look.hairStyle === "long" ? 8 : 6, look.hair);
    }
  } else {
    // side view, drawn facing right and mirrored for left
    const m = view === "left" ? -1 : 1;
    const X = (cx: number, w: number) => (m === 1 ? cx : 11 - cx - w);
    const f = (cx: number, cy: number, w: number, h: number, c: string) => s.fill(X(cx, w), cy, w, h, c);
    // legs scissor back and forth
    const stride = walking ? step : 0;
    f(4 - stride, 17 + top, 3, 10 - top, look.pants);
    f(4 - stride, 27, 4, 2, look.shoes);
    f(4 + stride, 17 + top, 3, 10 - top, look.pants);
    f(4 + stride, 27, 4, 2, look.shoes);
    f(3, 7 + top, 5, 9, look.shirt);
    f(3, 16 + top, 5, 1, look.pants);
    if (zombie) {
      // arm held straight out in front
      f(5, 8 + top, 4, 2, look.shirt);
      f(9, 8 + top, 2, 2, look.skin);
      f(4, 12 + top, 2, 1, BLOOD);
    } else {
      f(4 + stride, 7 + top, 2, 7, look.shirt);
      f(4 + stride, 14 + top, 2, 2, look.skin);
    }
    // head, nudged forward on a zombie's hunch
    const hx = zombie ? 4 : 3;
    f(hx, 0 + top, 6, 7, look.skin);
    if (look.hairStyle !== "bald") {
      f(hx, 0 + top, 6, 2, look.hair);
      f(hx, 2 + top, 2, look.hairStyle === "long" ? 7 : 3, look.hair);
    }
    f(hx + 4, 3 + top, 1, 1, zombie ? "#ead4aa" : INK);
  }
  s.paint(ctx);
}

/** A body on its back in a pool of blood, head to the left or right by dir. Origin = body centre. */
export function drawCorpse(ctx: CanvasRenderingContext2D, look: CharacterLook, dir: number): void {
  ctx.fillStyle = BLOOD;
  for (let j = -6; j <= 6; j++)
    for (let i = -20; i <= 20; i++) if ((i * i) / 400 + (j * j) / 36 <= 1) ctx.fillRect(i, j + 2, 1, 1);

  const m = dir % 8 < 4 ? 1 : -1;
  const s = new Sprite8(-31, -5);
  const f = (cx: number, cy: number, w: number, h: number, c: string) => s.fill(m === 1 ? cx : 31 - cx - w, cy, w, h, c);
  f(0, 1, 2, 3, look.shoes);
  f(2, 1, 11, 3, look.pants);
  f(13, 0, 10, 5, look.shirt);
  f(15, -1, 5, 1, look.shirt);
  f(17, -2, 2, 1, look.skin);
  f(15, 5, 5, 1, look.shirt);
  f(17, 6, 2, 1, look.skin);
  f(23, 0, 6, 5, look.skin);
  if (look.hairStyle !== "bald") f(27, 0, 2, 5, look.hair);
  s.paint(ctx);
}
