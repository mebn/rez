import type { ObjectComponent } from "../../core/types";
import { metalShelf } from "../furniture/metal-shelf";

/** Garage shelving stocked with car parts and tools. */
export const partsShelf: ObjectComponent = {
  ...metalShelf,
  id: "parts_shelf",
  name: "Parts Shelf",
  container: { capacity: 25, loot: "auto_parts" },
};
