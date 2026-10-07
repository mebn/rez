import { shade } from "../../art/color";
import { cylinder } from "../../art/shapes";
import type { Painter } from "../../art/painter";
import type { ObjectComponent } from "../../core/types";
import { Rng } from "../../core/rng";

function canopy(p: Painter, cx: number, cy: number, z: number, radius: number, colors: string[], seed: number): void {
  const rng = new Rng(seed);
  const ctx = p.ctx;
  const [x, y] = p.pt([cx, cy, z]);
  // dark underside first, then lighter clumps toward the upper left
  const blobs: [number, number, number, string][] = [];
  for (let i = 0; i < 26; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = Math.sqrt(rng.next()) * radius * 0.75;
    const bx = Math.cos(a) * d * 1.1;
    const by = Math.sin(a) * d * 0.8;
    const r = rng.range(radius * 0.28, radius * 0.45);
    const light = (-bx - by) / radius; // upper-left is lit
    const ci = Math.max(0, Math.min(colors.length - 1, Math.round((light + 1) * 0.5 * (colors.length - 1) + rng.range(-0.6, 0.6))));
    blobs.push([bx, by, r, colors[ci]]);
  }
  blobs.sort((a, b) => colors.indexOf(a[3]) - colors.indexOf(b[3]));
  ctx.fillStyle = shade(colors[0], 0.8);
  ctx.beginPath();
  ctx.ellipse(x, y + 3, radius * 1.05, radius * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [bx, by, r, c] of blobs) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x + bx, y + by, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // leaf speckle
  for (let i = 0; i < 140; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = Math.sqrt(rng.next()) * radius;
    ctx.fillStyle = rng.chance(0.5) ? shade(colors[colors.length - 1], 1.12) : shade(colors[0], 0.8);
    ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, 1.2, 1.2);
  }
}

export const oakTree: ObjectComponent = {
  kind: "object",
  id: "tree_oak",
  name: "Oak Tree",
  category: "nature",
  size: [1, 1],
  height: 150,
  pad: 30,
  solid: true,
  draw(f) {
    const c = f.w(16, 16, 0);
    f.p.groundShade(c[0], c[1], 46, 22, 0.25);
    cylinder(f.p, c[0], c[1], 4.5, 0, 70, "#5a4330");
    const [tx, ty] = f.p.pt([c[0], c[1], 60]);
    const ctx = f.ctx;
    ctx.strokeStyle = "#4e3a29";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx, ty + 6);
    ctx.lineTo(tx - 12, ty - 14);
    ctx.moveTo(tx, ty + 2);
    ctx.lineTo(tx + 14, ty - 18);
    ctx.stroke();
    canopy(f.p, c[0], c[1], 104, 40, ["#3c4f24", "#4b602b", "#5a7032", "#6c823c", "#82964b"], 11);
  },
};

export const pineTree: ObjectComponent = {
  kind: "object",
  id: "tree_pine",
  name: "Pine Tree",
  category: "nature",
  size: [1, 1],
  height: 160,
  pad: 24,
  solid: true,
  draw(f) {
    const c = f.w(16, 16, 0);
    f.p.groundShade(c[0], c[1], 34, 17, 0.25);
    cylinder(f.p, c[0], c[1], 3.5, 0, 40, "#56402d");
    const ctx = f.ctx;
    const rng = new Rng(5);
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const z = 28 + i * 24;
      const r = 32 - i * 5.5;
      const [x, y] = f.p.pt([c[0], c[1], z]);
      const top = y - 38;
      const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
      g.addColorStop(0, "#4d6a3a");
      g.addColorStop(0.5, "#35502c");
      g.addColorStop(1, "#243a22");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, top);
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        const px = x - r + t * r * 2;
        const py = y + Math.sin(t * Math.PI) * r * 0.32 + rng.range(-1.5, 1.5);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(20,30,15,0.5)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  },
};

export const bush: ObjectComponent = {
  kind: "object",
  id: "bush",
  name: "Bush",
  category: "nature",
  size: [1, 1],
  height: 36,
  pad: 8,
  solid: true,
  occludes: false,
  draw(f) {
    const c = f.w(16, 16, 0);
    f.p.groundShade(c[0], c[1], 24, 12, 0.22);
    canopy(f.p, c[0], c[1], 14, 18, ["#3a4c22", "#4a5f2a", "#5a7032", "#6f8640"], 3);
  },
};

export const berryBush: ObjectComponent = {
  kind: "object",
  id: "berry_bush",
  name: "Berry Bush",
  category: "nature",
  size: [1, 1],
  height: 36,
  pad: 8,
  solid: true,
  occludes: false,
  container: { capacity: 5, loot: "berry_bush", label: "Berry Bush" },
  draw(f) {
    const c = f.w(16, 16, 0);
    f.p.groundShade(c[0], c[1], 24, 12, 0.22);
    canopy(f.p, c[0], c[1], 14, 18, ["#34481f", "#425a27", "#536a2e", "#647b38"], 9);
    const rng = new Rng(4);
    const [x, y] = f.p.pt([c[0], c[1], 14]);
    for (let i = 0; i < 14; i++) {
      f.ctx.fillStyle = rng.chance(0.3) ? "#3a2a5a" : "#7a2840";
      f.ctx.beginPath();
      f.ctx.arc(x + rng.range(-18, 18), y + rng.range(-12, 12), 1.4, 0, Math.PI * 2);
      f.ctx.fill();
    }
  },
};
