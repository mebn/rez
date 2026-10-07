export type ItemCategory = "food" | "weapon" | "firearm" | "ammo" | "medical" | "tool";

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
}

export interface Item {
  uid: number;
  def: ItemDef;
  /** 0..1 for weapons, undefined otherwise. */
  condition?: number;
}
