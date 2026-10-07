import type { Survivor } from "./survivor";

export type WoundKind = "scratch" | "laceration" | "bite";

export const BODY_PARTS = [
  "Head", "Neck", "Torso", "Left Arm", "Right Arm", "Left Hand", "Right Hand", "Left Leg", "Right Leg",
] as const;

export interface Wound {
  id: number;
  kind: WoundKind;
  part: (typeof BODY_PARTS)[number];
  bandaged: boolean;
  /** 0..1, wound is gone at 1. Only bandaged wounds (and scratches) heal. */
  healed: number;
}

/** Health lost per second while a wound is open. */
const BLEED: Record<WoundKind, number> = { scratch: 0.12, laceration: 0.3, bite: 0.45 };
/** Seconds to heal once bandaged. */
const HEAL_TIME: Record<WoundKind, number> = { scratch: 40, laceration: 90, bite: 150 };
const HIT_DAMAGE: Record<WoundKind, number> = { scratch: 4, laceration: 7, bite: 10 };
/** Chance a wound carries the infection. Bites always do. */
const INFECT: Record<WoundKind, number> = { scratch: 0.07, laceration: 0.25, bite: 1 };

export const WOUND_NAME: Record<WoundKind, string> = { scratch: "Scratch", laceration: "Laceration", bite: "Bite" };

/** Visible stages of the infection, by fraction of the survivor's infection time. */
const SYMPTOMS: [number, string][] = [
  [0.2, "Queasy"],
  [0.45, "Nauseous"],
  [0.7, "Feverish"],
  [0.9, "Dying"],
];

export class Health {
  hp = 100;
  wounds: Wound[] = [];
  /** Seconds since infection, or null if clean. */
  infection: number | null = null;
  private nextId = 1;

  constructor(private survivor: Survivor) {}

  get bleeding(): boolean {
    return this.wounds.some((w) => !w.bandaged && w.healed < 0.5);
  }

  /** 0..1 progress toward death, or null when not infected. */
  get infectionProgress(): number | null {
    return this.infection === null ? null : Math.min(1, this.infection / this.survivor.infectionTime);
  }

  /** The symptom you can feel right now, if any. */
  get symptom(): string | null {
    const p = this.infectionProgress;
    if (p === null) return null;
    let s: string | null = null;
    for (const [at, name] of SYMPTOMS) if (p >= at) s = name;
    return s;
  }

  /** A zombie got you. Returns the wound. */
  hit(): Wound {
    const sv = this.survivor;
    let r = Math.random();
    if (sv.has("thick_skinned")) r *= 0.75;
    if (sv.has("thin_skinned")) r = Math.min(0.999, r * 1.25);
    const kind: WoundKind = r < 0.55 ? "scratch" : r < 0.85 ? "laceration" : "bite";
    const w: Wound = {
      id: this.nextId++,
      kind,
      part: BODY_PARTS[Math.floor(Math.random() * BODY_PARTS.length)],
      bandaged: false,
      healed: 0,
    };
    this.wounds.push(w);
    this.hp -= HIT_DAMAGE[kind];
    if (this.infection === null && Math.random() < INFECT[kind]) this.infection = 0;
    return w;
  }

  /** Hurt by something other than a zombie: a fall, broken glass, a crash. Never infects. */
  injure(kind: WoundKind, damage: number, part?: Wound["part"]): Wound {
    const w: Wound = {
      id: this.nextId++,
      kind,
      part: part ?? BODY_PARTS[Math.floor(Math.random() * BODY_PARTS.length)],
      bandaged: false,
      healed: 0,
    };
    this.wounds.push(w);
    this.hp -= damage;
    return w;
  }

  /** A knock that bruises but doesn't break the skin. */
  bruise(damage: number): void {
    this.hp -= damage;
  }

  bandage(w: Wound, firstAid: number): void {
    w.bandaged = true;
    this.hp = Math.min(100, this.hp + 2 + firstAid);
  }

  update(dt: number, satiety: number): void {
    const sv = this.survivor;
    let healRate = 1 + sv.skills.firstAid * 0.15;
    if (sv.has("fast_healer")) healRate *= 2;
    if (sv.has("slow_healer")) healRate *= 0.5;

    let loss = 0;
    for (const w of this.wounds) {
      // scratches close on their own, everything else needs a bandage
      if (w.bandaged || w.kind === "scratch") w.healed += (dt / HEAL_TIME[w.kind]) * healRate * (w.bandaged ? 1 : 0.6);
      if (!w.bandaged && w.healed < 0.5) loss += BLEED[w.kind] * (1.15 - sv.attributes.resilience * 0.03);
    }
    this.wounds = this.wounds.filter((w) => w.healed < 1);

    if (satiety <= 0) loss += 0.4;
    const p = this.infectionProgress;
    if (this.infection !== null) {
      this.infection += dt;
      if (p! >= 0.7) loss += 0.25;
      // the end comes quickly once it's here
      if (p! >= 1) loss += 3;
    }
    const regen = loss === 0 && satiety > 30 && (p === null || p < 0.45) ? 0.15 + sv.attributes.fitness * 0.02 : 0;
    this.hp = Math.max(0, Math.min(100, this.hp - loss * dt + regen * dt));
  }
}
