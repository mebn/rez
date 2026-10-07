import { el, makeDraggable } from "./dom";

/**
 * A draggable window whose body is rebuilt from HTML. Re-renders only when the content
 * changes, so buttons don't flicker under the mouse.
 */
export class InfoPanel {
  readonly node: HTMLDivElement;
  protected body: HTMLDivElement;
  private last = "";

  constructor(root: HTMLElement, title: string, x: number, y: number, width = 300) {
    const n = (this.node = el("div", "panel info-panel", root));
    n.style.left = `${x}px`;
    n.style.top = `${y}px`;
    n.style.width = `${width}px`;
    n.hidden = true;
    const bar = el("div", "panel-title", n);
    el("span", "grow", bar, title);
    const close = el("button", "close", bar, "×");
    close.addEventListener("click", () => this.hide());
    makeDraggable(n, bar);
    this.body = el("div", "info-body", n);
    n.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  get open(): boolean {
    return !this.node.hidden;
  }

  toggle(): void {
    this.node.hidden = !this.node.hidden;
    this.last = "";
  }

  hide(): void {
    this.node.hidden = true;
  }

  protected render(html: string): void {
    if (html === this.last) return;
    this.last = html;
    this.body.innerHTML = html;
  }
}

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** A row of 10 pips, filled up to `value`. */
export function pips(value: number, max = 10): string {
  let out = '<span class="pips">';
  for (let i = 0; i < max; i++) out += `<i class="${i < value ? "on" : ""}"></i>`;
  return out + "</span>";
}
