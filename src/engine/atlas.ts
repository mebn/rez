import { Painter, SS } from "../art/painter";
import { spriteDef } from "./sprites";

export interface Sprite {
  key: string;
  /** Size and anchor in world px. */
  w: number;
  h: number;
  ax: number;
  ay: number;
  /** Atlas page (texture array layer). */
  layer: number;
  /** Normalised atlas UVs. */
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** Alpha mask at SS resolution, for pixel-accurate picking. */
  mask: Uint8Array;
}

const SIZE = 2048;
const GAP = 2;

/**
 * Lazily rasterises sprite recipes with Canvas2D and packs them into a GPU texture array with
 * a simple shelf packer. New sprites are uploaded the first time they're requested, and a page
 * is added whenever the current one fills up.
 */
export class Atlas {
  texture: GPUTexture;
  /** Called with the new texture whenever a page is added, so the renderer can rebind it. */
  onGrow?: (texture: GPUTexture) => void;
  private layers = 1;
  private sprites = new Map<string, Sprite>();
  private layer = 0;
  private shelfX = GAP;
  private shelfY = GAP;
  private shelfH = 0;
  private canvas = new OffscreenCanvas(256, 256);
  private ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;

  constructor(private device: GPUDevice) {
    this.texture = this.createTexture(this.layers);
  }

  private createTexture(layers: number): GPUTexture {
    return this.device.createTexture({
      size: [SIZE, SIZE, layers],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  /** Add a page: copy every existing page into a bigger array and swap it in. */
  private grow(): void {
    const next = this.createTexture(this.layers + 1);
    const enc = this.device.createCommandEncoder();
    enc.copyTextureToTexture({ texture: this.texture }, { texture: next }, [SIZE, SIZE, this.layers]);
    this.device.queue.submit([enc.finish()]);
    this.texture.destroy();
    this.texture = next;
    this.layers++;
    this.onGrow?.(next);
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
    if (pw + GAP * 2 > SIZE || ph + GAP * 2 > SIZE) throw new Error(`Sprite ${key} is too big for the atlas`);
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

    // shelf pack, moving to a fresh page when this one is full
    if (this.shelfX + pw + GAP > SIZE) {
      this.shelfX = GAP;
      this.shelfY += this.shelfH + GAP;
      this.shelfH = 0;
    }
    if (this.shelfY + ph + GAP > SIZE) {
      this.layer++;
      this.shelfX = this.shelfY = GAP;
      this.shelfH = 0;
      if (this.layer >= this.layers) this.grow();
    }
    const x = this.shelfX;
    const y = this.shelfY;
    this.shelfX += pw + GAP;
    this.shelfH = Math.max(this.shelfH, ph);

    const img = ctx.getImageData(0, 0, pw, ph);
    const mask = new Uint8Array(pw * ph);
    for (let i = 0; i < mask.length; i++) mask[i] = img.data[i * 4 + 3];

    this.device.queue.copyExternalImageToTexture(
      { source: this.canvas, origin: { x: 0, y: 0 } },
      { texture: this.texture, origin: { x, y, z: this.layer }, premultipliedAlpha: true },
      [pw, ph],
    );

    return {
      key,
      w: pw / SS,
      h: ph / SS,
      ax: def.ax,
      ay: def.ay,
      layer: this.layer,
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
