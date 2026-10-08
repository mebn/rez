import { shade } from "./color";
import { heldModel, type HeldModel } from "./held";

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

/** How the body is held: upright, crouched low, or flat on the belly. */
export type Stance = "stand" | "crouch" | "crawl";

/** Sprite bounds for every character frame; anchor is between the feet. Room for a raised axe. */
export const CHAR_SPRITE = { w: 72, h: 94, ax: 36, ay: 78 };

/** Frames 0..7 are the walk cycle; this one is standing still. */
export const IDLE_FRAME = 8;
export const WALK_FRAMES = 8;
/** Frames 9..12: an attack, from wind-up through the hit to recovery. Unarmed, it's a shove. */
export const ATTACK_FRAME = 9;
export const ATTACK_FRAMES = 4;
/** Frames 13..14: knocked back off balance, then catching it. */
export const STAGGER_FRAME = 13;
/** Sitting on a bench or chair, the anchor on the ground under the seat. */
export const SIT_FRAME = 15;
const SEAT_Z = 18;

/** Corpse sprite bounds; anchor is the middle of the body on the ground. */
export const CORPSE_SPRITE = { w: 84, h: 44, ax: 42, ay: 22 };

const BLOOD = "#5e1612";
const BLOOD_WET = "#7a1d17";

/**
 * Characters are posed as a tiny 3D rig (limbs, torso, head) and projected isometrically, so
 * every one of the 8 directions is a real view rather than a mirrored drawing. Points are
 * (x, y, z) in character px: x and y along the world tile axes, z up, feet at the origin.
 */
type V = [number, number, number];

const UP: V = [0, 0, 1];
const add = (...vs: V[]): V => vs.reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0]);
const mul = (v: V, k: number): V => [v[0] * k, v[1] * k, v[2] * k];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V): V => mul(a, 1 / (len(a) || 1));
/** The part of v square to axis a (unit). */
const perp = (v: V, a: V): V => sub(v, mul(a, dot(v, a)));

const UPPER_ARM = 10;
const FOREARM = 10;

/** Two-bone IK: where the elbow goes for a hand at `hand`, bending toward `bend`. */
function elbowFor(shoulder: V, hand: V, bend: V): V {
  const d = sub(hand, shoulder);
  const dist = Math.min(len(d), UPPER_ARM + FOREARM - 0.01);
  const mid = add(shoulder, mul(norm(d), dist / 2));
  const out = Math.sqrt(Math.max(0, UPPER_ARM * UPPER_ARM - (dist / 2) * (dist / 2)));
  return add(mid, mul(norm(perp(bend, norm(d))), out));
}

/** Same direction as the world's iso projection, scaled so a sideways px is one screen px. */
function scr(p: V): [number, number] {
  return [(p[0] - p[1]) / Math.SQRT2, (p[0] + p[1]) / (2 * Math.SQRT2) - p[2]];
}

/** How far toward the camera a point (or direction) is. Bigger draws later. */
const depth = (p: V) => p[0] + p[1] + 0.707 * p[2];

/** Local (forward, right, up) axes for a heading. */
function rig(heading: number) {
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  const FW: V = [c, s, 0];
  const RT: V = [-s, c, 0];
  const W = (f: number, r: number, z: number): V => [f * c - r * s, f * s + r * c, z];
  return { FW, RT, W };
}

interface Part {
  d: number;
  draw(ctx: CanvasRenderingContext2D): void;
}

function paint(ctx: CanvasRenderingContext2D, parts: Part[]): void {
  parts.sort((a, b) => a.d - b.d);
  for (const p of parts) p.draw(ctx);
}

/** A rounded limb segment with a dark rim and a light streak on the upper-left side. */
function limb(ctx: CanvasRenderingContext2D, a: V, b: V, w: number, color: string): void {
  const [ax, ay] = scr(a);
  const [bx, by] = scr(b);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.strokeStyle = shade(color, 0.5);
  ctx.lineWidth = w + 1.1;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ax - w * 0.18, ay - w * 0.1);
  ctx.lineTo(bx - w * 0.18, by - w * 0.1);
  ctx.strokeStyle = shade(color, 1.14);
  ctx.lineWidth = w * 0.35;
  ctx.stroke();
}

