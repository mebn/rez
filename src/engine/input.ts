export interface InputHandlers {
  leftClick(x: number, y: number): void;
  rightDown(x: number, y: number): void;
  rightDrag(x: number, y: number): void;
  move(x: number, y: number): void;
  wheel(delta: number): void;
  key(code: string): void;
  keyUp(code: string): void;
}

/** Canvas mouse + keyboard wiring. Coordinates are CSS px relative to the canvas. */
export function bindInput(canvas: HTMLCanvasElement, h: InputHandlers): void {
  let rightHeld = false;
  let lastDrag = 0;
  const pos = (e: MouseEvent) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("mousedown", (e) => {
    const [x, y] = pos(e);
    if (e.button === 0) h.leftClick(x, y);
    if (e.button === 2) {
      rightHeld = true;
      h.rightDown(x, y);
    }
  });
  window.addEventListener("mouseup", (e) => {
    if (e.button === 2) rightHeld = false;
  });
  canvas.addEventListener("mousemove", (e) => {
    const [x, y] = pos(e);
    h.move(x, y);
    // holding right mouse keeps steering toward the cursor
    const now = performance.now();
    if (rightHeld && now - lastDrag > 120) {
      lastDrag = now;
      h.rightDrag(x, y);
    }
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      h.wheel(e.deltaY);
    },
    { passive: false },
  );
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.code === "Tab" || e.code === "Space") e.preventDefault();
    if (!e.repeat) h.key(e.code);
  });
  window.addEventListener("keyup", (e) => h.keyUp(e.code));
  window.addEventListener("blur", () => h.keyUp("*"));
}
