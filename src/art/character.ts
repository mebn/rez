import { isoVec } from "./painter";
import { shade } from "./color";

export interface CharacterLook {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  shoes: string;
  /** "short" | "long" | "bald" */
  hairStyle: "short" | "long" | "bald";
}

/** Sprite bounds for every character frame; anchor is between the feet. */
export const CHAR_SPRITE = { w: 72, h: 100, ax: 36, ay: 88 };

/** Frames 0..7 are the walk cycle; this one is standing still. */
export const IDLE_FRAME = 8;
export const WALK_FRAMES = 8;

type P3 = [number, number, number];
const OUTLINE = "rgba(28,22,18,0.9)";

/**
 * Draws a person as a little 3D rig (legs, torso, arms, head) rotated toward one of
 * 8 directions and projected isometrically. Dir 0 = +x, then clockwise in 45° steps
 * (1 = +x+y which faces the camera).
 */
export function drawCharacter(ctx: CanvasRenderingContext2D, look: CharacterLook, dir: number, frame: number): void {
  const ang = (dir * Math.PI) / 4;
  const f: [number, number] = [Math.cos(ang), Math.sin(ang)];
  const r: [number, number] = [-f[1], f[0]];
  const walking = frame !== IDLE_FRAME;
  const phase = walking ? (frame / WALK_FRAMES) * Math.PI * 2 : 0;
  const swing = Math.sin(phase);
  const bob = walking ? Math.abs(Math.cos(phase)) * 1.4 : 0;

  // person-local (forward, right, up) in px -> screen px
  const S = (fwd: number, right: number, z: number): [number, number] => {
    const wx = (f[0] * fwd + r[0] * right) / 32;
    const wy = (f[1] * fwd + r[1] * right) / 32;
    return isoVec(wx, wy, z);
  };
  const depth = (fwd: number, right: number) => f[0] * fwd + r[0] * right + f[1] * fwd + r[1] * right;

  const capsule = (pts: P3[], width: number, color: string) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const path = () => {
      ctx.beginPath();
      pts.forEach(([a, b, c], i) => {
        const [x, y] = S(a, b, c);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
    };
    path();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = width + 1.6;
    ctx.stroke();
    path();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    // soft highlight on the lit side
    ctx.save();
    ctx.translate(-width * 0.18, -width * 0.12);
    path();
    ctx.strokeStyle = shade(color, 1.12);
    ctx.lineWidth = width * 0.35;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.restore();
  };

  // contact shadow
  ctx.save();
  ctx.scale(1, 0.5);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
  g.addColorStop(0, "rgba(0,0,0,0.32)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const hipZ = 30 + bob;
  const shZ = 47 + bob;
  const parts: { d: number; draw: () => void }[] = [];

  for (const side of [-1, 1]) {
    const s = side * swing;
    const lift = walking ? Math.max(0, -s) * 4 : 0;
    const footF = s * 8;
    const kneeF = s * 4 + (lift > 0 ? 3 : 1);
    const hx = side * 4;
    parts.push({
      d: depth(footF, hx) - 0.5,
      draw: () => {
        capsule([[0, hx, hipZ], [kneeF, hx, 16 + lift * 0.6], [footF, hx, 3 + lift]], 6.2, look.pants);
        capsule([[footF - 1, hx, 2 + lift], [footF + 3.5, hx, 2 + lift]], 5, look.shoes);
      },
    });
    const handF = -s * 7;
    const ax = side * 8.2;
    parts.push({
      d: depth(handF, ax) + 0.5,
      draw: () => {
        const elbow: P3 = [-s * 3.5, side * 9, shZ - 10];
        capsule([[0, side * 7.5, shZ - 1], elbow], 5.2, look.shirt);
        capsule([elbow, [handF, ax, shZ - 19]], 4.4, look.skin);
        capsule([[handF, ax, shZ - 19.5], [handF + 0.5, ax, shZ - 20]], 5, look.skin);
      },
    });
  }

  // torso + belt
  parts.push({
    d: 0,
    draw: () => {
      capsule([[0, 0, hipZ - 1], [0, 0, hipZ + 1]], 12.5, look.pants);
      capsule([[0, 0, hipZ + 3], [0, 0, shZ - 2]], 13.5, look.shirt);
      capsule([[0, -6, shZ - 1], [0, 6, shZ - 1]], 7, look.shirt);
    },
  });

  parts.sort((a, b) => a.d - b.d);
  for (const p of parts) p.draw();

  // neck + head
  const headZ = shZ + 10.5;
  capsule([[0, 0, shZ], [0, 0, shZ + 4]], 5, shade(look.skin, 0.9));
  const toward = f[0] + f[1]; // >0 means facing the camera
  const head = S(0, 0, headZ);
  const circle = (c: [number, number], rad: number, fill: string, outline = true) => {
    ctx.beginPath();
    ctx.arc(c[0], c[1], rad, 0, Math.PI * 2);
    if (outline) {
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.fillStyle = fill;
    ctx.fill();
  };
  circle(head, 6.6, look.skin);
  if (look.hairStyle !== "bald") {
    // hair sits back and on top of the head
    const hb = S(-2.2, 0, headZ + 2.2);
    ctx.save();
    ctx.beginPath();
    ctx.arc(head[0], head[1], 7.4, 0, Math.PI * 2);
    ctx.clip();
    circle(hb, 6.7, look.hair, false);
    ctx.restore();
    if (look.hairStyle === "long") {
      capsule([[-3.5, -3, headZ - 1], [-4, -3.5, headZ - 9]], 4, look.hair);
      capsule([[-3.5, 3, headZ - 1], [-4, 3.5, headZ - 9]], 4, look.hair);
    }
    ctx.beginPath();
    ctx.arc(head[0], head[1], 6.6, 0, Math.PI * 2);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  if (toward > -0.2) {
    // eyes
    ctx.fillStyle = "#2a1d16";
    for (const side of [-1, 1]) {
      const e = S(5.4, side * 2.4, headZ - 0.5);
      if (depth(5.4, side * 2.4) > -2) ctx.fillRect(e[0] - 0.6, e[1] - 0.7, 1.3, 1.5);
    }
  }
}
