import type { CharacterLook } from "../art/character";
import { registerLook } from "../engine/sprites";

/** Fixed for life: who this person is. 1..10. */
export interface Attributes {
  /** Melee damage and how much you can carry. */
  strength: number;
  /** Walking speed and natural healing. */
  fitness: number;
  /** Bleeding and how long the body holds out against infection. */
  resilience: number;
}

export type SkillId = "blunt" | "blade" | "firearms" | "firstAid" | "sneaking" | "mechanics" | "carpentry" | "athletics";

export const SKILLS: { id: SkillId; name: string; hint: string }[] = [
  { id: "blunt", name: "Blunt", hint: "Damage and swing speed with bats, pipes, hammers and fists." },
  { id: "blade", name: "Blade", hint: "Damage and swing speed with knives, machetes and axes." },
  { id: "firearms", name: "Firearms", hint: "Accuracy and range with guns." },
  { id: "firstAid", name: "First Aid", hint: "Bandaged wounds heal faster and bandaging restores more health." },
  { id: "sneaking", name: "Sneaking", hint: "Zombies notice you from shorter distances." },
  { id: "mechanics", name: "Mechanics", hint: "Car work (wheels, repairs, salvaging, hotwiring) goes faster and fails less." },
  { id: "carpentry", name: "Carpentry", hint: "Barricading, demolishing, taking things apart and felling trees." },
  { id: "athletics", name: "Athletics", hint: "Climbing over things without falling, and shoving heavy stuff around." },
];

/** Book names by the skill they teach, as shown in ItemDef.teaches. */
const SKILL_BY_NAME: Record<string, SkillId> = {
  Blunt: "blunt", Blade: "blade", Firearms: "firearms", "First Aid": "firstAid", Sneaking: "sneaking", Mechanics: "mechanics",
  Carpentry: "carpentry", Athletics: "athletics",
};
export function skillByName(name: string): SkillId | undefined {
  return SKILL_BY_NAME[name];
}

export const MAX_SKILL = 10;

export interface Trait {
  id: string;
  name: string;
  good: boolean;
  description: string;
  /** Mutually exclusive with these. */
  excludes?: string[];
}

export const TRAITS: Trait[] = [
  { id: "fast_healer", name: "Fast Healer", good: true, description: "Wounds close in half the time.", excludes: ["slow_healer"] },
  { id: "slow_healer", name: "Slow Healer", good: false, description: "Wounds take much longer to close.", excludes: ["fast_healer"] },
  { id: "thick_skinned", name: "Thick Skinned", good: true, description: "Zombie attacks are more likely to just scratch.", excludes: ["thin_skinned"] },
  { id: "thin_skinned", name: "Thin Skinned", good: false, description: "Zombie attacks tear deeper.", excludes: ["thick_skinned"] },
  { id: "light_footed", name: "Light-Footed", good: true, description: "Moves quietly.", excludes: ["clumsy"] },
  { id: "clumsy", name: "Clumsy", good: false, description: "Every step makes a racket.", excludes: ["light_footed"] },
  { id: "light_eater", name: "Light Eater", good: true, description: "Gets hungry slower.", excludes: ["hearty_appetite"] },
  { id: "hearty_appetite", name: "Hearty Appetite", good: false, description: "Gets hungry faster.", excludes: ["light_eater"] },
];

interface Occupation {
  name: string;
  skills: Partial<Record<SkillId, number>>;
  attributes?: Partial<Attributes>;
  traits?: string[];
}

const OCCUPATIONS: Occupation[] = [
  { name: "Unemployed", skills: {} },
  { name: "Police Officer", skills: { firearms: 3 }, attributes: { fitness: 1 } },
  { name: "Nurse", skills: { firstAid: 3, blade: 1 } },
  { name: "Carpenter", skills: { blunt: 2, carpentry: 4 }, attributes: { strength: 1 } },
  { name: "Construction Worker", skills: { blunt: 2, mechanics: 1, carpentry: 2 }, attributes: { strength: 2 } },
  { name: "Chef", skills: { blade: 3 } },
  { name: "Burglar", skills: { sneaking: 3, blade: 1, mechanics: 1, athletics: 2 } },
  { name: "Veteran", skills: { firearms: 2, blade: 1 }, attributes: { resilience: 1 } },
  { name: "Fitness Instructor", skills: { blunt: 1, athletics: 3 }, attributes: { fitness: 3 } },
  { name: "Firefighter", skills: { athletics: 2, carpentry: 1, blunt: 1 }, attributes: { strength: 1, fitness: 1 } },
  { name: "Park Ranger", skills: { sneaking: 2, firearms: 1 }, attributes: { fitness: 1 } },
  { name: "Doctor", skills: { firstAid: 4 } },
  { name: "Security Guard", skills: { blunt: 2 }, attributes: { resilience: 1 } },
  { name: "Mechanic", skills: { mechanics: 4, blunt: 1 } },
  { name: "Truck Driver", skills: { mechanics: 2 }, attributes: { strength: 1 } },
];

const FIRST = ["Alex", "Sam", "Jordan", "Casey", "Morgan", "Riley", "Jamie", "Taylor", "Robin", "Drew", "Avery", "Quinn", "Charlie", "Frankie", "Kim", "Lee"];
const LAST = ["Walker", "Hayes", "Moreno", "Kowalski", "Bennett", "Novak", "Brooks", "Reyes", "Fischer", "Okafor", "Lindqvist", "Doyle", "Park", "Mendez", "Carver", "Holt"];

