import { Painter, SS } from "../art/painter";
import { pixelize } from "../art/pixel";
import { spriteDef } from "./sprites";

export interface Sprite {
  key: string;
  /** Size and anchor in world px. */
  w: number;
  h: number;
  ax: number;
  ay: number;
  /** Normalised atlas UVs. */
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** Alpha mask at SS resolution, for pixel-accurate picking. */
  mask: Uint8Array;
}

const SIZE = 4096;
const GAP = 2;

/**
 * Lazily rasterises sprite recipes with Canvas2D and packs them into one GPU texture
 * with a simple shelf packer. New sprites are uploaded the first time they're requested.
 */
export class Atlas {
  readonly texture: GPUTexture;
  private sprites = new Map<string, Sprite>();
  private shelfX = GAP;
  private shelfY = GAP;
  private shelfH = 0;
  private canvas = new OffscreenCanvas(256, 256);
  private ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;

  constructor(private device: GPUDevice) {
    this.texture = device.createTexture({
      size: [SIZE, SIZE],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  get(key: string): Sprite {
    let s = this.sprites.get(key);
    if (!s) {
      s = this.build(key);
      this.sprites.set(key, s);
    }
    return s;
  }

  private build(key: string): Sprite {
    const def = spriteDef(key);
    const pw = Math.ceil(def.w * SS);
    const ph = Math.ceil(def.h * SS);
    if (this.canvas.width < pw || this.canvas.height < ph) {
      this.canvas = new OffscreenCanvas(Math.max(pw, this.canvas.width), Math.max(ph, this.canvas.height));
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;
    }
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    def.draw(new Painter(ctx as unknown as CanvasRenderingContext2D, def.ax, def.ay));
    ctx.restore();

    // shelf pack
    if (this.shelfX + pw + GAP > SIZE) {
      this.shelfX = GAP;
      this.shelfY += this.shelfH + GAP;
      this.shelfH = 0;
    }
    if (this.shelfY + ph + GAP > SIZE) throw new Error("Sprite atlas full");
    const x = this.shelfX;
    const y = this.shelfY;
    this.shelfX += pw + GAP;
    this.shelfH = Math.max(this.shelfH, ph);

    const img = pixelize(ctx.getImageData(0, 0, pw, ph));
    ctx.putImageData(img, 0, 0);
    const mask = new Uint8Array(pw * ph);
    for (let i = 0; i < mask.length; i++) mask[i] = img.data[i * 4 + 3];

    this.device.queue.copyExternalImageToTexture(
      { source: this.canvas, origin: { x: 0, y: 0 } },
      { texture: this.texture, origin: { x, y }, premultipliedAlpha: true },
      [pw, ph],
    );

    return {
      key,
      w: pw / SS,
      h: ph / SS,
      ax: def.ax,
      ay: def.ay,
      u0: x / SIZE,
      v0: y / SIZE,
      u1: (x + pw) / SIZE,
      v1: (y + ph) / SIZE,
      mask,
    };
  }

  /** Is the sprite opaque at local world-px (lx, ly) measured from its top-left? */
  hit(s: Sprite, lx: number, ly: number): boolean {
    const pw = Math.round(s.w * SS);
    const px = Math.floor(lx * SS);
    const py = Math.floor(ly * SS);
    if (px < 0 || py < 0 || px >= pw || py >= Math.round(s.h * SS)) return false;
    return s.mask[py * pw + px] > 40;
  }
}
