/** Small drawing helpers for 32x32 item icons. Light comes from the upper left. */
export type Ctx = CanvasRenderingContext2D;

export const OUT = "rgba(25,20,15,0.85)";

export function outline(ctx: Ctx, lw = 1.2): void {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.stroke();
}

export function shape(ctx: Ctx, fill: string | CanvasGradient, path: () => void, lw = 1.2): void {
  ctx.beginPath();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  outline(ctx, lw);
}

export function vgrad(ctx: Ctx, x0: number, x1: number, a: string, b: string, c = b): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, a);
  g.addColorStop(0.45, b);
  g.addColorStop(1, c);
  return g;
}

/** Rotate so long items lie diagonally (handle bottom-left, head top-right). */
export function diag(ctx: Ctx, fn: () => void): void {
  ctx.save();
  ctx.translate(16, 16);
  ctx.rotate(-Math.PI / 4);
  ctx.translate(-16, -16);
  fn();
  ctx.restore();
}

/** Tin can with a label band. */
export function can(ctx: Ctx, label: string, accent: string, opts: { w?: number; h?: number; text?: string } = {}): void {
  const w = opts.w ?? 16;
  const h = opts.h ?? 20;
  const x = 16 - w / 2;
  const y = 28 - h;
  shape(ctx, vgrad(ctx, x, x + w, "#d4d6d4", "#9ea2a2", "#6e7272"), () => {
    ctx.moveTo(x, y + 2);
    ctx.lineTo(x, y + h - 2);
    ctx.ellipse(16, y + h - 2, w / 2, 2, 0, Math.PI, 0, true);
    ctx.lineTo(x + w, y + 2);
    ctx.ellipse(16, y + 2, w / 2, 2, 0, 0, Math.PI, true);
  });
  ctx.fillStyle = vgrad(ctx, x, x + w, label, label, "rgba(0,0,0,0.3)");
  ctx.fillRect(x + 0.6, y + 4, w - 1.2, h - 7);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(x + w * 0.6, y + 4, w * 0.4 - 0.6, h - 7);
  ctx.fillStyle = accent;
  ctx.fillRect(x + 2, y + h / 2 - 1, w - 4, 3);
  if (opts.text) {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(opts.text, 16, y + h / 2 + 1.4);
  }
  ctx.beginPath();
  ctx.ellipse(16, y + 2, w / 2, 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#c9cccb";
  ctx.fill();
  outline(ctx, 0.8);
}

/** Cardboard-style box in slight perspective. */
export function box(ctx: Ctx, front: string, side: string, x = 8, y = 6, w = 14, h = 22, d = 5): void {
  shape(ctx, side, () => {
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + d, y - d * 0.6);
    ctx.lineTo(x + w + d, y + h - d * 0.6);
    ctx.lineTo(x + w, y + h);
  });
  shape(ctx, front, () => ctx.rect(x, y, w, h));
  shape(ctx, "rgba(255,255,255,0.25)", () => {
    ctx.moveTo(x, y);
    ctx.lineTo(x + d, y - d * 0.6);
    ctx.lineTo(x + w + d, y - d * 0.6);
    ctx.lineTo(x + w, y);
  }, 0.8);
}

export function bottle(ctx: Ctx, glass: string, cap: string, liquid?: string, label?: string): void {
  shape(ctx, vgrad(ctx, 10, 22, glass, glass, "rgba(0,0,0,0.25)"), () => {
    ctx.moveTo(13.5, 4);
    ctx.lineTo(18.5, 4);
    ctx.lineTo(18.5, 9);
    ctx.quadraticCurveTo(22, 11, 22, 15);
    ctx.lineTo(22, 28);
    ctx.lineTo(10, 28);
    ctx.lineTo(10, 15);
    ctx.quadraticCurveTo(10, 11, 13.5, 9);
    ctx.closePath();
  });
  if (liquid) {
    ctx.fillStyle = liquid;
    ctx.fillRect(10.8, 16, 10.4, 11.3);
  }
  if (label) {
    ctx.fillStyle = label;
    ctx.fillRect(10.5, 17, 11, 6);
  }
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(11.5, 13, 1.5, 13);
  shape(ctx, cap, () => ctx.rect(13, 2, 6, 3), 0.8);
}

/** Generic handle (wrapped/plain) along +y from (x, y0) to (x, y1). */
export function handle(ctx: Ctx, x: number, y0: number, y1: number, w: number, color: string, wraps = 0): void {
  shape(ctx, vgrad(ctx, x - w / 2, x + w / 2, color, color, "rgba(0,0,0,0.35)"), () => {
    ctx.roundRect(x - w / 2, y0, w, y1 - y0, w / 2.5);
  });
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 0.6;
  for (let i = 1; i <= wraps; i++) {
    const y = y0 + ((y1 - y0) * i) / (wraps + 1);
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x + w / 2, y + 1);
    ctx.stroke();
  }
}

export const STEEL = "#b9bec0";
export const STEEL_DARK = "#7c8284";
