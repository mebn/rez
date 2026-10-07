import type { Item } from "../items/types";

export class Inventory {
  items: Item[] = [];

  constructor(
    public label: string,
    public capacity: number,
  ) {}

  weight(): number {
    return this.items.reduce((s, i) => s + i.def.weight, 0);
  }

  canFit(item: Item): boolean {
    return this.weight() + item.def.weight <= this.capacity + 1e-6;
  }

  add(item: Item): boolean {
    if (!this.canFit(item)) return false;
    this.items.push(item);
    return true;
  }

  remove(item: Item): void {
    const i = this.items.indexOf(item);
    if (i >= 0) this.items.splice(i, 1);
  }

  /** Items grouped by type for display. */
  stacks(): Item[][] {
    const map = new Map<string, Item[]>();
    for (const it of this.items) {
      const k = it.def.unique ? `${it.def.id}#${it.uid}` : it.def.id;
      const arr = map.get(k);
      if (arr) arr.push(it);
      else map.set(k, [it]);
    }
    return [...map.values()];
  }
}
