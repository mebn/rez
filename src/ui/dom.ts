export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  parent?: HTMLElement,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  parent?.appendChild(e);
  return e;
}

/** Drag a panel around by its title bar. */
export function makeDraggable(panel: HTMLElement, handle: HTMLElement): void {
  handle.addEventListener("mousedown", (e) => {
    if ((e.target as HTMLElement).tagName === "BUTTON") return;
    const sx = e.clientX - panel.offsetLeft;
    const sy = e.clientY - panel.offsetTop;
    const move = (ev: MouseEvent) => {
      panel.style.left = `${Math.max(0, Math.min(window.innerWidth - 60, ev.clientX - sx))}px`;
      panel.style.top = `${Math.max(0, Math.min(window.innerHeight - 30, ev.clientY - sy))}px`;
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  });
}
