export class Camera {
  x = 0;
  y = 0;
  /** Whole-number zoom keeps pixel art crisp: every world pixel is an exact square on screen. */
  zoom = 2;
  readonly minZoom = 1;
  readonly maxZoom = 4;
  private wheelAcc = 0;

  /** Viewport size in CSS px. */
  viewW = 1;
  viewH = 1;

  follow(tx: number, ty: number, dt: number): void {
    const k = 1 - Math.exp(-dt * 6);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
  }

  /** Step zoom by whole levels. Wheel deltas are accumulated so trackpads don't skip levels. */
  wheel(delta: number): void {
    this.wheelAcc += delta;
    if (Math.abs(this.wheelAcc) < 100) return;
    const step = this.wheelAcc > 0 ? -1 : 1;
    this.wheelAcc = 0;
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom + step));
  }

  /** CSS px on screen -> world px. */
  toWorld(sx: number, sy: number): [number, number] {
    return [this.x + (sx - this.viewW / 2) / this.zoom, this.y + (sy - this.viewH / 2) / this.zoom];
  }

  /** World px -> CSS px on screen. */
  toScreen(wx: number, wy: number): [number, number] {
    return [(wx - this.x) * this.zoom + this.viewW / 2, (wy - this.y) * this.zoom + this.viewH / 2];
  }

  /** Visible world rect with a margin. */
  bounds(margin = 160): { x0: number; y0: number; x1: number; y1: number } {
    const hw = this.viewW / 2 / this.zoom + margin;
    const hh = this.viewH / 2 / this.zoom + margin;
    return { x0: this.x - hw, y0: this.y - hh, x1: this.x + hw, y1: this.y + hh };
  }
}
