import type { Facing, Side } from "../core/types";

/**
 * Serializable map format. Everything references components by id, so a world builder only
 * needs to read and write this structure.
 */
export interface MapData {
  version: 1;
  name: string;
  width: number;
  height: number;
  seed: number;
  /** Floor component ids; `tiles` indexes into this list (-1 = empty). */
  floorPalette: string[];
  tiles: number[];
  edges: EdgePlacement[];
  objects: ObjectPlacement[];
  vehicles?: VehiclePlacement[];
  spawn: { x: number; y: number };
}

export interface VehiclePlacement {
  type: string;
  /** Centre of the car in tiles. */
  x: number;
  y: number;
  /** Radians, 0 = +x (east), PI/2 = +y (south). */
  heading: number;
  paint?: string;
  condition?: number;
  /** Fraction of a full tank. */
  fuel?: number;
  /** Wheel conditions 0..100, or -1 for a missing wheel. */
  wheels?: number[];
}

export interface EdgePlacement {
  type: string;
  x: number;
  y: number;
  side: Side;
  state?: string;
}

export interface ObjectPlacement {
  type: string;
  x: number;
  y: number;
  facing?: Facing;
  state?: string;
  /** Explicit container contents. Omit to roll the component's loot table. */
  contents?: { item: string; count?: number }[];
}
