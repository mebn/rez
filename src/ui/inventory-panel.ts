import { itemIcon } from "../items/registry";
import type { Item } from "../items/types";
import type { Inventory } from "../world/inventory";
import { el, makeDraggable } from "./dom";
import { categoryLabel, type Tooltip } from "./tooltip";

export interface PanelEvents {
  /** Left click on a stack. shift = whole stack. */
  click(stack: Item[], shift: boolean): void;
  /** Right click on a stack. */
  context(stack: Item[], x: number, y: number): void;
  close(): void;
  takeAll?(): void;
}

/** One Zomboid-style item list window (used for both the player and containers). */
export class InventoryPanel {
  readonly node: HTMLDivElement;
  private titleText: HTMLSpanElement;
  private titleIcon: HTMLImageElement;
  private list: HTMLDivElement;
  private weightText: HTMLSpanElement;
  private bar: HTMLDivElement;
  inventory: Inventory | null = null;
  equipped: Item | null = null;

  constructor(root: HTMLElement, private tooltip: Tooltip, private events: PanelEvents, x: number, y: number) {
    const n = (this.node = el("div", "panel", root));
    n.style.left = `${x}px`;
    n.style.top = `${y}px`;
    n.hidden = true;
    const title = el("div", "panel-title", n);
    this.titleIcon = el("img", undefined, title);
    this.titleText = el("span", "grow", title);
    const close = el("button", "close", title, "×");
    close.addEventListener("click", () => events.close());
    makeDraggable(n, title);

    if (events.takeAll) {
      const tb = el("div", "panel-toolbar", n);
      const btn = el("button", undefined, tb, "Loot all");
      btn.addEventListener("click", () => events.takeAll!());
    }

    const header = el("div", "inv-header", n);
    el("span", undefined, header, "");
    el("span", undefined, header, "Name");
    el("span", undefined, header, "Category");
    el("span", undefined, header, "Wt");
    this.list = el("div", "inv-list", n);
    const foot = el("div", "panel-footer", n);
    this.weightText = el("span", undefined, foot);
    const bar = el("div", "bar", foot);
    this.bar = el("div", undefined, bar);
    n.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  get open(): boolean {
    return !this.node.hidden;
  }

  show(inv: Inventory, title: string, icon?: string): void {
    this.inventory = inv;
    this.titleText.textContent = title;
    if (icon) {
      this.titleIcon.src = icon;
      this.titleIcon.hidden = false;
    } else this.titleIcon.hidden = true;
    this.node.hidden = false;
    this.refresh();
  }

  hide(): void {
    this.node.hidden = true;
    this.inventory = null;
    this.tooltip.hide();
  }

  refresh(): void {
    const inv = this.inventory;
    if (!inv) return;
    this.tooltip.hide();
    this.list.innerHTML = "";
    const stacks = inv.stacks().sort((a, b) => a[0].def.category.localeCompare(b[0].def.category) || a[0].def.name.localeCompare(b[0].def.name));
    if (!stacks.length) el("div", "inv-empty", this.list, "Empty");
    for (const stack of stacks) {
      const item = stack[0];
      const row = el("div", "inv-row", this.list);
      const img = el("img", undefined, row);
      img.src = itemIcon(item.def);
      const name = el("span", "name", row, stack.length > 1 ? `${item.def.name} (${stack.length})` : item.def.name);
      if (this.equipped && stack.includes(this.equipped)) el("span", "tag", name, "Equipped");
      el("span", "cat", row, categoryLabel(item));
      el("span", "w", row, (item.def.weight * stack.length).toFixed(1));
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.button === 0) this.events.click(stack, e.shiftKey);
        if (e.button === 2) this.events.context(stack, e.clientX, e.clientY);
      });
      row.addEventListener("mouseenter", (e) => this.tooltip.show(item, stack.length, e.clientX, e.clientY));
      row.addEventListener("mousemove", (e) => this.tooltip.move(e.clientX, e.clientY));
      row.addEventListener("mouseleave", () => this.tooltip.hide());
    }
    const w = inv.weight();
    this.weightText.textContent = `${w.toFixed(1)} / ${inv.capacity}`;
    this.bar.style.width = `${Math.min(100, (w / inv.capacity) * 100)}%`;
    this.bar.parentElement!.classList.toggle("full", w >= inv.capacity * 0.95);
  }
}
