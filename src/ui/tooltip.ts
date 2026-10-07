import type { Item } from "../items/types";
import { el } from "./dom";

const CATEGORY_LABEL: Record<string, string> = {
  food: "Food",
  weapon: "Weapon",
  firearm: "Firearm",
  ammo: "Ammo",
  medical: "Medical",
  tool: "Item",
};

export function categoryLabel(item: Item): string {
  return CATEGORY_LABEL[item.def.category] ?? item.def.category;
}

export class Tooltip {
  private node: HTMLDivElement;

  constructor(root: HTMLElement) {
    this.node = el("div", "tooltip", root);
    this.node.hidden = true;
  }

  show(item: Item, count: number, x: number, y: number): void {
    const d = item.def;
    const n = this.node;
    n.innerHTML = "";
    el("div", "t-name", n, count > 1 ? `${d.name} (${count})` : d.name);
    el("div", "t-desc", n, d.description);
    const stat = (label: string, value: string) => {
      const row = el("div", "t-stat", n);
      el("span", undefined, row, label);
      el("b", undefined, row, value);
    };
    stat("Type", categoryLabel(item));
    stat("Weight", d.weight.toFixed(1));
    if (d.nutrition !== undefined) stat("Hunger", d.nutrition > 0 ? `-${d.nutrition}` : "0");
    if (d.damage !== undefined) stat("Damage", d.damage.toFixed(1));
    if (item.condition !== undefined) stat("Condition", `${Math.round(item.condition * 100)}%`);
    if (d.ammo) stat("Ammo", d.ammo.replace(/_/g, " "));
    n.hidden = false;
    this.move(x, y);
  }

  move(x: number, y: number): void {
    const n = this.node;
    const w = n.offsetWidth;
    const h = n.offsetHeight;
    n.style.left = `${Math.min(window.innerWidth - w - 8, x + 16)}px`;
    n.style.top = `${Math.min(window.innerHeight - h - 8, y + 12)}px`;
  }

  hide(): void {
    this.node.hidden = true;
  }
}
