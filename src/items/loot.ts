import type { Rng } from "../core/rng";
import { createItem } from "./registry";
import type { Item } from "./types";

interface LootEntry {
  item: string;
  /** Relative chance per roll. */
  w: number;
  /** How many of this item to add when picked. */
  count?: [number, number];
}

interface LootTable {
  rolls: [number, number];
  entries: LootEntry[];
}

const e = (item: string, w: number, count?: [number, number]): LootEntry => ({ item, w, count });

/** Loot tables referenced by container components (ContainerSpec.loot). */
export const LOOT: Record<string, LootTable> = {
  fridge: { rolls: [3, 6], entries: [
    e("milk", 4), e("cheese", 4), e("eggs", 3), e("ham", 2), e("pizza", 3), e("yogurt", 4),
    e("soda", 4, [1, 3]), e("water", 3, [1, 2]), e("hot_sauce", 2), e("pickles", 2), e("apple", 3, [1, 3]), e("frozen_peas", 2),
  ] },
  kitchen: { rolls: [1, 3], entries: [
    e("canned_beans", 4, [1, 2]), e("canned_soup", 4), e("canned_tuna", 3), e("peanut_butter", 2), e("cereal", 3),
    e("bread", 2), e("crisps", 2), e("kitchen_knife", 3), e("butter_knife", 3), e("rolling_pin", 1), e("frying_pan", 2),
    e("lighter", 1), e("duct_tape", 1), e("dog_food", 1),
  ] },
  sink: { rolls: [0, 2], entries: [e("duct_tape", 2), e("broken_bottle", 1), e("pipe_wrench", 1), e("batteries", 1)] },
  oven: { rolls: [0, 1], entries: [e("frying_pan", 3), e("pizza", 1)] },
  sofa: { rolls: [0, 1], entries: [e("lighter", 2), e("batteries", 2), e("chocolate", 2), e("ammo_9mm", 0.3)] },
  tv_stand: { rolls: [0, 2], entries: [e("batteries", 3), e("flashlight", 2), e("crisps", 1)] },
  bookshelf: { rolls: [1, 2], entries: [
    e("chocolate", 1), e("painkillers", 1), e("pistol", 0.3), e("book_mechanics", 1), e("book_firstaid", 1),
    e("book_firearms", 0.7), e("book_blunt", 0.7), e("book_blade", 0.7), e("book_carpentry", 0.7), e("book_athletics", 0.7),
  ] },
  bed: { rolls: [0, 2], entries: [e("baseball_bat", 2), e("shotgun", 0.5), e("shells", 0.5), e("chocolate", 1), e("flashlight", 1)] },
  wardrobe: { rolls: [1, 2], entries: [
    e("baseball_bat", 2), e("golf_club", 2), e("flashlight", 2), e("shotgun", 0.6), e("shells", 0.8),
    e("hunting_rifle", 0.4), e("ammo_308", 0.4), e("duct_tape", 1),
  ] },
  nightstand: { rolls: [1, 2], entries: [
    e("revolver", 0.6), e("ammo_38", 0.8), e("painkillers", 2), e("chocolate", 2), e("lighter", 1), e("flashlight", 1), e("batteries", 1),
  ] },
  dresser: { rolls: [0, 2], entries: [e("batteries", 1), e("lighter", 1), e("painkillers", 1), e("pistol", 0.3), e("ammo_9mm", 0.4)] },
  toilet: { rolls: [0, 1], entries: [e("pistol", 1), e("ammo_9mm", 0.5)] },
  medicine: { rolls: [1, 3], entries: [e("painkillers", 3), e("bandage", 3, [1, 2]), e("toilet_paper", 2)] },
  workbench: { rolls: [2, 4], entries: [
    e("saw", 2), e("plank", 2, [1, 2]), e("book_carpentry", 0.5),
    e("screwdriver", 3), e("hammer", 3), e("crowbar", 1), e("lead_pipe", 1), e("nails", 2), e("flashlight", 1), e("duct_tape", 2), e("nail_gun", 0.6),
  ] },
  toolbox: { rolls: [2, 4], entries: [
    e("screwdriver", 4), e("hammer", 3), e("pipe_wrench", 2), e("nails", 3), e("duct_tape", 2), e("tire_iron", 1),
    e("wrench", 2), e("lug_wrench", 1),
  ] },
  garage_shelf: { rolls: [2, 4], entries: [
    e("plank", 2, [1, 3]), e("sledgehammer", 0.6), e("saw", 1), e("book_carpentry", 0.3),
    e("gas_can", 1.5), e("car_jack", 1), e("lug_wrench", 1), e("engine_parts", 0.8), e("book_mechanics", 0.4),
    e("shovel", 2), e("garden_fork", 2), e("fire_axe", 0.5), e("spiked_bat", 0.6), e("duct_tape", 2), e("batteries", 2),
    e("dog_food", 2), e("water", 2), e("lead_pipe", 1), e("nails", 1),
  ] },
  crate: { rolls: [2, 5], entries: [
    e("plank", 1.5, [1, 2]),
    e("canned_beans", 2), e("water", 2), e("crowbar", 1), e("machete", 0.6), e("shells", 0.6), e("bandage", 1), e("flare_gun", 0.4), e("flares", 0.5),
  ] },
  store_shelf: { rolls: [3, 7], entries: [
    e("canned_beans", 3), e("canned_soup", 3), e("canned_tuna", 3), e("sardines", 2), e("crisps", 3), e("chocolate", 3), e("cereal", 2),
    e("peanut_butter", 2), e("bread", 2), e("dog_food", 1), e("hot_sauce", 1), e("batteries", 1), e("lighter", 1), e("pickles", 1),
  ] },
  cooler: { rolls: [4, 8], entries: [e("soda", 5, [1, 3]), e("water", 4, [1, 2]), e("milk", 1)] },
  checkout: { rolls: [1, 3], entries: [
    e("chocolate", 3), e("lighter", 2), e("batteries", 2), e("pistol", 0.5), e("ammo_9mm", 0.6), e("baseball_bat", 0.5),
  ] },
  trash: { rolls: [0, 2], entries: [e("broken_bottle", 3), e("yogurt", 2), e("crisps", 1), e("sharp_stick", 1), e("pizza", 1)] },
  dumpster: { rolls: [1, 4], entries: [
    e("broken_bottle", 3), e("pizza", 2), e("yogurt", 2), e("sharp_stick", 2), e("lead_pipe", 1), e("machete", 0.3), e("dog_food", 1),
  ] },
  mailbox: { rolls: [0, 1], entries: [e("batteries", 1), e("chocolate", 1)] },
  woodpile: { rolls: [2, 4], entries: [e("sharp_stick", 1), e("plank", 3, [1, 3])] },
  car: { rolls: [1, 4], entries: [
    e("car_jack", 1.2), e("lug_wrench", 1.2), e("gas_can", 0.5),
    e("tire_iron", 3), e("flare_gun", 1), e("flares", 1), e("water", 2), e("crisps", 1), e("bandage", 1), e("shotgun", 0.4), e("shells", 0.6), e("golf_club", 1),
  ] },
  zombie: { rolls: [0, 2], entries: [
    e("lighter", 2), e("chocolate", 2), e("crisps", 1), e("batteries", 1), e("bandage", 1), e("painkillers", 1),
    e("screwdriver", 0.5), e("ammo_9mm", 0.3),
  ] },
  auto_parts: { rolls: [3, 6], entries: [
    e("engine_parts", 4, [1, 2]), e("wrench", 2), e("lug_wrench", 2), e("car_jack", 1.5), e("gas_can", 1.5),
    e("book_mechanics", 1), e("duct_tape", 1), e("screwdriver", 1), e("sledgehammer", 0.5),
  ] },
  tires: { rolls: [1, 1], entries: [e("car_wheel", 1, [2, 4])] },
  gas_station: { rolls: [2, 5], entries: [
    e("crisps", 3), e("chocolate", 3), e("soda", 3, [1, 2]), e("water", 2), e("gas_can", 1.5), e("lighter", 1),
    e("batteries", 1), e("book_mechanics", 0.4),
  ] },
  picnic: { rolls: [0, 1], entries: [e("soda", 1), e("crisps", 1)] },
  berry_bush: { rolls: [1, 1], entries: [e("berries", 1, [2, 5])] },
};

export function rollLoot(tableId: string, rng: Rng): Item[] {
  const table = LOOT[tableId];
  if (!table) return [];
  const total = table.entries.reduce((s, x) => s + x.w, 0);
  const out: Item[] = [];
  const rolls = rng.int(table.rolls[0], table.rolls[1]);
  for (let i = 0; i < rolls; i++) {
    let t = rng.next() * total;
    const entry = table.entries.find((x) => (t -= x.w) < 0) ?? table.entries[0];
    const n = entry.count ? rng.int(entry.count[0], entry.count[1]) : 1;
    for (let k = 0; k < n; k++) out.push(createItem(entry.item, entry.item ? rng.range(0.45, 1) : undefined));
  }
  return out;
}
