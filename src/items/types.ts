export type ItemCategory = "food" | "weapon" | "firearm" | "ammo" | "medical" | "tool" | "part" | "key" | "book" | "material";

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  weight: number;
  description: string;
  /** Draw a 32x32 icon. */
  icon(ctx: CanvasRenderingContext2D): void;
  /** Food: how much hunger it removes (0-100). */
  nutrition?: number;
  /** Optional line shown when eaten. */
  eatMessage?: string;
  /** Weapons: rough damage rating and max condition. */
  damage?: number;
  durability?: number;
  /** Firearms: ammo item id. */
  ammo?: string;
  /** Never stacks with others of its kind (keys, wheels, gas cans all differ per item). */
  unique?: boolean;
  /** Books: the skill reading it teaches. */
  teaches?: string;
  /** Gas cans: litres it holds when full. */
  capacity?: number;
}

export interface Item {
  uid: number;
  def: ItemDef;
  /** 0..1 for weapons, undefined otherwise. */
  condition?: number;
  /** Ammo boxes: rounds left (full box until first used). */
  rounds?: number;
  /** Car keys: id of the vehicle it starts. */
  keyFor?: number;
  /** Display name override, e.g. "Car Key (Pickup)". */
  label?: string;
  /** Gas cans: litres inside. */
  fuel?: number;
}

export function itemName(item: Item): string {
  return item.label ?? item.def.name;
}
