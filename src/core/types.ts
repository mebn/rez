import type { Frame } from "../art/frame";
import type { Painter } from "../art/painter";

/** Direction an object's front faces. S = +y, E = +x, N = -y, W = -x. */
export type Facing = "S" | "E" | "N" | "W";
export const FACINGS: readonly Facing[] = ["S", "E", "N", "W"];

/** Edges live on the north or west border of a tile. */
export type Side = "N" | "W";

export type ComponentCategory =
  | "floor"
  | "wall"
  | "door"
  | "window"
  | "fence"
  | "kitchen"
  | "living"
  | "bedroom"
  | "bathroom"
  | "garage"
  | "store"
  | "outdoor"
  | "nature"
  | "vehicle";

export interface ContainerSpec {
  /** Max carried weight. */
  capacity: number;
  /** Loot table id used when the map doesn't specify explicit contents. */
  loot: string;
  /** Label for the loot panel, defaults to the component name. */
  label?: string;
}

/** Ground tile. One per tile. */
export interface FloorComponent {
  kind: "floor";
  id: string;
  name: string;
  category: "floor";
  /** Number of random visual variants. */
  variants: number;
  /** Draw in tile-plane coordinates: a 32x32 square that maps onto the diamond. */
  draw(ctx: CanvasRenderingContext2D, variant: number, seed: number): void;
}

/** Thin things on a tile border: walls, doors, windows, fences. */
export interface EdgeComponent {
  kind: "edge";
  id: string;
  name: string;
  category: ComponentCategory;
  /** Sprite height in px. */
  height: number;
  states: readonly string[];
  blocksMovement(state: string): boolean;
  /** Doors can be opened/closed by clicking and are auto-opened when walking through. */
  door?: boolean;
  /**
   * Draw using a frame where u runs 0..32 along the edge and v is the offset toward the
   * tile that owns the edge (the visible side). front = visible long face.
   */
  draw(f: Frame, state: string): void;
}

/** Anything placed on tiles: furniture, appliances, trees, cars. */
export interface ObjectComponent {
  kind: "object";
  id: string;
  name: string;
  category: ComponentCategory;
  /** [width along the front, depth] in tiles. Rotated automatically by facing. */
  size: [number, number];
  /** Sprite height in px (for atlas bounds). */
  height: number;
  /** Extra sprite padding in px, for art that overhangs the footprint (tree canopies). */
  pad?: number;
  solid: boolean;
  states?: readonly string[];
  /** Draw order inside a tile. 0.2 = flat on the floor (rugs), 2 = normal. */
  layer?: number;
  container?: ContainerSpec;
  /** Fade when the player walks behind it. Defaults to true for tall objects. */
  occludes?: boolean;
  draw(f: Frame, state: string, p: Painter): void;
}

export type WorldComponent = FloorComponent | EdgeComponent | ObjectComponent;