function blob(ctx: CanvasRenderingContext2D, p: V, r: number, color: string): void {
  const [x, y] = scr(p);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = shade(color, 0.55);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 0.15, y - 0.15, r - 0.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/** Points around an elliptical cross-section centred on c, spanned by axes u and v. */
function ring(c: V, u: V, v: V, a: number, b: number, n = 14): V[] {
  const out: V[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    out.push(add(c, mul(u, Math.cos(t) * a), mul(v, Math.sin(t) * b)));
  }
  return out;
}

function hull(pts: [number, number][]): [number, number][] {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Fill the convex hull of a few cross-sections: a torso, a pelvis. Shaded left (lit) to right. */
function solid(ctx: CanvasRenderingContext2D, sections: V[][], color: string): [number, number][] {
  const pts = hull(sections.flat().map(scr));
  let x0 = Infinity;
  let x1 = -Infinity;
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.closePath();
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(color, 1.1));
  g.addColorStop(0.45, color);
  g.addColorStop(1, shade(color, 0.7));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = shade(color, 0.5);
  ctx.lineWidth = 0.9;
  ctx.lineJoin = "round";
  ctx.stroke();
  return pts;
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

/** A head at c, the face looking along F with the crown toward Up and R to its right. */
function head(ctx: CanvasRenderingContext2D, look: CharacterLook, c: V, F: V, Up: V, R: V): void {
  const zombie = !!look.zombie;
  const bald = look.hairStyle === "bald";
  const hair = bald ? look.skin : look.hair;
  const [fx, fy] = scr(add(c, mul(F, 0.9)));
  const [hx, hy] = scr(add(c, mul(F, -1.1), mul(Up, 0.7)));

  const back = () => {
    ellipse(ctx, hx, hy, 5.1, 5.5);
    const g = ctx.createRadialGradient(hx - 1.8, hy - 2.2, 0.5, hx, hy, 6);
    g.addColorStop(0, shade(hair, 1.25));
    g.addColorStop(1, shade(hair, 0.8));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade(hair, 0.5);
    ctx.lineWidth = 0.9;
    ctx.stroke();
  };
  const face = () => {
    ellipse(ctx, fx, fy, 4.6, 5.0);
    const g = ctx.createRadialGradient(fx - 1.6, fy - 2, 0.4, fx, fy, 5.4);
    g.addColorStop(0, shade(look.skin, 1.12));
    g.addColorStop(1, shade(look.skin, 0.78));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = shade(look.skin, 0.5);
    ctx.lineWidth = 0.9;
    ctx.stroke();
  };

  const faceOn = depth(F) > -0.25;
  if (!faceOn) {
    face();
    back();
    return;
  }
  back();
  face();
  if (!bald) {
    // hairline: a cap of hair over the top and back of the face
    ctx.save();
    ellipse(ctx, fx, fy, 4.6, 5.0);
    ctx.clip();
    const [cx, cy] = scr(add(c, mul(Up, 3.4), mul(F, -0.8)));
    ellipse(ctx, cx, cy, 5.2, look.hairStyle === "long" ? 3.8 : 3.2);
    ctx.fillStyle = shade(look.hair, 1.05);
    ctx.fill();
    ctx.restore();
  }
  for (const sd of [-1, 1]) {
    const off = add(mul(F, 4.2), mul(R, sd * 1.8), mul(Up, 0.3));
    if (depth(off) < 0.9) continue;
    const [ex, ey] = scr(add(c, off));
    ellipse(ctx, ex, ey, 0.65, 0.65);
    ctx.fillStyle = zombie ? "#d8d2b0" : "#1c1612";
    ctx.fill();
    if (zombie) {
      ctx.strokeStyle = "rgba(90,20,20,0.7)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
  if (zombie) {
    const off = add(mul(F, 4.3), mul(Up, -2.6));
    if (depth(off) > 0.9) {
      const [mx, my] = scr(add(c, off));
      ellipse(ctx, mx, my, 1.3, 0.6);
      ctx.fillStyle = "#3a1210";
      ctx.fill();
      ctx.fillStyle = "rgba(110,25,20,0.8)";
      ctx.fillRect(mx - 0.4, my, 0.8, 2.2);
    }
  }
}

/** Soft shadow on the ground, an ellipse spanned by A and B around c. */
function groundShadow(ctx: CanvasRenderingContext2D, c: V, A: V, B: V, alpha: number): void {
  const [cx, cy] = scr(c);
  const [ax, ay] = scr(A);
  const [bx, by] = scr(B);
  ctx.save();
  ctx.transform(ax, ay, bx, by, cx, cy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(8,10,8,${alpha})`);
  g.addColorStop(0.6, `rgba(8,10,8,${alpha * 0.7})`);
  g.addColorStop(1, "rgba(8,10,8,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Dark stains on a zombie's shirt, clipped to the torso outline. */
function bloodStains(ctx: CanvasRenderingContext2D, outline: [number, number][], at: V): void {
  const [x, y] = scr(at);
  ctx.save();
  ctx.beginPath();
  outline.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "rgba(94,22,18,0.75)";
  for (const [dx, dy, r] of [[-2, -3, 2.6], [1.5, 1, 2], [-0.5, 4, 1.6], [3, -5, 1.2]]) {
    ellipse(ctx, x + dx, y + dy, r * 1.2, r);
    ctx.fill();
  }
  ctx.restore();
}

/** 8 directions; dir 0 heads along +x, dir 1 (+x +y) walks toward the camera. */
const headingFor = (dir: number) => (dir * Math.PI) / 4;

/**
 * A person, about 58 px tall, feet at the origin. Walking swings legs and arms in opposite
 * phase; zombies lean in with their arms out and drag a foot. Crouching folds the legs and
 * leans the body forward; crawling has its own pose.
 */
export function drawCharacter(ctx: CanvasRenderingContext2D, look: CharacterLook, dir: number, frame: number, stance: Stance = "stand", held = ""): void {
  const act = frame >= ATTACK_FRAME && frame < ATTACK_FRAME + ATTACK_FRAMES ? frame - ATTACK_FRAME : -1;
  const stag = frame >= STAGGER_FRAME && frame < SIT_FRAME ? frame - STAGGER_FRAME : -1;
  const sit = frame === SIT_FRAME;
  const walking = frame < IDLE_FRAME;
  const ph = (frame / WALK_FRAMES) * Math.PI * 2;
  const s = walking ? Math.sin(ph) : 0;
  const c = walking ? Math.cos(ph) : 0;
  if (stance === "crawl") return drawCrawler(ctx, look, headingFor(dir), s, held);

  const { FW, RT, W } = rig(headingFor(dir));
  const zombie = !!look.zombie;
  const crouch = stance === "crouch";
  const parts: Part[] = [];

  groundShadow(ctx, [0, 0, 0], mul(FW, 10), mul(RT, 10), 0.42);

  const bob = walking ? (1 - Math.abs(s)) * 0.8 : 0;
  const hipF = crouch ? -2 : 0;
  const hipZ = sit ? SEAT_Z : (crouch ? 15 : 26) + bob;
  // attacks throw the shoulders into it; a stagger rocks them back
  const lunge = act === 1 || act === 2 ? 3.5 : act === 0 ? -1 : 0;
  const lean = sit ? -0.6 : (crouch ? 6 : zombie ? 2.5 : 0.4) + lunge + (stag === 0 ? -6 : stag === 1 ? -2.5 : 0);
  const shZ = sit ? SEAT_Z + 19 : (crouch ? 34 : 45) + bob - (zombie ? 1 : 0);
  const stride = crouch ? 3.5 : zombie ? 4.5 : 6;

  // legs
  for (const sd of [-1, 1]) {
    const lift = Math.max(0, sd * c) * (crouch ? 1.5 : 2.5) * (zombie && sd === 1 ? 0.3 : 1);
    const brace = act === 1 || act === 2 ? (sd === -1 ? 4 : -2) : stag >= 0 ? (sd === 1 ? -6 + stag * 3 : 1) : 0;
    const footF = (crouch ? hipF + 2 : 0) + sd * s * stride + brace;
    const hip = W(hipF, sd * 3, hipZ);
    const foot = sit ? W(10.5, sd * 3.4, 1.6) : W(footF, sd * 3.2, 1.6 + lift);
    const knee = sit
      ? W(9.5, sd * 3.3, SEAT_Z + 0.8)
      : crouch
      ? W(hipF + 7 + sd * s * 1.5, sd * 3.6, 12 + lift * 0.5)
      : W((hipF + footF) / 2 + 1.2 + lift * 0.4, sd * 3.1, (hipZ + 1.6 + lift) / 2 + lift * 0.3);
    parts.push({
      d: depth(knee),
      draw(ctx) {
        limb(ctx, hip, knee, 4.8, look.pants);
        limb(ctx, knee, foot, 4.1, look.pants);
        limb(ctx, add(foot, W(-1.4, 0, -0.4)), add(foot, W(3, 0, -0.6)), 3.3, look.shoes);
      },
    });
  }

  // torso: pelvis in trousers, shirt up to the shoulders
  const chest = W(hipF + lean * 0.7, 0, shZ - 5);
  const sh = W(hipF + lean, 0, shZ);
  const mid = W(hipF + lean * 0.5, 0, (hipZ + shZ) / 2);
  parts.push({
    d: depth(mid),
    draw(ctx) {
      solid(ctx, [ring(W(hipF, 0, hipZ - 2.5), RT, FW, 4.4, 2.8), ring(W(hipF, 0, hipZ + 2.5), RT, FW, 4.7, 2.9)], look.pants);
      const shirt = solid(ctx, [ring(W(hipF + 0.2, 0, hipZ + 1), RT, FW, 4.8, 3), ring(chest, RT, FW, 6.3, 3.4), ring(sh, RT, FW, 5.7, 3)], look.shirt);
      if (zombie) bloodStains(ctx, shirt, mid);
    },
  });

  // arms, and whatever is in the hands
  const model = heldModel(held);
  // seated: hands rest on the knees, anything held lies across the lap
  const grip: GripPose | null = sit
    ? { right: W(7.5, 3.8, SEAT_Z + 3), left: W(7.5, -3.8, SEAT_Z + 3), T: norm(W(0.25, -1, 0.05)), H: UP }
    : gripPose(model, act, W, sh, crouch);
  for (const sd of [-1, 1]) {
    const shoulder = add(sh, mul(RT, sd * 6.4), [0, 0, -1.4]);
    let elbow: V;
    let hand: V;
    const posed = sd === 1 ? grip?.right : grip?.left;
    if (posed) {
      hand = posed;
      elbow = elbowFor(shoulder, hand, add(mul(RT, sd), [0, 0, -0.7], mul(FW, -0.4)));
    } else if (stag >= 0) {
      // flung out for balance
      hand = add(sh, W(stag ? 4 : -1, sd * (stag ? 8 : 10), stag ? -12 : 2));
      elbow = elbowFor(shoulder, hand, add(mul(RT, sd), [0, 0, -0.5]));
    } else if (zombie) {
      elbow = add(sh, W(6, sd * 6.2, -3 + sd * c * 0.6));
      hand = add(sh, W(13 + sd * s * 1.5, sd * 5, -4.5 + sd * c));
    } else {
      const swing = -sd * s * 4;
      elbow = add(sh, W(swing * 0.5 - 0.4 + (crouch ? 2 : 0), sd * 7.4, -10));
      hand = add(sh, W(swing + 0.8 + (crouch ? 4 : 0), sd * 7.2, crouch ? -17 : -19.5));
    }
    parts.push({
      d: depth(elbow) + 0.01,
      draw(ctx) {
        limb(ctx, shoulder, elbow, 3.7, look.shirt);
        limb(ctx, elbow, hand, 3.2, zombie ? look.skin : look.shirt);
        blob(ctx, hand, 1.8, look.skin);
      },
    });
  }
  if (model && grip) {
    const { right, T, H } = grip;
    const tip = add(right, mul(T, Math.max(...model.segs.map((g) => Math.max(g[0], g[2])))));
    const second = grip.left;
    parts.push({
      d: Math.max(depth(add(right, tip)) / 2, depth(right)) + 0.05,
      draw(ctx) {
        drawHeld(ctx, model, right, T, H);
        blob(ctx, right, 1.8, look.skin);
        if (second && model.grip === "two") blob(ctx, second, 1.8, look.skin);
      },
    });
  }

  // neck and head
  const hc = add(sh, W((zombie ? 2.4 : 0.5) + (stag === 0 ? -1.5 : 0), zombie ? 0.8 : 0, zombie ? 6.6 : 8.2));
  parts.push({
    d: depth(sh) + 0.02,
    draw(ctx) {
      limb(ctx, add(sh, [0, 0, -1]), add(hc, [0, 0, -3]), 3.4, look.skin);
    },
  });
  parts.push({ d: depth(hc), draw: (ctx) => head(ctx, look, hc, FW, UP, RT) });
  if (look.hairStyle === "long") {
    const a = add(hc, mul(FW, -2.4), [0, 0, 1]);
    const b = add(sh, mul(FW, -2.6), [0, 0, -1.5]);
    parts.push({ d: depth(mid) + 1.2 * depth(mul(FW, -1)), draw: (ctx) => limb(ctx, a, b, 8.4, look.hair) });
  }

  paint(ctx, parts);
}

/** Flat on the belly, propped on the elbows. Moving pulls one arm forward, then the other. */
function drawCrawler(ctx: CanvasRenderingContext2D, look: CharacterLook, heading: number, s: number, held: string): void {
  const { FW, RT, W } = rig(heading);
  const parts: Part[] = [];
  groundShadow(ctx, W(-4, 0, 0), mul(FW, 24), mul(RT, 9), 0.4);

  for (const sd of [-1, 1]) {
    const hip = W(-9, sd * 3, 4.5);
    const knee = W(-17 + sd * s * 2, sd * 3.6, 3.2);
    const foot = W(-24.5 + sd * s * 1.5, sd * 3.4, 3);
    parts.push({
      d: depth(knee),
      draw(ctx) {
        limb(ctx, hip, knee, 4.8, look.pants);
        limb(ctx, knee, foot, 4.1, look.pants);
        limb(ctx, add(foot, [0, 0, -1]), add(foot, W(-1.5, 0, 3)), 3.3, look.shoes);
      },
    });
  }
  const mid = W(0, 0, 5.5);
  parts.push({
    d: depth(mid),
    draw(ctx) {
      solid(ctx, [ring(W(-10, 0, 4.8), RT, UP, 4.4, 2.6), ring(W(-3, 0, 5.2), RT, UP, 4.7, 2.8)], look.pants);
      const shirt = solid(ctx, [ring(W(-4, 0, 5.4), RT, UP, 4.9, 2.9), ring(W(4, 0, 6.4), RT, UP, 6.2, 3.3), ring(W(9, 0, 7), RT, UP, 5.6, 3)], look.shirt);
      if (look.zombie) bloodStains(ctx, shirt, W(3, 0, 8));
    },
  });
  for (const sd of [-1, 1]) {
    const reach = sd * s * 3;
    const shoulder = W(8.5, sd * 6.2, 6.5);
    const elbow = W(13 + reach, sd * 8.6, 2);
    const hand = W(18 + reach * 1.2, sd * 6.4, 1.6);
    parts.push({
      d: depth(elbow) + 0.01,
      draw(ctx) {
        limb(ctx, shoulder, elbow, 3.7, look.shirt);
        limb(ctx, elbow, hand, 3.2, look.zombie ? look.skin : look.shirt);
        // dragged along in the right hand, lying flat
        const model = sd === 1 ? heldModel(held) : null;
        if (model) drawHeld(ctx, model, hand, norm(W(0.6, 0.8, 0)), UP);
        blob(ctx, hand, 1.8, look.skin);
      },
    });
  }
  const hc = W(15, 0, 10.5);
  parts.push({ d: depth(W(10, 0, 8)), draw: (ctx) => limb(ctx, W(9, 0, 7.5), W(13, 0, 8.5), 3.4, look.skin) });
  parts.push({ d: depth(hc), draw: (ctx) => head(ctx, look, hc, FW, UP, RT) });
  if (look.hairStyle === "long") {
    const a = W(12.5, 0, 12);
    const b = W(9, 0, 9.5);
    parts.push({ d: depth(hc) - 0.5, draw: (ctx) => limb(ctx, a, b, 7.5, look.hair) });
  }
  paint(ctx, parts);
}

/** A body on its back in a pool of blood, laid out along its dir. Origin = body centre. */
export function drawCorpse(ctx: CanvasRenderingContext2D, look: CharacterLook, dir: number): void {
  const { FW, RT, W } = rig(headingFor(dir));
  // pool of blood soaking out from under the torso
  ctx.save();
  for (const [f, r, a, b, col] of [
    [2, 0, 15, 9, BLOOD], [-6, 2, 9, 7, BLOOD], [9, -3, 8, 6, BLOOD], [3, 1, 9, 5, BLOOD_WET],
  ] as const) {
    const [cx, cy] = scr(W(f, r, 0));
    const [ax, ay] = scr(mul(FW, a));
    const [bx, by] = scr(mul(RT, b));
    ctx.save();
    ctx.transform(ax, ay, bx, by, cx, cy);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  const parts: Part[] = [];
  for (const sd of [-1, 1]) {
    const hip = W(-5, sd * 3, 3);
    const knee = W(-14, sd * 3.9, 3);
    const foot = W(-22, sd * 4.6, 2.6);
    parts.push({
      d: depth(knee),
      draw(ctx) {
        limb(ctx, hip, knee, 4.8, look.pants);
        limb(ctx, knee, foot, 4.1, look.pants);
        limb(ctx, add(foot, [0, 0, -0.5]), add(foot, W(-0.5, 0, 3.6)), 3.3, look.shoes);
      },
    });
  }
  const mid = W(3, 0, 3.5);
  parts.push({
    d: depth(mid),
    draw(ctx) {
      solid(ctx, [ring(W(-6, 0, 3), RT, UP, 4.4, 2.4), ring(W(0, 0, 3.2), RT, UP, 4.7, 2.5)], look.pants);
      const shirt = solid(ctx, [ring(W(-1, 0, 3.3), RT, UP, 4.9, 2.6), ring(W(7, 0, 3.6), RT, UP, 6.2, 2.8), ring(W(12, 0, 3.4), RT, UP, 5.6, 2.6)], look.shirt);
      bloodStains(ctx, shirt, W(6, 0, 6));
    },
  });
  for (const sd of [-1, 1]) {
    const shoulder = W(11.5, sd * 6.2, 3);
    const elbow = W(6, sd * 11.5, 2);
    const hand = W(0.5, sd * 13.5, 1.8);
    parts.push({
      d: depth(elbow),
      draw(ctx) {
        limb(ctx, shoulder, elbow, 3.7, look.shirt);
        limb(ctx, elbow, hand, 3.2, look.zombie ? look.skin : look.shirt);
        blob(ctx, hand, 1.8, look.skin);
      },
    });
  }
  const hc = W(18.5, 0, 4.5);
  parts.push({ d: depth(hc), draw: (ctx) => head(ctx, look, hc, UP, FW, mul(RT, -1)) });
  paint(ctx, parts);
}

/** Draw a held item with its grip at `at`, its length along T and its width along H. */
function drawHeld(ctx: CanvasRenderingContext2D, m: HeldModel, at: V, T: V, H: V): void {
  for (const [t0, h0, t1, h1, w, color] of m.segs)
    limb(ctx, add(at, mul(T, t0), mul(H, h0)), add(at, mul(T, t1), mul(H, h1)), w, color);
}

interface GripPose {
  right: V;
  /** Second hand on the item (two-handed), or the free hand's spot when the pose sets one. */
  left?: V;
  T: V;
  H: V;
}

/**
 * Where the hands go: holding the item while walking, or a frame of its attack. Returns null
 * for empty hands outside an attack (the arms just swing).
 */
function gripPose(m: HeldModel | null, act: number, W: (f: number, r: number, z: number) => V, sh: V, crouch: boolean): GripPose | null {
  const at = (f: number, r: number, z: number) => add(sh, W(f, r, z));
  const dirn = (f: number, r: number, z: number) => norm(W(f, r, z));
  /** An across-axis square to T that leans toward `toward`. */
  const across = (T: V, toward: V) => norm(perp(toward, T));
  const low = crouch ? 3 : 0;

  if (!m) {
    if (act < 0) return null;
    // shove: both palms to the chest, then thrust out hard
    const reach = [5, 15, 14, 9][act];
    const z = [-6, -4, -4.5, -9][act];
    return { right: at(reach, 4, z), left: at(reach, -4, z), T: dirn(1, 0, 0), H: UP };
  }

  const second = (p: GripPose) => (m.grip === "two" ? { ...p, left: add(p.right, mul(p.T, m.second ?? 6)) } : p);

  switch (m.swing) {
    case "pistol": {
      if (act < 0) {
        const T = dirn(0.7, 0, -0.75);
        return { right: at(4, 7.4, -18 + low), T, H: across(T, W(1, 0, 0.3)) };
      }
      const T = act === 1 ? dirn(1, 0, 0.4) : dirn(1, 0, 0);
      return { right: at(act === 1 ? 11.5 : 13, 2.5, act === 1 ? -0.5 : -2.5), left: at(10.5, 0.5, -4), T, H: across(T, UP) };
    }
    case "rifle": {
      if (act < 0) {
        const T = dirn(0.85, -0.3, -0.2);
        return second({ right: at(3, 5, -13 + low), T, H: across(T, UP) });
      }
      const T = act === 1 ? dirn(1, 0, 0.25) : dirn(1, 0, 0);
      return second({ right: at(act === 1 ? 3.5 : 5, 3.5, -1.5), T, H: across(T, UP) });
    }
    case "stab": {
      if (act < 0) {
        const T = dirn(0.9, 0, -0.3);
        return second({ right: at(m.grip === "two" ? 4 : 2, m.grip === "two" ? 4 : 7.4, -16 + low), T, H: across(T, UP) });
      }
      const reach = [-1, 14, 12, 5][act];
      const T = dirn(1, act === 0 ? 0.2 : 0, act === 0 ? 0.2 : -0.05);
      return second({ right: at(reach, m.grip === "two" ? 3 : 4.5, [-8, -4, -5, -11][act]), T, H: across(T, UP) });
    }
    case "heavy": {
      if (act < 0) {
        // carried at port arms, across the body
        const T = dirn(0.35, -0.4, 0.85);
        return second({ right: at(6, 3, -19 + low), T, H: across(T, W(1, 0, 0)) });
      }
      // overhead: raised behind the head, brought over and down
      const right = [at(-1, 3, 10), at(8, 2, 2), at(11, 1.5, -10), at(8, 2.5, -14)][act];
      const T = [dirn(-0.9, 0, 0.45), dirn(0.9, 0, 0.5), dirn(0.8, 0, -0.6), dirn(0.5, 0, -0.9)][act];
      return second({ right, T, H: across(T, W(1, 0, 0.2)) });
    }
    default: {
      if (act < 0) {
        // hanging from the right hand, pointing down and ahead
        const T = dirn(0.75, 0.1, -0.65);
        return second({ right: at(1.5, 7.6, -18.5 + low), T, H: across(T, W(1, 0, 1)) });
      }
      // a flat sweep from the right shoulder across the front
      const right = [at(-2, 9, 4), at(10, 5, -3), at(9, -3, -6), at(6, 6, -12)][act];
      const T = [dirn(-0.4, 0.6, 0.7), dirn(1, -0.6, 0.1), dirn(0.3, -1, -0.2), dirn(0.75, 0.1, -0.65)][act];
      return second({ right, T, H: across(T, UP) });
    }
  }
}
