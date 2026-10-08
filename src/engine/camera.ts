export class Camera {
  x = 0;
  y = 0;
  zoom = 2;
  readonly minZoom = 1;
  readonly maxZoom = 4;

  /** Viewport size in CSS px. */
  viewW = 1;
  viewH = 1;

  follow(tx: number, ty: number, dt: number): void {
    const k = 1 - Math.exp(-dt * 6);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
  }

  /** Smooth, multiplicative zoom so a wheel notch feels the same at every level. */
  wheel(delta: number): void {
    const z = this.zoom * Math.exp(-Math.max(-200, Math.min(200, delta)) * 0.0015);
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, z));
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
