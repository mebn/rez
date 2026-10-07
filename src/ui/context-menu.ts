import { el } from "./dom";

export interface MenuOption {
  label: string;
  action?: () => void;
  disabled?: boolean;
}

export class ContextMenu {
  private node: HTMLDivElement;

  constructor(root: HTMLElement) {
    this.node = el("div", "context-menu", root);
    this.node.hidden = true;
    window.addEventListener("mousedown", (e) => {
      if (!this.node.contains(e.target as Node)) this.hide();
    });
  }

  show(x: number, y: number, options: MenuOption[]): void {
    const n = this.node;
    n.innerHTML = "";
    for (const o of options) {
      const row = el("div", o.disabled ? "disabled" : undefined, n, o.label);
      row.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.hide();
        o.action?.();
      });
    }
    n.hidden = false;
    n.style.left = `${Math.min(window.innerWidth - n.offsetWidth - 4, x)}px`;
    n.style.top = `${Math.min(window.innerHeight - n.offsetHeight - 4, y)}px`;
  }

  hide(): void {
    this.node.hidden = true;
  }
}
