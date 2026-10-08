/**
 * What a character holds in their hands, modelled as a few rounded segments laid out along the
 * item's own axes: t runs from the grip (0) toward the business end, h runs across it (the side
 * a hammer's head or an axe's blade sticks out). The pose decides where those axes point.
 */

/** How it's held: one hand, or both. */
export type Grip = "one" | "two";
/** How it's used, which picks the attack animation. */
export type Swing = "swing" | "heavy" | "stab" | "pistol" | "rifle";

/** One rounded segment from (t0, h0) to (t1, h1), w px thick. */
export type Seg = [t0: number, h0: number, t1: number, h1: number, w: number, color: string];

export interface HeldModel {
  grip: Grip;
  swing: Swing;
  /** Where the second hand goes along t, for two-handed items. */
  second?: number;
  segs: Seg[];
}

const WOOD = "#9a7448";
const DARK_WOOD = "#6a4a30";
const STEEL = "#a9adb1";
const IRON = "#5c5f63";
const BLACK = "#26272a";

const MODELS: Record<string, HeldModel> = {
  baseball_bat: { grip: "two", swing: "heavy", second: 4, segs: [[-2, 0, 3, 0, 2.2, "#3a2c22"], [3, 0, 14, 0, 2.6, "#b48a5a"], [14, 0, 26, 0, 3.6, "#b48a5a"]] },
  spiked_bat: {
    grip: "two", swing: "heavy", second: 4,
    segs: [[-2, 0, 3, 0, 2.2, "#3a2c22"], [3, 0, 14, 0, 2.6, "#a8804f"], [14, 0, 26, 0, 3.6, "#a8804f"], [18, -3, 18, 3, 0.7, STEEL], [22, -3, 22, 3, 0.7, STEEL], [25, -2.6, 25, 2.6, 0.7, STEEL]],
  },
  golf_club: { grip: "two", swing: "heavy", second: 3, segs: [[-2, 0, 4, 0, 1.8, BLACK], [4, 0, 25, 0, 1, STEEL], [25, 0, 25, 3.2, 2.2, "#7a7e82"]] },
  lead_pipe: { grip: "one", swing: "swing", segs: [[-2, 0, 19, 0, 2.3, "#6e7276"]] },
  crowbar: { grip: "one", swing: "swing", segs: [[-2, 0, 19, 0, 1.8, "#8a2b22"], [19, 0, 21.5, 2.8, 1.8, "#8a2b22"], [-2, 0, -3.5, -1.2, 1.6, "#8a2b22"]] },
  tire_iron: { grip: "one", swing: "swing", segs: [[-2, 0, 15, 0, 1.6, "#4a4c50"], [15, 0, 15.5, 1.8, 2.8, "#4a4c50"]] },
  rolling_pin: { grip: "one", swing: "swing", segs: [[-2, 0, 1, 0, 1.6, "#a07850"], [1, 0, 13, 0, 3.8, "#c9a272"], [13, 0, 16, 0, 1.6, "#a07850"]] },
  hammer: { grip: "one", swing: "swing", segs: [[-2, 0, 11, 0, 1.9, "#8a6440"], [11, -3.2, 11, 3, 2.7, IRON], [11, -3.2, 10, -4.4, 1.4, IRON]] },
  pipe_wrench: { grip: "one", swing: "swing", segs: [[-2, 0, 13, 0, 2.3, "#b0402e"], [13, -1, 16.5, -1, 3.4, IRON], [16.5, -1, 16.5, 2.5, 2, IRON]] },
  frying_pan: { grip: "one", swing: "swing", segs: [[-2, 0, 7, 0, 1.8, BLACK], [9, 0, 15, 0, 9, "#34353a"], [10, -1.5, 13, -1.5, 3, "#45474d"]] },
  sledgehammer: { grip: "two", swing: "heavy", second: 6, segs: [[-2, 0, 26, 0, 2.1, WOOD], [26, -5, 26, 5, 5.2, "#4a4c50"]] },
  fire_axe: { grip: "two", swing: "heavy", second: 6, segs: [[-2, 0, 24, 0, 2.3, WOOD], [21.5, 0, 22.5, 6, 4.4, "#a3362a"], [20, 7, 25, 6.5, 1.3, "#d0d3d6"], [22.5, 0, 22.5, -2.5, 2.2, "#a3362a"]] },
  shovel: { grip: "two", swing: "heavy", second: 7, segs: [[-2, 0, 21, 0, 1.9, WOOD], [-3, -1.5, -3, 1.5, 1.4, BLACK], [22, 0, 29, 0, 6.2, "#6e7276"]] },
  garden_fork: {
    grip: "two", swing: "heavy", second: 7,
    segs: [[-2, 0, 21, 0, 1.9, WOOD], [21.5, -3, 21.5, 3, 1.5, IRON], [21.5, -2.6, 29, -2.6, 0.9, IRON], [21.5, 0, 29, 0, 0.9, IRON], [21.5, 2.6, 29, 2.6, 0.9, IRON]],
  },
  machete: { grip: "one", swing: "swing", segs: [[-2, 0, 3, 0, 2.1, "#2a2420"], [3, 0.3, 19, 0.8, 2.8, "#b8bcc0"]] },
  kitchen_knife: { grip: "one", swing: "stab", segs: [[-1.5, 0, 3, 0, 1.9, "#2a2420"], [3, 0, 10, -0.3, 1.6, "#cdd1d4"]] },
  butter_knife: { grip: "one", swing: "stab", segs: [[-1, 0, 3, 0, 1.4, "#bfc3c7"], [3, 0, 8, 0, 1.2, "#cdd1d4"]] },
  screwdriver: { grip: "one", swing: "stab", segs: [[-1.5, 0, 3, 0, 2.4, "#c9a43a"], [3, 0, 9, 0, 0.8, "#9a9ea2"]] },
  glass_shard: { grip: "one", swing: "stab", segs: [[0, 0, 4.5, 0.6, 2.2, "#b4d2d7"]] },
  broken_bottle: { grip: "one", swing: "stab", segs: [[-1, 0, 3, 0, 1.8, "#3c6a3a"], [3, 0, 8, 0, 3.6, "#4f7f4a"], [8, -1.5, 9.5, -0.5, 1, "#6f9f6a"], [8, 1.2, 10, 1.5, 0.9, "#6f9f6a"]] },
  sharp_stick: { grip: "two", swing: "stab", second: 6, segs: [[-4, 0, 18, 0, 1.6, "#8a6a44"], [18, 0, 21, 0, 0.8, "#c8a878"]] },
  pistol: { grip: "one", swing: "pistol", segs: [[0, 0, 0.6, -2.4, 1.9, BLACK], [-1, 1, 5, 1, 2.2, "#2c2d30"]] },
  revolver: { grip: "one", swing: "pistol", segs: [[0, 0, 0.8, -2.4, 1.9, "#5a3e2a"], [-0.5, 1.1, 6, 1.1, 1.6, "#3a3b3e"], [0.6, 1, 1.8, 1, 3, "#3a3b3e"]] },
  flare_gun: { grip: "one", swing: "pistol", segs: [[0, 0, 0.6, -2.4, 2, "#c8582a"], [-1, 1.2, 5, 1.2, 3, "#c8582a"]] },
  nail_gun: { grip: "one", swing: "pistol", segs: [[0, 0, 0.6, -2.4, 2.2, "#26272a"], [-2, 1.4, 6, 1.4, 3.4, "#d8a030"], [6, 1, 8, 1, 1.6, "#333"]] },
  shotgun: {
    grip: "two", swing: "rifle", second: 8,
    segs: [[-7, -0.8, 0, 0, 2.8, DARK_WOOD], [0, 0, 4, 0, 2.4, "#2a2b2e"], [4, 0.2, 20, 0.2, 1.6, "#2a2b2e"], [6.5, -0.6, 11, -0.6, 2.6, DARK_WOOD]],
  },
  hunting_rifle: {
    grip: "two", swing: "rifle", second: 9,
    segs: [[-7, -0.8, 2, 0, 2.8, "#7a5434"], [2, 0, 22, 0.2, 1.4, "#2a2b2e"], [3, 2.1, 9, 2.1, 1.8, "#1e1f21"], [2, -0.4, 13, -0.4, 2.2, "#7a5434"]],
  },
};

/** Anything else that ends up in the hands: a small lump. */
const FALLBACK: HeldModel = { grip: "one", swing: "swing", segs: [[0, 0, 3, 0, 3.2, "#8a8a80"]] };

export function heldModel(id: string): HeldModel | null {
  if (!id) return null;
  return MODELS[id] ?? FALLBACK;
}
