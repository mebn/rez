import { hash2 } from "../core/rng";
import type { MapData } from "../world/map-data";
import { MapBuilder } from "./builder";

/**
 * "Maple Lane": a suburban house with a garage, a corner store across the road and a
 * small park. Coordinates: x runs east (down-right on screen), y runs south (down-left).
 */
export function buildStarterMap(): MapData {
  const W = 48;
  const H = 46;
  const b = new MapBuilder("Maple Lane", W, H, 1993);

  // --- ground -------------------------------------------------------------
  b.floor(0, 0, W, H, "grass");
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (hash2(x, y, 5) % 23 === 0) b.setFloor(x, y, "dirt");

  // road with sidewalks
  b.floor(0, 28, W, 30, "sidewalk");
  b.floor(0, 30, W, 34, "asphalt");
  b.floor(0, 32, W, 33, "road_line");
  b.floor(0, 34, W, 36, "sidewalk");

  // park path
  b.floor(39, 2, 41, 28, "dirt");

  // --- house --------------------------------------------------------------
  b.room(6, 8, 12, 14, { floor: "kitchen_tile", wall: "kitchen" });
  b.room(12, 8, 20, 15, { floor: "wood_floor", wall: "wallpaper" });
  b.room(6, 14, 12, 22, { floor: "carpet", wall: "wallpaper" });
  b.room(12, 15, 16, 22, { floor: "bathroom_tile", wall: "bathroom" });
  b.room(16, 15, 20, 22, { floor: "wood_floor", wall: "wallpaper" });

  b.door(12, 11, "W"); // kitchen <-> living
  b.door(9, 14, "N"); // kitchen <-> bedroom
  b.door(13, 15, "N"); // living <-> bathroom
  b.door(18, 15, "N"); // living <-> study
  b.door(20, 11, "W", "door_wood"); // front door
  b.door(8, 8, "N", "door_glass"); // back door

  for (const [x, y] of [[10, 8], [14, 8], [17, 8]]) b.window(x, y, "N");
  for (const [x, y] of [[8, 22], [10, 22], [14, 22], [18, 22]]) b.window(x, y, "N");
  for (const [x, y] of [[6, 11], [6, 18]]) b.window(x, y, "W");
  for (const [x, y] of [[20, 13], [20, 18]]) b.window(x, y, "W");

  // kitchen
  b.place("fridge", 6, 8, "S");
  b.place("kitchen_counter", 7, 8, "S");
  b.place("kitchen_counter", 9, 8, "S");
  b.place("kitchen_sink", 10, 8, "S");
  b.place("kitchen_counter", 11, 8, "S");
  b.place("stove", 6, 10, "E");
  b.place("kitchen_counter", 6, 12, "E");
  b.place("kitchen_counter", 6, 13, "E");
  b.place("kitchen_table", 9, 11);
  b.place("chair", 8, 11, "E");
  b.place("chair", 10, 11, "W");
  b.place("chair", 9, 12, "N");
  b.place("trash_can", 11, 13);

  // living room
  b.place("bookshelf", 12, 8, "S");
  b.place("floor_lamp", 13, 8);
  b.place("sofa", 14, 8, "S");
  b.place("armchair", 17, 9, "S");
  b.place("rug", 14, 10);
  b.place("coffee_table", 14, 10);
  b.place("tv", 14, 14, "N");
  b.place("bookshelf", 19, 8, "S");

  // bedroom
  b.place("nightstand", 6, 15, "E");
  b.place("bed", 6, 16, "E");
  b.place("wardrobe", 10, 14, "S");
  b.place("dresser", 6, 20, "E");

  // bathroom
  b.place("vanity", 15, 15, "S");
  b.place("toilet", 12, 16, "E");
  b.place("bathtub", 12, 19, "E");

  // study / second bedroom
  b.place("nightstand", 16, 15, "E");
  b.place("bed", 16, 16, "E");
  b.place("wardrobe", 19, 15, "S");
  b.place("dresser", 16, 19, "E");
  b.place("crate", 19, 21);

  // porch path from the front door to the driveway
  b.floor(20, 11, 23, 12, "concrete");

  // --- garage -------------------------------------------------------------
  b.room(23, 8, 30, 16, { floor: "concrete", wall: "block" });
  for (const x of [25, 26, 27]) b.open(x, 16, "N");
  b.door(23, 11, "W");
  b.window(30, 11, "W");
  b.place("metal_shelf", 23, 8, "S");
  b.place("workbench", 24, 8, "S");
  b.place("metal_shelf", 26, 8, "S");
  b.place("toolbox", 27, 9);
  b.place("crate", 29, 8);
  b.place("crate", 29, 9);
  b.place("car_sedan_red", 25, 11, "S");

  // driveway, bins, mailbox
  b.floor(25, 16, 28, 28, "concrete");
  b.place("trash_can", 28, 16);
  b.place("trash_can", 29, 16);
  b.place("mailbox", 24, 27);

  // --- yards --------------------------------------------------------------
  b.fence(3, 3, 31, 27, "fence_picket", "NW", [[3, 20, "W"]]);
  b.floor(5, 4, 7, 7, "dirt");
  b.place("woodpile", 5, 5);
  b.place("picnic_table", 9, 5, "S");
  b.place("berry_bush", 13, 4);
  b.place("berry_bush", 14, 4);
  b.place("tree_oak", 18, 5);
  b.place("tree_pine", 27, 4);
  b.place("tree_oak", 4, 24);
  b.place("tree_oak", 15, 25);
  for (const x of [7, 11, 17]) b.place("bush", x, 23);
  b.place("bush", 21, 15);
  b.place("bush", 21, 19);

  // --- street -------------------------------------------------------------
  b.place("car_sedan", 33, 30, "E");

  // --- corner store -------------------------------------------------------
  b.room(8, 37, 22, 44, { floor: "linoleum", wall: "store", exterior: "brick" });
  b.door(14, 37, "N", "door_glass");
  b.door(15, 37, "N", "door_glass");
  for (const x of [10, 12, 18, 20]) b.window(x, 37, "N");
  b.floor(14, 36, 16, 37, "sidewalk");
  for (const y of [38, 39, 40, 41]) b.place("drinks_cooler", 8, y, "E");
  b.place("store_shelf", 11, 39, "S");
  b.place("store_shelf", 11, 42, "S");
  b.place("store_shelf", 14, 40, "S");
  b.place("store_shelf", 17, 40, "S");
  b.place("store_shelf", 17, 42, "S");
  b.place("checkout_counter", 18, 37, "S");
  b.place("crate", 21, 43);
  b.place("crate", 20, 43);
  b.place("dumpster", 23, 40, "E");
  b.place("trash_can", 13, 36);

  // --- park ---------------------------------------------------------------
  b.place("tree_oak", 34, 6);
  b.place("tree_oak", 43, 9);
  b.place("tree_oak", 44, 17);
  b.place("tree_oak", 35, 22);
  b.place("tree_pine", 33, 13);
  b.place("tree_pine", 45, 4);
  b.place("tree_pine", 42, 24);
  b.place("tree_pine", 31, 20);
  b.place("bush", 37, 8);
  b.place("berry_bush", 43, 20);
  b.place("bench", 36, 16, "E");
  b.place("picnic_table", 42, 13, "S");
  b.place("trash_can", 38, 18);

  // south of the store
  b.place("tree_oak", 4, 40);
  b.place("tree_pine", 28, 42);
  b.place("tree_oak", 34, 39);
  b.place("bush", 25, 37);

  return b.build({ x: 16, y: 11 });
}