const LOOKS: CharacterLook[] = [
  { skin: "#d9a786", hair: "#4a3324", shirt: "#6d7f8c", pants: "#3f4f68", shoes: "#2c2622", hairStyle: "short" },
  { skin: "#a8735a", hair: "#1e1714", shirt: "#8a4f3e", pants: "#4b4639", shoes: "#2a2420", hairStyle: "long" },
  { skin: "#e8c4a4", hair: "#c9a14a", shirt: "#4f6b4a", pants: "#3a3f4a", shoes: "#3a2c24", hairStyle: "short" },
  { skin: "#6e4a36", hair: "#151210", shirt: "#c9b27a", pants: "#2f3d55", shoes: "#1e1a18", hairStyle: "bald" },
];

/** Survivor looks are reused by index, so the sprite atlas only ever holds a handful. */
export function registerSurvivorLooks(): void {
  LOOKS.forEach((look, i) => {
    registerLook(`survivor${i}`, look);
    // what they look like after they turn
    registerLook(`survivor${i}z`, { ...look, skin: zombieSkin(look.skin), zombie: true });
  });
}

/** Dead skin in palette greys: lighter skin goes pale, darker skin goes slate. */
function zombieSkin(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255);
  return lum > 170 ? "#c0cbdc" : lum > 110 ? "#8b9bb4" : "#5a6988";
}

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return 40 * (level + 1);
}

export class Survivor {
  readonly name: string;
  readonly occupation: string;
  readonly traits: Trait[];
  readonly attributes: Attributes;
  readonly skills: Record<SkillId, number>;
  readonly xp: Record<SkillId, number> = { blunt: 0, blade: 0, firearms: 0, firstAid: 0, sneaking: 0, mechanics: 0, carpentry: 0, athletics: 0 };
  /** Skills this person has read up on. Knowledge belongs to the person, not the book. */
  readonly studied = new Set<SkillId>();
  readonly look: string;
  readonly zombieLook: string;
  /** Seconds from a bite to death. Every body holds out differently. */
  readonly infectionTime: number;

  constructor(index: number, rnd: () => number = Math.random) {
    const pick = <T>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
    const roll = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
    this.name = `${pick(FIRST)} ${pick(LAST)}`;
    const occ = pick(OCCUPATIONS);
    this.occupation = occ.name;

    const traits: Trait[] = [];
    const count = roll(1, 3);
    for (let i = 0; i < 20 && traits.length < count; i++) {
      const t = pick(TRAITS);
      if (traits.some((o) => o.id === t.id || t.excludes?.includes(o.id))) continue;
      traits.push(t);
    }
    this.traits = traits;

    const clamp = (v: number) => Math.max(1, Math.min(10, v));
    this.attributes = {
      strength: clamp(roll(3, 7) + (occ.attributes?.strength ?? 0)),
      fitness: clamp(roll(3, 7) + (occ.attributes?.fitness ?? 0)),
      resilience: clamp(roll(3, 7) + (occ.attributes?.resilience ?? 0)),
    };
    this.skills = { blunt: 0, blade: 0, firearms: 0, firstAid: 0, sneaking: 0, mechanics: 0, carpentry: 0, athletics: 0 };
    for (const [id, lvl] of Object.entries(occ.skills)) this.skills[id as SkillId] = lvl!;

    const li = index % LOOKS.length;
    this.look = `survivor${li}`;
    this.zombieLook = `survivor${li}z`;
    // 2.5 to 10 minutes, mostly decided by resilience plus plain luck
    this.infectionTime = 150 + this.attributes.resilience * 30 + rnd() * 150;
  }

  has(traitId: string): boolean {
    return this.traits.some((t) => t.id === traitId);
  }

  /** Add XP; returns the new level if the skill levelled up. Studied skills learn faster. */
  train(skill: SkillId, amount: number): number | null {
    if (this.skills[skill] >= MAX_SKILL) return null;
    this.xp[skill] += amount * (this.studied.has(skill) ? 1.5 : 1);
    const need = xpToNext(this.skills[skill]);
    if (this.xp[skill] < need) return null;
    this.xp[skill] -= need;
    this.skills[skill]++;
    return this.skills[skill];
  }

  /**
   * Odds and duration of a hands-on job. Anyone can try anything: a complete novice is slow
   * and fails a lot, experience and having read up on it shrink both.
   * `baseChance` is a novice's chance of success; `baseTime` is a novice's time in seconds.
   */
  task(skill: SkillId, baseChance: number, baseTime: number): { chance: number; time: number } {
    const lvl = this.skills[skill];
    const book = this.studied.has(skill);
    const miss = (1 - baseChance) * Math.pow(0.78, lvl) * (book ? 0.6 : 1);
    const time = baseTime * (1 - lvl * 0.06) * (book ? 0.75 : 1);
    return { chance: Math.min(0.99, 1 - miss), time };
  }

  /** Walking speed in tiles per second. */
  get speed(): number {
    return 3.0 + this.attributes.fitness * 0.08;
  }

  get carryCapacity(): number {
    return 12 + this.attributes.strength;
  }

  /** Multiplier on how far away zombies notice you. */
  get noticeFactor(): number {
    let f = 1 - this.skills.sneaking * 0.05;
    if (this.has("light_footed")) f *= 0.8;
    if (this.has("clumsy")) f *= 1.25;
    return f;
  }

  get hungerRate(): number {
    return this.has("light_eater") ? 0.035 : this.has("hearty_appetite") ? 0.07 : 0.05;
  }
}
