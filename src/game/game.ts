import type { Atlas, Sprite } from "../engine/atlas";
import type { Camera } from "../engine/camera";
import { bindInput } from "../engine/input";
import type { Renderer } from "../engine/renderer";
import { barricadeKey, charKey, corpseKey, edgeKey, floorKey, MARKER_KEY, objectKey, vehicleKey } from "../engine/sprites";
import { isoX, isoY, screenToTile } from "../core/iso";
import { type Item, itemName } from "../items/types";
import { createItem } from "../items/registry";
import { rollLoot } from "../items/loot";
import { Rng } from "../core/rng";
import { findPath, nearestWalkable } from "../world/pathfinding";
import { type Interactable, type ObjectInstance, World } from "../world/world";
import { WALL_H } from "../components/structure/wall";
import type { Facing } from "../core/types";
import { Inventory } from "../world/inventory";
import { ContextMenu, type MenuOption } from "../ui/context-menu";
import { Hud } from "../ui/hud";
import { InventoryPanel } from "../ui/inventory-panel";
import { Tooltip } from "../ui/tooltip";
import { HealthPanel } from "../ui/health-panel";
import { SettingsPanel } from "../ui/settings-panel";
import { SkillsPanel } from "../ui/skills-panel";
import { type JobView, VehiclePanel } from "../ui/vehicle-panel";
import { type Obstacle, Vehicle, WHEEL_NAMES } from "./vehicles";
import type { EdgeInstance } from "../world/world";
import type { Wound } from "./health";
import type { Stance } from "../art/character";
import { Player } from "./player";
import { type Attributes, type SkillId, SKILLS, skillByName, Survivor, TRAITS } from "./survivor";
import { Zombie, ZombieDirector } from "./zombies";
import { loadItems, loadLevel, SAVE_KEY, saveItem, saveLevel, type SavedItem, type SavedLevel } from "./save";

import { type Host, interactionsFor, isBottle, type Target } from "./interactions";

/** A timed job in progress (repairs, reading, refuelling). Moving or getting hit cancels it. */
interface Action {
  label: string;
  time: number;
  elapsed: number;
  x: number;
  y: number;
  done: () => void;
}

/** Display names for tool and part item ids, for "Needs ..." hints. */
const TOOL_NAMES: Record<string, string> = {
  lug_wrench: "lug wrench", car_jack: "car jack", wrench: "ratchet wrench", screwdriver: "screwdriver",
  car_wheel: "a wheel", engine_parts: "engine parts", gas_can: "a gas can",
};

interface Drawable {
  key: number;
  sprite: Sprite;
  x: number;
  y: number;
  target?: Target;
  /** Object/edge whose fade value we animate when the player is behind it. */
  fader?: { fade: number };
  occludes: boolean;
  tint?: [number, number, number];
  /** Storey it stands on. */
  level: number;
}

/** Depth keys per storey are offset by this, so a storey draws entirely over the one below. */
const LEVEL_KEY = 100000;

const BLADES = new Set(["screwdriver", "butter_knife", "kitchen_knife", "sharp_stick", "broken_bottle", "machete", "fire_axe", "garden_fork"]);
/** How far a shot is heard, in tiles. */
const GUN_NOISE: Record<string, number> = { pistol: 28, revolver: 30, shotgun: 38, hunting_rifle: 42, nail_gun: 8, flare_gun: 30 };
/** Rounds in a fresh box of each ammo type. */
const BOX_ROUNDS: Record<string, number> = { ammo_9mm: 50, ammo_38: 24, ammo_308: 20, shells: 12, nails: 40, flares: 3 };
const BANDAGES = ["bandage", "toilet_paper"];
const INDOOR = new Set(["wood_floor", "carpet", "kitchen_tile", "bathroom_tile", "linoleum"]);

interface WeaponInfo {
  item: Item | null;
  skill: SkillId;
  ranged: boolean;
  damage: number;
  reach: number;
  cooldown: number;
  noise: number;
}
// palette INK (#181425)
const BG: [number, number, number] = [0.043, 0.047, 0.043];

export class Game {
  player: Player;
  readonly director: ZombieDirector;
  private survivors = 0;
  private engaged: Zombie | null = null;
  private engageRepath = 0;
  private attackCd = 0;
  private deathTimer: number | null = null;
  private lastZombieHit = -99;
  private time = 0;
  private bangSaid = -99;
  private sneakTick = 0;
  private panelTick = 0;
  readonly vehicles: Vehicle[] = [];
  /** The car the player is driving, if any. */
  private driving: Vehicle | null = null;
  private held = new Set<string>();
  private action: Action | null = null;
  private pumpFuel = new Map<number, number>();
  private openVehicle: Vehicle | null = null;
  private engineNoise = 0;
  private carSaid = -99;
  /** When the player was last hurt in a crash, for the cause of death. */
  private crashTime = -99;
  private ejected = false;
  private host: Host = this.makeHost();
  private drawables: Drawable[] = [];
  private mouse: { x: number; y: number } | null = null;
  private hovered: Target | null = null;
  private marker: { x: number; y: number; t: number } | null = null;
  private openContainer: ObjectInstance | null = null;

  /** Every storey, ground first. */
  readonly levels: World[];

  /** The storey the player is on. */
  get world(): World {
    return this.levels[this.player?.level ?? 0];
  }

  private hud: Hud;
  private tooltip: Tooltip;
  private menu: ContextMenu;
  private playerPanel: InventoryPanel;
  private lootPanel: InventoryPanel;
  private healthPanel: HealthPanel;
  private skillsPanel: SkillsPanel;
  private settingsPanel: SettingsPanel;
  private vehiclePanel: VehiclePanel;

  constructor(
    private renderer: Renderer,
    private atlas: Atlas,
    private camera: Camera,
    /** The ground storey: streets, cars and the dead all live here. */
    readonly ground: World,
    private canvas: HTMLCanvasElement,
    uiRoot: HTMLElement,
  ) {
    this.levels = [ground, ...(ground.data.levels ?? []).map((_, i) => new World(ground.data, i + 1))];
    this.player = new Player(ground.data.spawn, new Survivor(0));
    const [sx, sy] = this.playerScreen();
    camera.x = sx;
    camera.y = sy;

    this.director = new ZombieDirector(ground, {
      attack: (z) => this.zombieAttack(z),
      doorBang: (e) => this.doorBang(e),
      doorBroken: (e) => {
        if (this.near(e.x, e.y, 16)) this.hud.say("The door gave way!", 2200);
      },
      windowBroken: (e) => {
        if (this.near(e.x, e.y, 14)) this.hud.say("Glass breaking... something's getting in.", 2400);
      },
      hordeEnters: (from) => {
        if (!this.player.dead) this.hud.say(`I can hear a lot of them... off to the ${from}.`, 4000);
      },
    }, ground.data.spawn);

    this.tooltip = new Tooltip(uiRoot);
    this.menu = new ContextMenu(uiRoot);
    this.hud = new Hud(
      uiRoot,
      () => this.togglePlayerPanel(),
      () => this.equip(null),
      () => this.healthPanel.toggle(),
      () => this.skillsPanel.toggle(),
      () => this.settingsPanel.toggle(),
      () => this.respawn(),
      { engine: () => this.toggleEngine(), hotwire: () => this.driving && this.runJob(this.driving, "hotwire"), exit: () => this.exitVehicle() },
    );
    this.healthPanel = new HealthPanel(uiRoot, {
      bandage: (w) => this.bandage(w),
      painkillers: () => this.painkillers(),
      hasBandage: () => !!this.findItem(BANDAGES),
      hasPainkillers: () => !!this.findItem(["painkillers"]),
    });
    this.skillsPanel = new SkillsPanel(uiRoot);
    this.settingsPanel = new SettingsPanel(uiRoot, () => this.newGame());
    this.vehiclePanel = new VehiclePanel(uiRoot, {
      jobs: (v) => this.jobs(v),
      run: (v, id) => this.runJob(v, id),
      hasKey: (v) => this.hasKey(v),
    });
    this.spawnVehicles();
    this.playerPanel = new InventoryPanel(uiRoot, this.tooltip, {
      click: (stack, shift) => this.fromPlayer(stack, shift),
      context: (stack, x, y) => this.playerContext(stack, x, y),
      close: () => this.playerPanel.hide(),
    }, 20, 70);
    this.lootPanel = new InventoryPanel(uiRoot, this.tooltip, {
      click: (stack, shift) => this.fromContainer(stack, shift),
      context: (stack, x, y) => this.lootContext(stack, x, y),
      close: () => this.closeContainer(),
      takeAll: () => this.fromContainer(this.lootPanel.inventory?.items.slice() ?? [], true),
    }, 362, 70);

    this.hud.setEquipped(null);

    bindInput(canvas, {
      leftClick: (x, y) => this.onLeftClick(x, y),
      rightDown: (x, y, shift) => this.onRightClick(x, y, shift),
      rightDrag: (x, y) => this.moveTo(x, y, true),
      move: (x, y) => (this.mouse = { x, y }),
      wheel: (d) => this.camera.wheel(d),
      key: (code) => this.onKey(code),
      keyUp: (code) => (code === "*" ? this.held.clear() : this.held.delete(code)),
    });
    this.greet("Better see what's in this house.");
  }

  private greet(line: string): void {
    const sv = this.player.survivor;
    this.hud.say(`${sv.name}, ${sv.occupation.toLowerCase()}. ${line}`, 4200);
  }

  private near(tx: number, ty: number, r: number): boolean {
    const p = this.player;
    return !p.dead && Math.hypot(p.x - tx, p.y - ty) < r;
  }

  // --------------------------------------------------------------- input

  private onKey(code: string): void {
    this.held.add(code);
    if (code === "KeyI" || code === "Tab") this.togglePlayerPanel();
    if (code === "KeyH") this.healthPanel.toggle();
    if (code === "KeyE") {
      if (this.driving) this.exitVehicle();
      else this.enterNearest();
    }
    // while driving, WASD / arrows / space belong to the car
    if (!this.driving) {
      if (code === "KeyK") this.skillsPanel.toggle();
      if (code === "Space") this.attackNearest();
      if (code === "KeyC" && !this.player.dead) {
        this.player.cycleStance();
        this.hud.say(this.player.stance === "stand" ? "Standing." : this.player.stance === "crouch" ? "Crouching." : "Crawling.", 900);
      }
    }
    if (code === "Escape") {
      // Esc closes whatever is open; with nothing open it brings up settings
      const anyOpen =
        this.vehiclePanel.open || this.menu.open || !!this.openContainer || this.playerPanel.open ||
        this.healthPanel.open || this.skillsPanel.open || this.settingsPanel.open;
      if (!anyOpen) return this.settingsPanel.toggle();
      this.settingsPanel.hide();
      this.vehiclePanel.hide();
      this.menu.hide();
      this.closeContainer();
      this.playerPanel.hide();
      this.healthPanel.hide();
      this.skillsPanel.hide();
    }
  }

  /** WASD / arrows walk relative to the screen: W is up the screen, D to the right. */
  private steerKeys(): void {
    const h = this.held;
    const up = h.has("KeyW") || h.has("ArrowUp") ? 1 : 0;
    const down = h.has("KeyS") || h.has("ArrowDown") ? 1 : 0;
    const left = h.has("KeyA") || h.has("ArrowLeft") ? 1 : 0;
    const right = h.has("KeyD") || h.has("ArrowRight") ? 1 : 0;
    // screen (sx, sy) -> world tiles: x = sx/2 + sy, y = sy - sx/2 (iso is twice as wide)
    const sx = right - left;
    const sy = down - up;
    const p = this.player;
    if (!sx && !sy) {
      if (this.steering) p.steer(null);
      this.steering = false;
      return;
    }
    if (!this.steering) {
      // taking manual control drops whatever the mouse had queued
      this.engaged = null;
      this.marker = null;
      this.cancelAction();
    }
    this.steering = true;
    p.steer([sx + sy, sy - sx]);
  }
  private steering = false;

  private moveTo(sx: number, sy: number, quiet = false): void {
    this.menu.hide();
    if (this.player.dead || this.driving) return;
    this.engaged = null;
    this.cancelAction();
    const [wx, wy] = this.camera.toWorld(sx, sy);
    // clicks land on the floor of the storey you're on
    const t = screenToTile(wx, wy + this.player.level * WALL_H);
    const goal = nearestWalkable(this.world, Math.floor(t.x), Math.floor(t.y));
    if (!goal) return;
    const path = findPath(this.world, { x: this.player.tileX, y: this.player.tileY }, [goal]);
    if (!path) {
      if (!quiet) this.hud.say("I can't get there.", 1500);
      return;
    }
    this.player.walk(path);
    if (!quiet || !this.marker) this.marker = { x: goal.x, y: goal.y, t: 0 };
    else this.marker = { ...this.marker, x: goal.x, y: goal.y };
  }

  /** Left click does the obvious thing (attack, open, use a door); anything else gets the full menu. */
  private onLeftClick(sx: number, sy: number): void {
    this.menu.hide();
    if (this.player.dead || this.driving) return;
    const target = this.pick(sx, sy);
    if (!target) return;
    if (target.kind === "zombie") return this.engage(target.z);
    if (target.kind === "vehicle") return this.approachVehicle(target.v, () => this.enterVehicle(target.v));
    if (target.kind === "object" && target.obj.comp.id === "stairs_wood") return this.climbStairs(target.obj);
    if (target.kind === "object" && target.obj.comp.container && target.obj.comp.id !== "gas_pump") return this.approach(target);
    if (target.kind === "edge" && target.edge.comp.door && !target.edge.barricade && !target.edge.broken) return this.approach(target);
    if (target.kind === "edge" && target.edge.comp.category === "window" && !target.edge.barricade && (target.edge.state === "default" || target.edge.state === "raised"))
      return this.runInteraction(target, "window");
    this.interactionMenu(target, sx, sy);
  }

  /**
   * Right click on a thing opens its menu; on the ground (or a plain wall or fence) it walks.
   * With Shift held you're running, so it always just moves.
   */
  private onRightClick(sx: number, sy: number, shift: boolean): void {
    const target = shift || this.player.dead || this.driving ? null : this.pick(sx, sy);
    const plain = target?.kind === "edge" && (target.edge.comp.category === "wall" || target.edge.comp.category === "fence");
    if (target && target.kind !== "zombie" && !plain) {
      this.menu.hide();
      this.interactionMenu(target, sx, sy);
    } else this.moveTo(sx, sy);
  }

  /** Everything that can be done to a thing, with odds and what's missing. */
  private interactionMenu(target: Target, sx: number, sy: number): void {
    const opts: MenuOption[] = [];
    if (target.kind === "vehicle") opts.push(...this.vehicleOptions(target.v));
    if (target.kind === "object" && target.obj.comp.id === "gas_pump") opts.push(...this.pumpOptions(target.obj));
    if (target.kind === "object" && target.obj.comp.id === "stairs_wood") opts.push({ label: "Go upstairs", action: () => this.climbStairs(target.obj) });
    for (const ia of interactionsFor(this.host, target)) {
      const odds = ia.time === 0 ? "" : ia.chance === null ? ` (${Math.round(ia.time)}s)` : ` (${Math.round(ia.chance * 100)}% · ${Math.round(ia.time)}s)`;
      opts.push(
        ia.needs.length
          ? { label: `${ia.label}: needs ${ia.needs.join(", ")}`, disabled: true }
          : { label: ia.label + odds, action: () => this.runInteraction(target, ia.id) },
      );
    }
    if (!opts.length) opts.push({ label: "Nothing to do", disabled: true });
    this.menu.show(sx, sy, opts);
  }

  /** Walk over, then do it: instantly, or as a timed job with a roll at the end. */
  private runInteraction(target: Target, id: string): void {
    const go = () => {
      const ia = interactionsFor(this.host, target).find((x) => x.id === id);
      if (!ia) return;
      if (ia.needs.length) return this.hud.say(`I need ${ia.needs.join(", ")}.`, 1800);
      const finish = () => {
        const ok = ia.chance === null || Math.random() < ia.chance;
        ia.run(ok);
        if (ia.noise) this.director.noise(this.player.x, this.player.y, ia.noise);
        if (ia.skill) this.train(ia.skill, ok ? 12 : 5);
        this.refreshPanels();
      };
      if (ia.time === 0) finish();
      else this.startAction(ia.label.replace(/ \(.*\)$/, ""), ia.time, finish);
    };
    if (target.kind === "vehicle") this.approachVehicle(target.v, go);
    else if (target.kind === "edge" || target.kind === "object") this.approach(target, go);
  }

  private makeHost(): Host {
    const g = this;
    return {
      get world() {
        return g.world;
      },
      get player() {
        return g.player;
      },
      say: (t, ms) => this.hud.say(t, ms),
      hurt: () => this.hud.hurt(),
      hasItem: (id) => this.hasItem(id),
      takeItem: (id) => {
        const it = this.player.inventory.items.find((i) => i.def.id === id);
        if (it) {
          this.player.inventory.remove(it);
          if (this.player.equipped === it) this.player.equipped = null;
        }
        return it;
      },
      takeRounds: (id, n) => {
        const box = this.player.inventory.items.find((i) => i.def.id === id);
        if (!box) return false;
        const left = box.rounds ?? BOX_ROUNDS[id] ?? 10;
        if (left < n) return false;
        box.rounds = left - n;
        if (box.rounds <= 0) this.player.inventory.remove(box);
        return true;
      },
      give: (items) => {
        const spill = items.filter((it) => !this.player.inventory.add(it));
        if (spill.length) this.dropItems(this.player.tileX, this.player.tileY, spill);
      },
      dropItems: (x, y, items) => this.dropItems(x, y, items),
      open: (o) => this.use({ kind: "object", obj: o }),
      toggleDoor: (e) => this.use({ kind: "edge", edge: e }),
      sit: (o) => this.sit(o),
    };
  }

  // --------------------------------------------------------- interaction

  /** Walk next to the thing (if needed), then use it. */
  private approach(target: Interactable, then?: () => void): void {
    const act = then ?? (() => this.use(target));
    this.engaged = null;
    this.cancelAction();
    const tiles = this.world.interactTiles(target);
    if (!tiles.length) {
      this.hud.say("I can't reach that from here.", 1600);
      return;
    }
    const p = this.player;
    const here = tiles.some((t) => t.x === p.tileX && t.y === p.tileY);
    if (here) {
      p.stop();
      // snap to tile centre so the character doesn't use things through walls mid-step
      p.walk([{ x: p.tileX, y: p.tileY }], act);
      return;
    }
    const path = findPath(this.world, { x: p.tileX, y: p.tileY }, tiles);
    if (!path) {
      this.hud.say("I can't get there.", 1500);
      return;
    }
    this.marker = null;
    p.walk(path, act);
  }

  private use(target: Interactable): void {
    const p = this.player;
    if (target.kind === "edge") {
      const e = target.edge;
      p.face(e.side === "N" ? e.x + 0.5 : e.x, e.side === "N" ? e.y : e.y + 0.5);
      if (e.broken) this.hud.say("It's been smashed off its hinges.", 1800);
      else if (e.comp.door) e.state = e.state === "open" ? "closed" : "open";
      return;
    }
    const o = target.obj;
    p.face(o.x + o.wx / 2, o.y + o.wy / 2);
    const inv = this.world.containerOf(o);
    if (!inv) return;
    this.openContainer = o;
    this.lootPanel.show(inv, inv.label);
    if (!this.playerPanel.open) this.showPlayerPanel();
  }

  private closeContainer(): void {
    // an emptied pile of stuff on the ground goes away
    const o = this.openContainer;
    if (o?.comp.id === "item_pile" && !o.inventory?.items.length) this.world.removeObject(o);
    this.openContainer = null;
    this.openVehicle = null;
    this.lootPanel.hide();
  }

  private togglePlayerPanel(): void {
    if (this.playerPanel.open) this.playerPanel.hide();
    else this.showPlayerPanel();
  }

  private showPlayerPanel(): void {
    this.playerPanel.equipped = this.player.equipped;
    this.playerPanel.show(this.player.inventory, "Inventory");
  }

  private refreshPanels(): void {
    this.playerPanel.equipped = this.player.equipped;
    this.playerPanel.refresh();
    this.lootPanel.refresh();
    this.hud.setEquipped(this.player.equipped);
  }

  private transfer(items: Item[], from: Inventory, to: Inventory): number {
    let moved = 0;
    for (const it of items) {
      if (!to.canFit(it)) break;
      from.remove(it);
      to.add(it);
      moved++;
      if (it === this.player.equipped && to !== this.player.inventory) this.player.equipped = null;
    }
    return moved;
  }

  private fromContainer(stack: Item[], all: boolean): void {
    const inv = this.lootPanel.inventory;
    if (!inv || !stack.length) return;
    const items = all ? stack.slice() : [stack[0]];
    if (this.transfer(items, inv, this.player.inventory) < items.length) this.hud.say("I can't carry any more.", 1800);
    this.refreshPanels();
  }

  private fromPlayer(stack: Item[], all: boolean): void {
    const inv = this.lootPanel.inventory;
    if (!inv) return;
    const items = all ? stack.slice() : [stack[0]];
    if (this.transfer(items, this.player.inventory, inv) < items.length) this.hud.say("It won't fit in there.", 1800);
    this.refreshPanels();
  }

  private eat(item: Item, from: Inventory): void {
    const p = this.player;
    from.remove(item);
    p.satiety = Math.min(100, p.satiety + (item.def.nutrition ?? 0));
    this.hud.say(item.def.eatMessage ?? (p.satiety >= 95 ? "Stuffed." : `Ate the ${item.def.name.toLowerCase()}.`));
    this.refreshPanels();
  }

  private equip(item: Item | null): void {
    this.player.equipped = item;
    if (item) this.hud.say(`Equipped ${item.def.name}.`, 1500);
    this.refreshPanels();
  }

  private isWeapon(item: Item): boolean {
    return item.def.category === "weapon" || item.def.category === "firearm";
  }

  private playerContext(stack: Item[], x: number, y: number): void {
    const item = stack[0];
    const inv = this.player.inventory;
    const opts: MenuOption[] = [];
    if (item.def.category === "food") opts.push({ label: item.def.nutrition ? "Eat" : "Drink", action: () => this.eat(item, inv) });
    if (BANDAGES.includes(item.def.id)) {
      const w = this.worstWound();
      opts.push(w ? { label: "Bandage wound", action: () => this.bandage(w) } : { label: "Bandage wound", disabled: true });
    }
    if (item.def.id === "painkillers") opts.push({ label: "Take", action: () => this.painkillers() });
    if (item.def.teaches) opts.push({ label: "Read", action: () => this.read(item) });
    if (isBottle(item))
      opts.push({
        label: "Smash into a weapon",
        action: () => {
          inv.remove(item);
          inv.add(createItem("broken_bottle", 1));
          this.director.noise(this.player.x, this.player.y, 5);
          this.hud.say("Smashed it. Nasty edge on that.", 1800);
          this.refreshPanels();
        },
      });
    if (this.isWeapon(item)) {
      const eq = stack.find((s) => s === this.player.equipped);
      if (eq) opts.push({ label: "Unequip", action: () => this.equip(null) });
      else opts.push({ label: "Equip Primary", action: () => this.equip(item) });
    }
    if (this.lootPanel.inventory) {
      const label = this.lootPanel.inventory.label;
      opts.push({ label: `Put in ${label}`, action: () => this.fromPlayer(stack, false) });
      if (stack.length > 1) opts.push({ label: `Put all in ${label}`, action: () => this.fromPlayer(stack, true) });
    }
    if (!opts.length) opts.push({ label: "Nothing to do", disabled: true });
    this.menu.show(x, y, opts);
  }

  private lootContext(stack: Item[], x: number, y: number): void {
    const item = stack[0];
    const inv = this.lootPanel.inventory!;
    const opts: MenuOption[] = [{ label: "Grab", action: () => this.fromContainer(stack, false) }];
    if (stack.length > 1) opts.push({ label: `Grab all (${stack.length})`, action: () => this.fromContainer(stack, true) });
    if (item.def.category === "food") opts.push({ label: item.def.nutrition ? "Eat" : "Drink", action: () => this.eat(item, inv) });
    if (this.isWeapon(item))
      opts.push({
        label: "Equip Primary",
        action: () => {
          if (this.transfer([item], inv, this.player.inventory)) this.equip(item);
          else this.hud.say("I can't carry any more.", 1800);
        },
      });
    this.menu.show(x, y, opts);
  }

  // ------------------------------------------------------------- picking

  private pick(sx: number, sy: number): Target | null {
    const [wx, wy] = this.camera.toWorld(sx, sy);
    for (let i = this.drawables.length - 1; i >= 0; i--) {
      const d = this.drawables[i];
      if (!d.target || d.level !== this.player.level || (d.fader && d.fader.fade < 0.6)) continue;
      if (this.atlas.hit(d.sprite, wx - (d.x - d.sprite.ax), wy - (d.y - d.sprite.ay))) return d.target;
    }
    // a window or door faded out because you're standing right at it is still usable
    for (let i = this.drawables.length - 1; i >= 0; i--) {
      const d = this.drawables[i];
      const t = d.target;
      if (t?.kind !== "edge" || d.level !== this.player.level || !(t.edge.comp.door || t.edge.comp.category === "window")) continue;
      if (this.atlas.hit(d.sprite, wx - (d.x - d.sprite.ax), wy - (d.y - d.sprite.ay))) return t;
    }
    return null;
  }

  private targetName(t: Target): string {
    if (t.kind === "vehicle") return t.v.name;
    if (t.kind === "zombie") return t.z.label === "Zombie" ? "Zombie" : `${t.z.label} (turned)`;
    if (t.kind === "edge") {
      const e = t.edge;
      const notes = [
        e.broken && "broken",
        e.comp.category === "window" && e.state === "broken" && "smashed",
        e.comp.category === "window" && e.state === "open" && "no glass",
        e.comp.category === "window" && e.state === "raised" && "open",
        e.barricade && `barricaded ${e.barricade}/4`,
      ].filter(Boolean);
      return notes.length ? `${e.comp.name} (${notes.join(", ")})` : e.comp.name;
    }
    return t.obj.comp.container?.label && t.obj.comp.container.label !== t.obj.comp.name
      ? `${t.obj.comp.name} — ${t.obj.comp.container.label}`
      : t.obj.comp.name;
  }

  // ---------------------------------------------------------- simulation

  private playerScreen(): [number, number] {
    const p = this.player;
    const lift = this.driving ? 0 : p.level * WALL_H + this.stairLift();
    const [x, y] = p.seat ? [p.seat.x, p.seat.y] : [p.x, p.y];
    return [isoX(x, y), isoY(x, y, lift)];
  }

  update(dt: number): void {
    this.time += dt;
    this.saveTick -= dt;
    if (this.saveTick <= 0) {
      this.saveTick = 15;
      this.save();
    }
    const p = this.player;
    if (this.driving) this.drive(dt);
    p.wantsSprint = !this.driving && (this.held.has("ShiftLeft") || this.held.has("ShiftRight"));
    if (!this.driving && !p.dead) this.steerKeys();
    const from = { x: p.tileX, y: p.tileY };
    p.update(dt, this.world);
    if (!p.dead && !this.driving && (p.tileX !== from.x || p.tileY !== from.y)) {
      this.takeStairs(from);
      this.stepOnGlass();
    }
    if (!p.dead && !this.driving) this.checkFall();
    this.updateVehicles(dt);
    this.director.update(dt, { x: p.x, y: p.y, alive: !p.dead && p.level === 0, noticeFactor: p.noticeFactor, radius: this.driving ? 1 : 0 });
    this.updateAction(dt);
    if (!p.dead && p.health.hp <= 0) this.die();
    if (!p.dead) this.updateCombat(dt);
    if (this.deathTimer !== null) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) {
        this.deathTimer = null;
        this.showDeath();
      }
    }
    const [px, py] = this.playerScreen();
    this.camera.follow(px, py - 30, dt);
    if (this.marker) {
      this.marker.t += dt;
      if (!p.moving && this.marker.t > 0.3) this.marker = null;
    }

    if (this.openVehicle && Math.hypot(p.x - this.openVehicle.x, p.y - this.openVehicle.y) > this.openVehicle.type.shape.length / 2 + 1.8)
      this.closeContainer();
    // walked away from the open container
    if (this.openContainer && !p.moving) {
      const near = this.world.interactTiles({ kind: "object", obj: this.openContainer }).some((t) => t.x === p.tileX && t.y === p.tileY);
      if (!near) this.closeContainer();
    } else if (this.openContainer && p.moving) {
      const o = this.openContainer;
      const d = Math.max(Math.abs(p.x - (o.x + o.wx / 2)) - o.wx / 2, Math.abs(p.y - (o.y + o.wy / 2)) - o.wy / 2);
      if (d > 1.6) this.closeContainer();
    }

    this.hud.setVitals(p.survivor.name, p.dead ? 0 : p.health.hp, p.dead ? 0 : p.stamina);
    this.hud.setMoodles(p.dead ? [] : this.moodles());
    this.panelTick -= dt;
    if (this.panelTick <= 0) {
      this.panelTick = 0.25;
      this.healthPanel.refresh(p);
      this.skillsPanel.refresh(p);
      this.vehiclePanel.refresh();
    }
    const [hx, hy] = this.camera.toScreen(px, py - 70);
    this.hud.placeHalo(hx, hy);

    this.buildDrawables(dt);
    this.hovered = this.mouse && !p.dead && !this.driving ? this.pick(this.mouse.x, this.mouse.y) : null;
    const v = this.driving;
    this.hud.setDriving(
      v && { name: v.name, kmh: v.speed * 7.2, fuel: v.fuel, tank: v.type.tank, condition: v.condition, engine: v.engine, canHotwire: !this.hasKey(v) && !v.hotwired },
    );
    if (this.action) {
      const [ax, ay] = this.camera.toScreen(px, py - 76);
      this.hud.setProgress(this.action.label, this.action.elapsed / this.action.time, ax, ay);
    } else this.hud.setProgress(null, 0, 0, 0);
    this.canvas.style.cursor = this.hovered ? "pointer" : "default";
    this.hud.hover(this.hovered ? this.targetName(this.hovered) : null, this.mouse?.x ?? 0, this.mouse?.y ?? 0);
  }

  /**
   * Storeys drawn this frame: everything up to the player's, and the ones above too unless
   * there's a ceiling over their head (then the house is cut away so you can see inside).
   */
  private visibleLevels(): number[] {
    const p = this.player;
    const out: number[] = [];
    for (let l = 0; l < this.levels.length; l++) {
      const w = this.levels[l];
      if (l > p.level && !this.driving && w.floors[p.tileY * w.width + p.tileX]) break;
      out.push(l);
    }
    return out;
  }

  private buildDrawables(dt: number): void {
    const { atlas, player } = this;
    const list: Drawable[] = [];
    const b = this.camera.bounds();
    const visible = (x: number, y: number, s: Sprite) =>
      x - s.ax < b.x1 && x - s.ax + s.w > b.x0 && y - s.ay < b.y1 && y - s.ay + s.h > b.y0;

    for (const level of this.visibleLevels()) {
      const world = this.levels[level];
      const lift = level * WALL_H;
      const base = level * LEVEL_KEY;
      for (const e of world.edges.values()) {
        const s = atlas.get(edgeKey(e.comp.id, e.side, e.state));
        const x = isoX(e.x, e.y);
        const y = isoY(e.x, e.y, lift);
        if (!visible(x, y, s)) continue;
        list.push({
          key: base + (e.x + e.y) * 10 + (e.side === "N" ? 1 : 1.05),
          sprite: s, x, y,
          target: { kind: "edge", edge: e },
          fader: e,
          occludes: e.comp.height > 40,
          level,
        });
        if (e.barricade)
          list.push({
            key: base + (e.x + e.y) * 10 + (e.side === "N" ? 1.001 : 1.051),
            sprite: atlas.get(barricadeKey(e.side, e.barricade)), x, y,
            target: { kind: "edge", edge: e },
            occludes: false,
            level,
          });
      }
      for (const o of world.objects) {
        const s = atlas.get(objectKey(o.comp.id, o.facing, o.state));
        const x = isoX(o.x, o.y);
        const y = isoY(o.x, o.y, lift);
        if (!visible(x, y, s)) continue;
        const layer = o.comp.layer ?? 2;
        list.push({
          // flat decals (rugs) go right after the floor
          key: base + (layer < 1 ? -1 : (o.x + o.wx - 1 + o.y + o.wy - 1) * 10 + layer),
          sprite: s, x, y,
          target: { kind: "object", obj: o },
          fader: o,
          occludes: o.comp.occludes ?? o.comp.height > 50,
          level,
        });
      }
      if (level !== 0) continue;

      for (const v of this.vehicles) {
        const s = atlas.get(vehicleKey(v.type.id, v.dir16, v.paint));
        const x = isoX(v.x, v.y);
        const y = isoY(v.x, v.y);
        if (!visible(x, y, s)) continue;
        list.push({
          key: (Math.floor(v.x) + Math.floor(v.y)) * 10 + 2.5,
          sprite: s, x, y,
          target: { kind: "vehicle", v },
          fader: v,
          occludes: true,
          level,
        });
      }

      for (const z of this.director.zombies) {
        const x = isoX(z.x, z.y);
        const y = isoY(z.x, z.y);
        const lying = z.rise > 0;
        const s = atlas.get(lying ? corpseKey(z.look, z.dir) : charKey(z.look, z.dir, z.animFrame()));
        if (!visible(x, y, s)) continue;
        list.push({
          key: (z.tileX + z.tileY) * 10 + (lying ? 1 : 3 + ((z.x + z.y) % 1) * 0.4),
          sprite: s, x, y,
          target: lying ? undefined : { kind: "zombie", z },
          occludes: false,
          tint: z.flash > 0 ? [2.2, 0.7, 0.7] : undefined,
          level,
        });
      }
    }

    const [px, py] = this.playerScreen();
    // on a staircase, draw over the steps you're standing on
    const onStairs = this.stairLift() > 0 ? 25 : 0;
    const seat = player.seat;
    const playerKey = player.level * LEVEL_KEY + (seat ? seat.key : (player.tileX + player.tileY) * 10 + 3 + onStairs);
    if (!player.dead && !this.driving) {
      const ps = atlas.get(charKey(player.survivor.look, seat ? seat.dir : player.dir, player.animFrame(), player.stance, player.equipped?.def.id ?? ""));
      list.push({ key: playerKey + (seat ? 0 : ((player.x + player.y) % 1) * 0.4), sprite: ps, x: px, y: py, occludes: false, level: player.level });
    }
    list.sort((a, b) => a.key - b.key);

    // fade tall things whose pixels actually cover the player's body
    const probes: [number, number][] = [[0, -56], [0, -40], [0, -24], [-8, -34], [8, -34], [0, -6]];
    const k = 1 - Math.exp(-dt * 10);
    for (const d of list) {
      if (!d.fader) continue;
      let target = 1;
      if (!player.dead && !this.driving && d.occludes && d.key > playerKey) {
        const s = d.sprite;
        const x0 = d.x - s.ax;
        const y0 = d.y - s.ay;
        if (probes.some(([dx, dy]) => atlas.hit(s, px + dx - x0, py + dy - y0))) target = 0.3;
      }
      d.fader.fade += (target - d.fader.fade) * k;
    }
    this.drawables = list;
  }

  // -------------------------------------------------------------- combat

  private weapon(): WeaponInfo {
    const it = this.player.equipped;
    const sv = this.player.survivor;
    if (!it) return { item: null, skill: "blunt", ranged: false, damage: 0.35, reach: 1.15, cooldown: 0.8, noise: 3 };
    if (it.def.category === "firearm")
      return {
        item: it, skill: "firearms", ranged: true, damage: it.def.damage ?? 1,
        reach: 7 + sv.skills.firearms * 0.3, cooldown: it.def.id === "hunting_rifle" ? 1.4 : 0.9,
        noise: GUN_NOISE[it.def.id] ?? 25,
      };
    return {
      item: it, skill: BLADES.has(it.def.id) ? "blade" : "blunt", ranged: false, damage: it.def.damage ?? 0.5,
      reach: it.def.weight >= 1.8 ? 1.4 : 1.25, cooldown: 0.55 + it.def.weight * 0.18, noise: 5,
    };
  }

  private engage(z: Zombie): void {
    this.engaged = z;
    this.engageRepath = 0;
    this.marker = null;
  }

  private attackNearest(): void {
    const p = this.player;
    // the dead walk the ground floor only
    if (p.dead || p.level !== 0) return;
    const reach = Math.max(this.weapon().reach, 6);
    let best: Zombie | null = null;
    let bd = Infinity;
    for (const z of this.director.zombies) {
      if (z.rise > 0) continue;
      const d = Math.hypot(z.x - p.x, z.y - p.y);
      if (d < bd && d <= reach && this.world.canSee(p.x, p.y, z.x, z.y)) {
        bd = d;
        best = z;
      }
    }
    if (best) this.engage(best);
  }

  /** Where each flight starts and ends, as tiles. */
  private flights(): { z: number; b1: { x: number; y: number }; top: { x: number; y: number }; b0: { x: number; y: number } }[] {
    const D: Record<Facing, [number, number]> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
    return (this.ground.data.stairs ?? []).map((s) => {
      const [dx, dy] = D[s.dir];
      return { z: s.z, b0: { x: s.x, y: s.y }, b1: { x: s.x + dx, y: s.y + dy }, top: { x: s.x + dx * 2, y: s.y + dy * 2 } };
    });
  }

  /**
   * Climbing onto the top step from the one below takes you up a storey; stepping from the
   * landing back onto the flight takes you down. Arrival tiles aren't triggers, so no bouncing.
   */
  private takeStairs(from: { x: number; y: number }): void {
    const p = this.player;
    const at = (t: { x: number; y: number }) => p.tileX === t.x && p.tileY === t.y;
    const was = (t: { x: number; y: number }) => from.x === t.x && from.y === t.y;
    for (const f of this.flights()) {
      if (p.level === f.z && at(f.top) && was(f.b1)) return this.changeLevel(f.z + 1, "Upstairs.");
      if (p.level === f.z + 1 && at(f.b1) && was(f.top)) return this.changeLevel(f.z, "Downstairs.");
    }
  }

  /** Walk to the foot of the flight and up it. */
  private climbStairs(o: ObjectInstance): void {
    const p = this.player;
    const f = this.flights().find((f) => f.z === p.level && f.b0.x >= o.x && f.b0.x < o.x + o.wx && f.b0.y >= o.y && f.b0.y < o.y + o.wy);
    if (!f) return;
    this.engaged = null;
    this.cancelAction();
    const path = p.tileX === f.b1.x && p.tileY === f.b1.y ? [] : findPath(this.world, { x: p.tileX, y: p.tileY }, [f.b1]);
    if (!path) return this.hud.say("I can't get there.", 1500);
    this.marker = null;
    p.walk([...path, f.top]);
  }

  private changeLevel(level: number, line: string): void {
    const p = this.player;
    p.stop();
    p.level = level;
    this.marker = null;
    this.closeContainer();
    this.cancelAction();
    this.engaged = null;
    this.hud.say(line, 900);
  }

  /** Nothing underfoot (out a first-floor window, over a railing): drop until something catches you. */
  private checkFall(): void {
    const p = this.player;
    let drop = 0;
    while (p.level > 0 && !this.world.floors[p.tileY * this.world.width + p.tileX]) {
      p.level--;
      drop++;
    }
    if (!drop) return;
    p.stop();
    this.marker = null;
    this.closeContainer();
    if (!this.world.isWalkable(p.tileX, p.tileY)) {
      const t = nearestWalkable(this.world, p.tileX, p.tileY);
      if (t) {
        p.x = t.x + 0.5;
        p.y = t.y + 0.5;
      }
    }
    const hp = p.health;
    hp.bruise(drop * (14 + Math.random() * 14) * (1.2 - p.survivor.skills.athletics * 0.05));
    if (Math.random() < 0.3 * drop) hp.injure("laceration", 3, Math.random() < 0.5 ? "Left Leg" : "Right Leg");
    this.hud.hurt();
    this.hud.say(drop > 1 ? "AAAH-- ...everything hurts." : "Oof! Hit the ground hard.", 2400);
    this.director.noise(p.x, p.y, 8);
  }

  /** How high the player stands above their storey's floor: partway up a flight of stairs. */
  private stairLift(): number {
    const p = this.player;
    for (const f of this.flights()) {
      if (p.level !== f.z) continue;
      const dx = Math.sign(f.top.x - f.b0.x);
      const dy = Math.sign(f.top.y - f.b0.y);
      // -0.5 at the foot of the flight, 2.5 at the top edge
      const u = (p.x - f.b0.x - 0.5) * dx + (p.y - f.b0.y - 0.5) * dy;
      const across = (p.x - f.b0.x - 0.5) * dy + (p.y - f.b0.y - 0.5) * dx;
      if (u < -0.5 || u > 2.5 || Math.abs(across) > 0.5) continue;
      return ((u + 0.5) / 3) * WALL_H;
    }
    return 0;
  }

  /** Loose shards on the floor: careful feet usually get away with it, hands and knees don't. */
  private stepOnGlass(): void {
    const p = this.player;
    const pile = this.world.objects.find((o) => o.comp.id === "item_pile" && o.x === p.tileX && o.y === p.tileY);
    if (!pile?.inventory?.items.some((i) => i.def.id === "glass_shard")) return;
    const crawl = p.stance === "crawl";
    const chance = crawl ? 0.5 : p.sprinting ? 0.35 : p.stance === "crouch" ? 0.08 : 0.15;
    if (Math.random() >= chance) return;
    const deep = crawl || p.sprinting;
    const part = crawl
      ? (["Left Hand", "Right Hand", "Left Arm", "Right Arm"] as const)[Math.floor(Math.random() * 4)]
      : Math.random() < 0.5 ? "Left Leg" : "Right Leg";
    p.health.injure(deep ? "laceration" : "scratch", deep ? 3 : 1, part);
    this.hud.hurt();
    this.hud.say(crawl ? "Crawled right through the glass." : "Ow! Stepped on glass.", 1800);
  }

  private updateCombat(dt: number): void {
    const p = this.player;
    this.attackCd = Math.max(0, this.attackCd - dt);

    // sneaking practice: moving around zombies that haven't noticed you
    this.sneakTick -= dt;
    if (this.sneakTick <= 0) {
      this.sneakTick = 1;
      const zs = this.director.zombies;
      const near = zs.some((z) => Math.hypot(z.x - p.x, z.y - p.y) < 8);
      if (near && !zs.some((z) => z.mode === "chase")) this.train("sneaking", 0.6);
    }

    const z = this.engaged;
    if (!z) return;
    if (!this.director.zombies.includes(z)) {
      this.engaged = null;
      return;
    }
    const w = this.weapon();
    const d = Math.hypot(z.x - p.x, z.y - p.y);
    if (d <= w.reach && this.world.canSee(p.x, p.y, z.x, z.y)) {
      if (p.moving) p.stop();
      p.face(z.x, z.y);
      if (this.attackCd <= 0) this.strike(z, w, d);
      return;
    }
    this.engageRepath -= dt;
    if (this.engageRepath > 0) return;
    this.engageRepath = 0.35;
    const path = findPath(this.world, { x: p.tileX, y: p.tileY }, [{ x: z.tileX, y: z.tileY }], { limit: 4000 });
    if (path) p.walk(path);
    else this.engaged = null;
  }

  private takeRound(w: WeaponInfo): boolean {
    const ammo = w.item?.def.ammo;
    const box = this.player.inventory.items.find((i) => i.def.id === ammo);
    if (!box) return false;
    box.rounds = (box.rounds ?? BOX_ROUNDS[box.def.id] ?? 10) - 1;
    if (box.rounds <= 0) this.player.inventory.remove(box);
    return true;
  }

  private strike(z: Zombie, w: WeaponInfo, dist: number): void {
    const p = this.player;
    const sv = p.survivor;
    const lvl = sv.skills[w.skill];
    this.attackCd = w.cooldown * (1 - lvl * 0.04);
    p.swing(Math.min(0.45, this.attackCd * 0.85));
    if (w.ranged && !this.takeRound(w)) {
      this.hud.say("I'm out of ammo.", 1600);
      this.engaged = null;
      return;
    }
    this.director.noise(p.x, p.y, w.noise * (w.ranged ? 1 : sv.noticeFactor));

    const chance = w.ranged ? 0.45 + lvl * 0.05 - dist * 0.02 : 0.75 + lvl * 0.025;
    if (Math.random() < chance) {
      const str = w.ranged ? 1 : 0.7 + sv.attributes.strength * 0.06;
      const dmg = w.damage * str * (1 + lvl * 0.08) * (0.85 + Math.random() * 0.3);
      // an empty-handed hit is a shove: little damage, but it sends them reeling
      if (this.director.damage(z, dmg, p.x, p.y, w.item ? 0.3 : 0.65)) this.kill(z);
      this.train(w.skill, 5);
      // buckshot spreads into whoever's standing next to the target
      if (w.item?.def.id === "shotgun")
        for (const o of this.director.zombies.slice()) {
          if (o === z || o.rise > 0 || Math.hypot(o.x - z.x, o.y - z.y) > 1.3) continue;
          if (this.director.damage(o, dmg * 0.6, p.x, p.y)) this.kill(o);
        }
    } else if (w.ranged) this.train(w.skill, 1);

    if (w.item?.def.id === "glass_shard" && Math.random() < 0.12) {
      p.health.injure("laceration", 3, "Right Hand");
      this.hud.hurt();
      this.hud.say("The glass cut my hand.", 1600);
    }
    const it = w.item;
    if (it && it.condition !== undefined && it.def.durability) {
      it.condition -= (w.ranged ? 0.5 : 1) / it.def.durability;
      if (it.condition <= 0) {
        p.inventory.remove(it);
        p.equipped = null;
        this.hud.say(`My ${it.def.name.toLowerCase()} broke!`, 2000);
      }
    }
    this.refreshPanels();
  }

  private kill(z: Zombie): void {
    this.director.remove(z);
    if (this.engaged === z) this.engaged = null;
    this.player.kills++;
    this.train(this.weapon().skill, 8);
    const o = this.ground.addObject({ type: "corpse", x: z.tileX, y: z.tileY, facing: "S", state: `${z.look}:${z.dir}` });
    // a turned survivor still has everything they were carrying, a dead driver has their keys
    if (z.items.length) {
      const inv = new Inventory(z.label !== "Zombie" ? `${z.label}'s body` : "Corpse", 40);
      inv.items.push(...z.items);
      if (z.label === "Zombie") inv.items.push(...rollLoot("zombie", new Rng(o.uid * 7919)));
      o.inventory = inv;
    }
  }

  private train(skill: SkillId, xp: number): void {
    const lvl = this.player.survivor.train(skill, xp);
    if (lvl !== null) {
      const name = SKILLS.find((x) => x.id === skill)!.name;
      this.hud.say(`${name} skill increased to ${lvl}.`, 2400);
    }
  }

  private zombieAttack(z: Zombie): void {
    const p = this.player;
    if (p.dead) return;
    if (this.driving) {
      // they can't reach you through the car, but they can wreck it
      this.driving.condition = Math.max(0, this.driving.condition - 0.8);
      if (this.time - this.carSaid > 6) {
        this.carSaid = this.time;
        this.hud.say("They're pounding on the car!", 2000);
      }
      return;
    }
    if (this.action) {
      this.action = null;
      this.hud.say("Interrupted!", 1200);
    }
    const w = p.health.hit();
    this.lastZombieHit = this.time;
    this.hud.hurt();
    const part = w.part.toLowerCase();
    if (w.kind === "bite") this.hud.say(`It bit my ${part}... oh no. No no no.`, 3500);
    else if (w.kind === "laceration") this.hud.say(`It tore my ${part} open!`, 2200);
    else this.hud.say(`Argh! It scratched my ${part}.`, 2000);
    z.dir = Math.round(Math.atan2(p.y - z.y, p.x - z.x) / (Math.PI / 4) + 8) % 8;
  }

  private doorBang(e: EdgeInstance): void {
    if (!this.near(e.x, e.y, 14) || this.time - this.bangSaid < 10) return;
    this.bangSaid = this.time;
    this.hud.say("Something's banging on a door...", 2200);
  }

  // -------------------------------------------------------------- medical

  private findItem(ids: string[]): Item | undefined {
    return this.player.inventory.items.find((i) => ids.includes(i.def.id));
  }

  private worstWound(): Wound | undefined {
    const order = { bite: 0, laceration: 1, scratch: 2 };
    return this.player.health.wounds.filter((w) => !w.bandaged).sort((a, b) => order[a.kind] - order[b.kind])[0];
  }

  private bandage(w: Wound): void {
    const p = this.player;
    const item = this.findItem(BANDAGES);
    if (!item || w.bandaged) return;
    p.inventory.remove(item);
    p.health.bandage(w, p.survivor.skills.firstAid);
    this.train("firstAid", 15);
    this.hud.say(w.kind === "bite" ? "Wrapped it up. Doesn't change anything, does it." : "That should stop the bleeding.", 2600);
    this.refreshPanels();
  }

  private painkillers(): void {
    const p = this.player;
    const item = this.findItem(["painkillers"]);
    if (!item) return;
    p.inventory.remove(item);
    p.health.hp = Math.min(100, p.health.hp + 8);
    this.hud.say("That takes the edge off.", 1800);
    this.refreshPanels();
  }

  private moodles(): [string, string, number][] {
    const p = this.player;
    const h = p.health;
    const out: [string, string, number][] = [];
    const s = p.satiety;
    if (s <= 50) out.push(["H", s > 30 ? "Peckish" : s > 12 ? "Hungry" : "Starving", s > 30 ? 1 : s > 12 ? 2 : 3]);
    if (h.bleeding) out.push(["B", "Bleeding", 2]);
    if (p.winded) out.push(["~", "Out of breath", 2]);
    if (h.hp < 70) out.push(["+", h.hp < 30 ? "Critical" : h.hp < 50 ? "Badly hurt" : "Hurt", h.hp < 30 ? 3 : h.hp < 50 ? 2 : 1]);
    const sym = h.symptom;
    if (sym) out.push(["!", sym, sym === "Queasy" ? 1 : sym === "Nauseous" ? 2 : 3]);
    return out;
  }

  // -------------------------------------------------------- death & rebirth

  private die(): void {
    const p = this.player;
    const sv = p.survivor;
    if (this.driving) {
      const v = this.driving;
      const spot = v.accessTiles(this.ground)[0];
      this.leaveCar(v);
      if (spot) {
        p.x = spot.x + 0.5;
        p.y = spot.y + 0.5;
      }
    }
    this.cancelAction();
    p.dead = true;
    p.stop();
    this.engaged = null;
    this.marker = null;
    this.menu.hide();
    this.closeContainer();
    this.playerPanel.hide();
    const items = p.inventory.items.slice();
    const infected = p.health.infection !== null;
    const mauled = this.time - this.lastZombieHit < 10;
    if (infected || mauled) {
      // they always get back up
      this.director.spawnRisen(p.x, p.y, sv.zombieLook, p.dir, items, sv.name);
    } else {
      const o = this.world.addObject({ type: "corpse", x: p.tileX, y: p.tileY, facing: "S", state: `${sv.look}:${p.dir}` });
      const inv = new Inventory(`${sv.name}'s body`, 40);
      inv.items.push(...items);
      o.inventory = inv;
    }
    const crash = this.time - this.crashTime < 6;
    this.deathCause = infected && p.health.infectionProgress! >= 1 ? "The infection took you."
      : crash ? (this.ejected ? "Thrown through the windshield." : "Died in a car crash.")
      : mauled ? "Torn apart by the dead."
      : p.satiety <= 0 ? "Starved to death."
      : "Bled out.";
    this.deathTimer = 2.5;
  }

  private deathCause = "";

  private showDeath(): void {
    const p = this.player;
    const sv = p.survivor;
    const m = Math.floor(p.alive / 60);
    const sec = Math.floor(p.alive % 60);
    const turned = this.director.zombies.some((z) => z.label === sv.name);
    this.hud.showDeath(
      `<b>${sv.name}</b>, ${sv.occupation.toLowerCase()}<br>` +
        `${this.deathCause}<br>Survived ${m}m ${sec}s · ${p.kills} ${p.kills === 1 ? "zombie" : "zombies"} killed` +
        (turned ? "<br><br>They'll be back on their feet soon. With all their stuff." : ""),
    );
  }

  /** A new person, somewhere indoors and away from the dead. The world carries on as it was. */
  // ------------------------------------------------------------ save & load

  private saveTick = 15;

  /** Write the whole game to localStorage. Skipped while dead, so the last save stands. */
  save(): void {
    const p = this.player;
    if (p.dead) return;
    const car = this.driving;
    const sv = p.survivor;
    const data: SaveData = {
      v: 1,
      time: this.time,
      survivors: this.survivors,
      levels: this.levels.map((w) => saveLevel(w, this.pumpFuel)),
      player: {
        // saved mid-drive, you come back standing next to the car
        x: car ? car.x : p.x, y: car ? car.y : p.y, level: p.level, dir: p.dir, stance: p.stance,
        satiety: p.satiety, stamina: p.stamina, alive: p.alive, kills: p.kills,
        items: p.inventory.items.map(saveItem),
        equipped: p.equipped ? p.inventory.items.indexOf(p.equipped) : -1,
        hp: p.health.hp, wounds: p.health.wounds, infection: p.health.infection,
        survivor: {
          name: sv.name, occupation: sv.occupation, traits: sv.traits.map((t) => t.id), attributes: sv.attributes,
          skills: sv.skills, xp: sv.xp, studied: [...sv.studied], look: sv.look, zombieLook: sv.zombieLook, infectionTime: sv.infectionTime,
        },
      },
      // zombies queued to walk in come back as part of the off-map pool
      pool: this.director.population - this.director.zombies.length,
      zombies: this.director.zombies.map((z) => ({
        x: z.x, y: z.y, look: z.look, hp: z.hp, dir: z.dir, label: z.label, rise: z.rise, items: z.items.map(saveItem),
      })),
      vehicles: this.vehicles.map((v) => ({
        id: v.id, x: v.x, y: v.y, heading: v.heading, paint: v.paint, condition: v.condition, fuel: v.fuel,
        wheels: v.wheels.map((w) => (w ? w.condition : -1)), hotwired: v.hotwired, trunk: v.trunk.items.map(saveItem),
      })),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // storage full or blocked: nothing to do but keep playing
    }
  }

  /** Pick up where the last session left off. False when there's no save to load. */
  load(): boolean {
    let data: SaveData;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      data = JSON.parse(raw);
    } catch {
      return false;
    }
    if (data?.v !== 1) return false;
    try {
      this.applySave(data);
    } catch (err) {
      // a save this version can't read: start fresh rather than run on a half-loaded world
      console.warn("Could not load the saved game, starting a new one.", err);
      this.newGame();
      return false;
    }
    return true;
  }

  private newGame(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // nothing saved, or storage is blocked
    }
    // don't let the unload handler write the old game straight back
    this.saveTick = Infinity;
    this.save = () => {};
    location.reload();
  }

  private applySave(d: SaveData): void {
    this.time = d.time;
    this.survivors = d.survivors;
    d.levels.forEach((l, i) => this.levels[i] && loadLevel(this.levels[i], l, this.pumpFuel));

    const s = d.player.survivor;
    const sv = new Survivor(this.survivors);
    Object.assign(sv, {
      name: s.name, occupation: s.occupation, attributes: s.attributes, skills: s.skills, xp: s.xp,
      look: s.look, zombieLook: s.zombieLook, infectionTime: s.infectionTime,
      traits: s.traits.map((id) => TRAITS.find((t) => t.id === id)).filter((t) => !!t),
    });
    for (const id of s.studied) sv.studied.add(id);
    const level = this.levels[d.player.level] ? d.player.level : 0;
    const w = this.levels[level];
    let { x, y } = d.player;
    if (!w.isWalkable(Math.floor(x), Math.floor(y))) {
      const t = nearestWalkable(w, Math.floor(x), Math.floor(y));
      if (t) [x, y] = [t.x + 0.5, t.y + 0.5];
    }
    const p = new Player({ x: 0, y: 0 }, sv);
    Object.assign(p, {
      x, y, level, dir: d.player.dir, stance: d.player.stance, satiety: d.player.satiety, stamina: d.player.stamina,
      alive: d.player.alive, kills: d.player.kills,
    });
    p.inventory.items = loadItems(d.player.items);
    p.equipped = p.inventory.items[d.player.equipped] ?? null;
    p.health.hp = d.player.hp;
    p.health.wounds = d.player.wounds;
    p.health.infection = d.player.infection;
    // wound ids carry on from the highest one saved
    (p.health as unknown as { nextId: number }).nextId = Math.max(0, ...d.player.wounds.map((w) => w.id)) + 1;
    this.player = p;

    const zs = this.director.zombies;
    zs.length = 0;
    for (const z of d.zombies) {
      const n = new Zombie(z.x, z.y, z.look);
      n.hp = z.hp;
      n.dir = z.dir;
      n.label = z.label;
      n.rise = z.rise;
      n.items = loadItems(z.items);
      zs.push(n);
    }
    this.director.pool = d.pool;

    for (const sv of d.vehicles) {
      const v = this.vehicles.find((c) => c.id === sv.id);
      if (!v) continue;
      Object.assign(v, { x: sv.x, y: sv.y, heading: sv.heading, paint: sv.paint, condition: sv.condition, fuel: sv.fuel, hotwired: sv.hotwired });
      v.wheels = sv.wheels.map((c) => (c < 0 ? null : { condition: c }));
      v.trunk.items = loadItems(sv.trunk);
      v.claim(this.ground);
    }

    const [cx, cy] = this.playerScreen();
    this.camera.x = cx;
    this.camera.y = cy;
    this.refreshPanels();
    this.hud.say(`${sv.name}, still alive. For now.`, 2600);
  }

  private respawn(): void {
    this.survivors++;
    const tile = this.pickSpawn();
    this.player = new Player(tile, new Survivor(this.survivors));
    this.hud.hideDeath();
    const [sx, sy] = this.playerScreen();
    this.camera.x = sx;
    this.camera.y = sy;
    this.attackCd = 0;
    this.refreshPanels();
    this.greet("What happened here?");
  }

  private pickSpawn(): { x: number; y: number } {
    const world = this.ground;
    const zs = this.director.zombies;
    const scored: { t: { x: number; y: number }; d: number }[] = [];
    for (let y = 0; y < world.height; y++)
      for (let x = 0; x < world.width; x++) {
        const f = world.floors[y * world.width + x];
        if (!f || !INDOOR.has(f.id) || !world.isWalkable(x, y)) continue;
        let d = Infinity;
        for (const z of zs) d = Math.min(d, Math.hypot(z.x - x, z.y - y));
        scored.push({ t: { x, y }, d });
      }
    if (!scored.length) return world.data.spawn;
    const safe = scored.filter((s) => s.d >= 12);
    if (safe.length) return safe[Math.floor(Math.random() * safe.length)].t;
    scored.sort((a, b) => b.d - a.d);
    return scored[0].t;
  }

  // ------------------------------------------------------------ vehicles

  private spawnVehicles(): void {
    const placements = this.ground.data.vehicles ?? [];
    placements.forEach((pl, i) => {
      const v = new Vehicle(i, pl.type, pl.x, pl.y, pl.heading);
      if (pl.paint) v.paint = pl.paint;
      if (pl.condition !== undefined) v.condition = pl.condition;
      v.fuel = v.type.tank * (pl.fuel ?? Math.random() * 0.4);
      if (pl.wheels) v.wheels = pl.wheels.map((c) => (c < 0 ? null : { condition: c }));
      v.trunk.items.push(...rollLoot("car", new Rng(i * 104729 + 17)));
      v.claim(this.ground);
      this.vehicles.push(v);
      this.placeKey(v);
    });
  }

  /** Every car's key is somewhere: in the car, on the dead driver nearby, or dropped on the ground. */
  private placeKey(v: Vehicle): void {
    const key = createItem("car_key");
    key.keyFor = v.id;
    key.label = `Car Key (${v.name})`;
    const r = Math.random();
    if (r < 0.35) {
      v.trunk.items.push(key);
      return;
    }
    const spots = this.spotsNear(v, 4);
    const spot = spots[Math.floor(Math.random() * spots.length)];
    if (!spot) {
      v.trunk.items.push(key);
      return;
    }
    if (r < 0.7) {
      const z = this.director.spawnAt(spot.x + 0.5, spot.y + 0.5, [key]);
      if (z) return;
    }
    this.dropItems(spot.x, spot.y, [key]);
  }

  /** Walkable tiles within r of a car, not under it. */
  private spotsNear(v: Vehicle, r: number): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    for (let y = Math.floor(v.y - r); y <= v.y + r; y++)
      for (let x = Math.floor(v.x - r); x <= v.x + r; x++)
        if (this.ground.isWalkable(x, y) && Math.hypot(x + 0.5 - v.x, y + 0.5 - v.y) > 1.6) out.push({ x, y });
    return out;
  }

  /** Put items on the ground at a tile, joining a pile that's already there. */
  private dropItems(x: number, y: number, items: Item[], world = this.world): void {
    let pile = world.objects.find((o) => o.comp.id === "item_pile" && o.x === x && o.y === y);
    if (!pile) {
      pile = world.addObject({ type: "item_pile", x, y });
      pile.inventory = new Inventory("Ground", 50);
    }
    pile.inventory!.items.push(...items);
  }

  private hasKey(v: Vehicle): boolean {
    return this.player.inventory.items.some((i) => i.keyFor === v.id);
  }

  private nearVehicle(v: Vehicle): boolean {
    const p = this.player;
    return Math.hypot(p.x - v.x, p.y - v.y) < v.type.shape.length / 2 + 1.3;
  }

  /** Walk up to the car, then do something. */
  private approachVehicle(v: Vehicle, then: () => void): void {
    this.engaged = null;
    this.cancelAction();
    const p = this.player;
    if (this.nearVehicle(v)) {
      p.stop();
      then();
      return;
    }
    const tiles = v.accessTiles(this.ground);
    const path = tiles.length ? findPath(this.ground, { x: p.tileX, y: p.tileY }, tiles) : null;
    if (!path) {
      this.hud.say("I can't get to it.", 1500);
      return;
    }
    this.marker = null;
    p.walk(path, then);
  }

  /**
   * Sit on a bench, chair or sofa, on the half nearest you, facing the way it faces. A picnic
   * table has a bench on both long sides: take the one on your side, facing the table.
   */
  private sit(o: ObjectInstance): void {
    const p = this.player;
    const N: Record<Facing, [number, number]> = { S: [0, 1], E: [1, 0], N: [0, -1], W: [-1, 0] };
    let [nx, ny] = N[o.facing];
    const cx = o.x + o.wx / 2;
    const cy = o.y + o.wy / 2;
    let x = cx + nx * 0.06;
    let y = cy + ny * 0.06;
    if (o.comp.id === "picnic_table") {
      // which side of the table you're on
      const side = Math.sign((p.x - cx) * nx + (p.y - cy) * ny) || 1;
      x = cx + nx * side * 0.38;
      y = cy + ny * side * 0.38;
      nx *= -side;
      ny *= -side;
    }
    // along a two-seater, the end nearest you
    const ax = Math.abs(ny);
    const ay = Math.abs(nx);
    const long = ax * (o.wx - 1) + ay * (o.wy - 1);
    if (long > 0) {
      const along = Math.sign((p.x - cx) * ax + (p.y - cy) * ay) || 1;
      x += ax * along * 0.45;
      y += ay * along * 0.45;
    }
    const front = nx + ny > 0;
    const key = (o.x + o.wx - 1 + o.y + o.wy - 1) * 10 + (front ? 2.5 : 1.5);
    p.stop();
    p.stance = "stand";
    p.seat = { x, y, dir: (Math.round(Math.atan2(ny, nx) / (Math.PI / 4)) + 8) % 8, key };
    this.marker = null;
  }

  private vehicleOptions(v: Vehicle): MenuOption[] {
    const opts: MenuOption[] = [
      { label: "Get in", action: () => this.approachVehicle(v, () => this.enterVehicle(v)) },
      { label: "Open trunk & glovebox", action: () => this.approachVehicle(v, () => this.openTrunk(v)) },
      { label: "Inspect / repair", action: () => this.vehiclePanel.show(v) },
    ];
    for (const j of this.jobs(v).filter((j) => ["pump", "pour", "siphon"].includes(j.id)))
      opts.push(j.needs.length ? { label: j.label, disabled: true } : { label: j.label, action: () => this.runJob(v, j.id) });
    return opts;
  }

  private openTrunk(v: Vehicle): void {
    this.openContainer = null;
    this.openVehicle = v;
    this.lootPanel.show(v.trunk, v.trunk.label);
    if (!this.playerPanel.open) this.showPlayerPanel();
  }

  private enterNearest(): void {
    const p = this.player;
    if (p.dead) return;
    let best: Vehicle | null = null;
    let bd = 4;
    for (const v of this.vehicles) {
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d < bd) {
        bd = d;
        best = v;
      }
    }
    if (best) this.approachVehicle(best, () => this.enterVehicle(best!));
  }

  private enterVehicle(v: Vehicle): void {
    const p = this.player;
    p.stop();
    this.closeContainer();
    this.driving = v;
    v.handbrake = false;
    p.x = v.x;
    p.y = v.y;
    if (this.hasKey(v)) this.hud.say("Got the key. Let's see if it starts.", 2000);
    else if (v.hotwired) this.hud.say("Wires are still hanging out from last time.", 2000);
    else this.hud.say("No key. I'll have to find it, or hotwire it.", 2600);
  }

  private leaveCar(v: Vehicle): void {
    v.throttle = 0;
    v.steer = 0;
    v.handbrake = true;
    this.driving = null;
  }

  private exitVehicle(): void {
    const v = this.driving;
    if (!v) return;
    if (Math.abs(v.speed) > 1.5) {
      this.hud.say("Not at this speed!", 1200);
      return;
    }
    const [dx, dy] = v.wheelWorld(0);
    const tiles = v.accessTiles(this.ground).sort((a, b) => Math.hypot(a.x + 0.5 - dx, a.y + 0.5 - dy) - Math.hypot(b.x + 0.5 - dx, b.y + 0.5 - dy));
    if (!tiles.length) {
      this.hud.say("There's no room to open the door.", 1600);
      return;
    }
    this.cancelAction();
    this.leaveCar(v);
    this.player.x = tiles[0].x + 0.5;
    this.player.y = tiles[0].y + 0.5;
  }

  private toggleEngine(): void {
    const v = this.driving;
    if (!v) return;
    if (v.engine) {
      v.engine = false;
      return;
    }
    if (!this.hasKey(v) && !v.hotwired) {
      this.hud.say("No key. Find it, or hotwire it (needs a screwdriver).", 2600);
      return;
    }
    if (v.fuel <= 0) {
      this.hud.say("Out of gas.", 1600);
      return;
    }
    this.director.noise(v.x, v.y, 10);
    if (Math.random() < v.startChance) {
      v.engine = true;
      this.hud.say("It started!", 1200);
    } else this.hud.say(v.condition <= 0 ? "Nothing. The engine's dead." : "It sputters... won't catch. Try again.", 1800);
  }

  private drive(dt: number): void {
    const v = this.driving!;
    const h = this.held;
    const up = h.has("KeyW") || h.has("ArrowUp");
    const down = h.has("KeyS") || h.has("ArrowDown");
    v.throttle = (up ? 1 : 0) - (down ? 1 : 0);
    v.steer = (h.has("KeyD") || h.has("ArrowRight") ? 1 : 0) - (h.has("KeyA") || h.has("ArrowLeft") ? 1 : 0);
    v.handbrake = h.has("Space");
    if (up && !v.engine && Math.abs(v.speed) < 0.1 && this.time - this.carSaid > 3) {
      this.carSaid = this.time;
      this.hud.say(this.hasKey(v) || v.hotwired ? "Engine's off. (Start engine)" : "It won't go anywhere without a key.", 1600);
    }
    const p = this.player;
    p.x = v.x;
    p.y = v.y;
    p.dir = Math.round(v.heading / (Math.PI / 4) + 8) % 8;
  }

  /** Physics for every car that's moving, crashes, running over zombies, engine noise. */
  private updateVehicles(dt: number): void {
    for (const v of this.vehicles) {
      const moving = Math.abs(v.vx) + Math.abs(v.vy) > 0.01;
      if (!moving && v !== this.driving) continue;
      const { impact, hit, vx, vy } = v.update(dt, this.ground);
      if (impact > 2) {
        const through = hit ? this.crashInto(v, hit, impact) : false;
        // plough on through what gave way, a lot slower
        if (through) {
          v.vx = vx * 0.5;
          v.vy = vy * 0.5;
        }
        v.crash(impact * (hit?.kind === "object" && hit.o.comp.category === "nature" ? 1.5 : 1));
        this.director.noise(v.x, v.y, 6 + impact * 1.5);
        if (v === this.driving) this.crashInjury(v, impact, through);
      }
      if (moving) this.hitZombies(v);
    }
    const v = this.driving;
    if (v?.engine) {
      this.engineNoise -= dt;
      if (this.engineNoise <= 0) {
        this.engineNoise = 1.5;
        this.director.noise(v.x, v.y, 9 + Math.abs(v.speed) * 1.2);
      }
    }
  }

  /**
   * Something solid got hit. Fences, glass, doors and even walls give way if you hit them hard
   * enough; furniture gets smashed; trees don't move. Returns true if the car went through.
   */
  private crashInto(v: Vehicle, hit: Obstacle, impact: number): boolean {
    const driver = v === this.driving;
    if (hit.kind === "vehicle") {
      const other = this.vehicles[hit.id];
      if (other) {
        other.crash(impact * 0.8);
        other.handbrake = false;
        const [fx, fy] = v.forward;
        other.vx += fx * impact * 0.35;
        other.vy += fy * impact * 0.35;
      }
      return false;
    }
    if (hit.kind === "edge") {
      const e = hit.e;
      const c = e.comp;
      const style = c.id.split("_").slice(1).join("_");
      const sturdy = c.category === "wall" || c.category === "window" ? (["brick", "block", "store"].includes(style) ? 11 : 8) : 0;
      const threshold = (c.category === "fence" ? (c.height < 40 ? 2.5 : 4.5) : c.door ? 6 : sturdy) + (e.barricade ?? 0);
      if (c.category === "window" && e.state === "default" && impact > 4) e.state = "broken";
      if (impact < threshold) return false;
      this.ground.removeEdge(e);
      if (c.category === "fence" || c.door || ["siding", "wallpaper", "kitchen", "bathroom"].includes(style))
        this.dropItems(Math.floor(v.x), Math.floor(v.y), [createItem("plank")], this.ground);
      if (driver) this.hud.say(c.category === "wall" || c.category === "window" ? "Smashed right through the wall!" : `Smashed through the ${c.name.toLowerCase()}!`, 2000);
      return true;
    }
    if (hit.kind === "object") {
      const o = hit.o;
      if (o.comp.category === "nature" || o.comp.id === "gas_pump") return false;
      if (impact < 4 + o.comp.height / 30) return false;
      this.ground.removeObject(o);
      const debris = [...(o.inventory?.items ?? []), createItem(/metal|fridge|stove|dumpster|toolbox|cooler|trash/.test(o.comp.id) ? "scrap_metal" : "plank")];
      this.dropItems(o.x, o.y, debris, this.ground);
      if (driver) this.hud.say(`Ploughed through the ${o.comp.name.toLowerCase()}.`, 1800);
      return true;
    }
    return false;
  }

  /** Hurt the driver in a crash; really hard hits throw you through the windshield. */
  private crashInjury(v: Vehicle, impact: number, through: boolean): void {
    const p = this.player;
    if (!through) this.hud.say(impact > 7 ? "CRUNCH!" : "Ouch, that's a dent.", 1500);
    if (impact <= 6) return;
    this.crashTime = this.time;
    this.ejected = false;
    p.health.bruise((impact - 6) * 4);
    this.hud.hurt();
    if (impact > 9 && Math.random() < (impact - 9) * 0.2) {
      // no seatbelt: out through the glass
      const [fx, fy] = v.forward;
      const L = v.type.shape.length / 2 + 0.6;
      let land: { x: number; y: number } | null = null;
      for (let d = L; d < L + 4; d += 0.4) {
        const tx = v.x + fx * d;
        const ty = v.y + fy * d;
        if (!this.ground.canSee(v.x + fx * L, v.y + fy * L, tx, ty)) break;
        if (this.ground.isWalkable(Math.floor(tx), Math.floor(ty))) land = { x: Math.floor(tx), y: Math.floor(ty) };
      }
      land ??= v.accessTiles(this.ground)[0] ?? null;
      if (land) {
        this.leaveCar(v);
        p.x = land.x + 0.5;
        p.y = land.y + 0.5;
        p.health.bruise(20 + (impact - 9) * 12);
        p.health.injure("laceration", 4, "Head");
        p.health.injure("laceration", 3, "Torso");
        this.ejected = true;
        this.hud.say("Went straight through the windshield!", 3000);
      }
    } else if (impact > 8 && Math.random() < 0.4) p.health.injure("laceration", 3, Math.random() < 0.5 ? "Head" : "Torso");
  }

  private hitZombies(v: Vehicle): void {
    const [fx, fy] = v.forward;
    const L = v.type.shape.length / 2 + 0.25;
    const W = v.type.shape.width / 2 + 0.25;
    const speed = Math.hypot(v.vx, v.vy);
    for (const z of this.director.zombies.slice()) {
      if (z.rise > 0) continue;
      const dx = z.x - v.x;
      const dy = z.y - v.y;
      const lf = dx * fx + dy * fy;
      const lr = -dx * fy + dy * fx;
      if (Math.abs(lf) > L || Math.abs(lr) > W) continue;
      if (speed > 1.5) {
        const killed = this.director.damage(z, speed * 0.45, v.x - fx, v.y - fy);
        v.condition = Math.max(0, v.condition - (speed * 0.25) / v.type.toughness);
        v.vx *= 0.85;
        v.vy *= 0.85;
        if (killed) this.kill(z);
      }
      // shove it out of the way, sideways
      if (this.director.zombies.includes(z)) {
        const side = lr >= 0 ? 1 : -1;
        const push = W - Math.abs(lr) + 0.05;
        z.x += -fy * side * push;
        z.y += fx * side * push;
        if (!this.ground.isWalkable(z.tileX, z.tileY)) {
          z.x -= -fy * side * push;
          z.y -= fx * side * push;
        }
      }
    }
  }

  private nearPump(v: Vehicle): ObjectInstance | undefined {
    return this.ground.objects.find((o) => o.comp.id === "gas_pump" && Math.hypot(o.x + 0.5 - v.x, o.y + 0.5 - v.y) < 3.2);
  }

  private pumpLeft(o: ObjectInstance): number {
    if (!this.pumpFuel.has(o.uid)) this.pumpFuel.set(o.uid, 120 + Math.floor(Math.random() * 200));
    return this.pumpFuel.get(o.uid)!;
  }

  private pumpOptions(o: ObjectInstance): MenuOption[] {
    const can = this.gasCan((c) => (c.fuel ?? 0) < c.def.capacity! - 0.1);
    const left = this.pumpLeft(o);
    const opts: MenuOption[] = [
      { label: left > 0 ? `About ${Math.round(left)} L left` : "Empty", disabled: true },
      can && left > 0
        ? { label: "Fill gas can", action: () => this.approach({ kind: "object", obj: o }, () => this.fillCan(o)) }
        : { label: can ? "Fill gas can" : "Fill gas can (need a can)", disabled: true },
    ];
    return opts;
  }

  private fillCan(o: ObjectInstance): void {
    const can = this.gasCan((c) => (c.fuel ?? 0) < c.def.capacity! - 0.1);
    if (!can) return;
    this.startAction("Filling can", 4, () => {
      const amount = Math.min(can.def.capacity! - (can.fuel ?? 0), this.pumpLeft(o));
      can.fuel = (can.fuel ?? 0) + amount;
      this.pumpFuel.set(o.uid, this.pumpLeft(o) - amount);
      this.hud.say(`Filled the can: ${can.fuel.toFixed(1)} L.`, 1800);
      this.refreshPanels();
    });
  }

  private gasCan(pred: (c: Item) => boolean): Item | undefined {
    return this.player.inventory.items.find((i) => i.def.id === "gas_can" && pred(i));
  }

  private hasItem(id: string): boolean {
    return this.player.inventory.items.some((i) => i.def.id === id);
  }

  // ------------------------------------------------------------ mechanics

  /** What can be done to this car right now, with odds and requirements. */
  private jobs(v: Vehicle): JobView[] {
    const sv = this.player.survivor;
    const need = (...ids: string[]) => ids.filter((id) => !this.hasItem(id)).map((id) => TOOL_NAMES[id] ?? id);
    const out: JobView[] = [];
    const mech = (base: number, time: number) => sv.task("mechanics", base, time);
    v.wheels.forEach((w, i) => {
      if (w) {
        const t = mech(0.8, 18);
        out.push({ id: `remove:${i}`, label: "Take off", needs: need("lug_wrench", "car_jack"), ...t, wheel: i });
      } else {
        const t = mech(0.6, 22);
        out.push({ id: `install:${i}`, label: "Put on", needs: need("lug_wrench", "car_jack", "car_wheel"), ...t, wheel: i });
      }
    });
    if (v.condition < 100) out.push({ id: "repair", label: "Repair engine & body", needs: need("wrench", "engine_parts"), ...mech(0.45, 30) });
    if (v.condition > 10) out.push({ id: "salvage", label: "Strip engine parts", needs: need("wrench"), ...mech(0.6, 25) });
    if (!this.hasKey(v) && !v.hotwired && this.driving === v) out.push({ id: "hotwire", label: "Hotwire", needs: need("screwdriver"), ...mech(0.25, 25) });
    const pump = this.nearPump(v);
    if (pump && v.fuel < v.type.tank - 0.5) {
      const amount = Math.min(v.type.tank - v.fuel, this.pumpLeft(pump));
      out.push({ id: "pump", label: "Fill up at the pump", needs: amount > 0 ? [] : ["a pump with gas"], chance: null, time: 2 + amount * 0.12 });
    }
    if (v.fuel < v.type.tank - 0.5) out.push({ id: "pour", label: "Pour in gas can", needs: this.gasCan((c) => (c.fuel ?? 0) > 0) ? [] : ["a gas can with gas"], chance: null, time: 6 });
    if (v.fuel > 0.1) out.push({ id: "siphon", label: "Siphon gas into can", needs: this.gasCan((c) => (c.fuel ?? 0) < c.def.capacity! - 0.1) ? [] : ["an empty gas can"], ...mech(0.85, 10) });
    return out;
  }

  /** Start a car job: walk over if needed, then work on it for a while and roll for success. */
  private runJob(v: Vehicle, id: string): void {
    const job = this.jobs(v).find((j) => j.id === id);
    if (!job) return;
    if (job.needs.length) {
      this.hud.say(`I need ${job.needs.join(", ")}.`, 2000);
      return;
    }
    const start = () => {
      const j = this.jobs(v).find((x) => x.id === id);
      if (!j || j.needs.length) return;
      this.startAction(j.label, j.time, () => {
        const again = this.jobs(v).find((x) => x.id === id);
        if (!again || again.needs.length) return;
        const ok = j.chance === null || Math.random() < j.chance;
        this.finishJob(v, id, ok);
        if (j.chance !== null) this.train("mechanics", ok ? 20 : 8);
        this.refreshPanels();
      });
    };
    if (this.driving === v) start();
    else this.approachVehicle(v, start);
  }

  private finishJob(v: Vehicle, id: string, ok: boolean): void {
    const p = this.player;
    const inv = p.inventory;
    const lvl = p.survivor.skills.mechanics;
    const [kind, slot] = id.split(":");
    const i = Number(slot);
    const take = (itemId: string) => {
      const it = inv.items.find((x) => x.def.id === itemId);
      if (it) inv.remove(it);
      return it;
    };
    const give = (items: Item[]) => {
      const spill: Item[] = [];
      for (const it of items) if (!inv.add(it)) spill.push(it);
      if (spill.length) {
        this.dropItems(p.tileX, p.tileY, spill);
        this.hud.say("Too heavy to carry. I put it down.", 2000);
      }
    };
    switch (kind) {
      case "remove": {
        const w = v.wheels[i];
        if (!w) return;
        if (!ok) return void this.hud.say("The wheel nuts are seized. Try again.", 2200);
        const item = createItem("car_wheel", w.condition / 100);
        v.wheels[i] = null;
        give([item]);
        this.hud.say(`Got the ${WHEEL_NAMES[i].toLowerCase()} wheel off.`, 2000);
        return;
      }
      case "install": {
        if (v.wheels[i]) return;
        const wheel = inv.items.filter((x) => x.def.id === "car_wheel").sort((a, b) => (b.condition ?? 0) - (a.condition ?? 0))[0];
        if (!wheel) return;
        if (!ok) {
          wheel.condition = Math.max(0, (wheel.condition ?? 0) - 0.15);
          return void this.hud.say("Cross-threaded a nut. Lost time and scuffed the wheel.", 2600);
        }
        inv.remove(wheel);
        v.wheels[i] = { condition: Math.round((wheel.condition ?? 0) * 100) };
        this.hud.say("Wheel's on.", 1600);
        return;
      }
      case "repair": {
        if (!ok) {
          if (Math.random() < 0.5) take("engine_parts");
          return void this.hud.say("That didn't go right. Wasted time, maybe a part.", 2400);
        }
        take("engine_parts");
        const gain = 15 + lvl * 2 + Math.random() * 10;
        v.condition = Math.min(100, v.condition + gain);
        this.hud.say(`Fixed it up a bit. (+${Math.round(gain)})`, 2000);
        return;
      }
      case "salvage": {
        if (!ok) {
          v.condition = Math.max(0, v.condition - 6);
          return void this.hud.say("Stripped a bolt. Nothing usable came out.", 2400);
        }
        const n = lvl >= 5 || Math.random() < 0.3 ? 2 : 1;
        give(Array.from({ length: n }, () => createItem("engine_parts")));
        v.condition = Math.max(0, v.condition - 12);
        this.hud.say(`Pulled ${n === 2 ? "two sets" : "a set"} of engine parts.`, 2000);
        return;
      }
      case "hotwire": {
        if (!ok) {
          if (Math.random() < 0.25) {
            p.health.hp -= 3;
            this.hud.hurt();
            return void this.hud.say("Ow! Got a jolt off the wires.", 2000);
          }
          return void this.hud.say("Wrong wires. Try again.", 1800);
        }
        v.hotwired = true;
        this.hud.say("Got it. Now start the engine.", 2000);
        return;
      }
      case "pump": {
        const pump = this.nearPump(v);
        if (!pump) return;
        const amount = Math.min(v.type.tank - v.fuel, this.pumpLeft(pump));
        v.fuel += amount;
        this.pumpFuel.set(pump.uid, this.pumpLeft(pump) - amount);
        this.hud.say(`Filled up: +${amount.toFixed(1)} L.`, 2000);
        return;
      }
      case "pour": {
        const can = this.gasCan((c) => (c.fuel ?? 0) > 0);
        if (!can) return;
        const amount = Math.min(can.fuel ?? 0, v.type.tank - v.fuel);
        v.fuel += amount;
        can.fuel = (can.fuel ?? 0) - amount;
        this.hud.say(`Poured in ${amount.toFixed(1)} L.`, 1800);
        return;
      }
      case "siphon": {
        const can = this.gasCan((c) => (c.fuel ?? 0) < c.def.capacity! - 0.1);
        if (!can) return;
        if (!ok) {
          v.fuel = Math.max(0, v.fuel - 0.5);
          p.health.hp -= 2;
          return void this.hud.say("Got a mouthful of gas. Ugh.", 2000);
        }
        const amount = Math.min(v.fuel, can.def.capacity! - (can.fuel ?? 0));
        v.fuel -= amount;
        can.fuel = (can.fuel ?? 0) + amount;
        this.hud.say(`Siphoned ${amount.toFixed(1)} L.`, 1800);
        return;
      }
    }
  }

  private read(book: Item): void {
    const skill = skillByName(book.def.teaches ?? "");
    if (!skill) return;
    const sv = this.player.survivor;
    if (sv.studied.has(skill)) {
      this.hud.say("I've already read this one.", 1600);
      return;
    }
    this.startAction(`Reading`, 18, () => {
      sv.studied.add(skill);
      this.train(skill, 20);
      this.hud.say(`${itemName(book)}: that should help.`, 2400);
    });
  }

  // ------------------------------------------------------- timed actions

  private startAction(label: string, time: number, done: () => void): void {
    const p = this.player;
    p.stop();
    this.action = { label, time, elapsed: 0, x: p.x, y: p.y, done };
  }

  private cancelAction(): void {
    this.action = null;
  }

  private updateAction(dt: number): void {
    const a = this.action;
    if (!a) return;
    const p = this.player;
    const v = this.driving;
    if (p.dead || Math.hypot(p.x - a.x, p.y - a.y) > 0.1 || (v && Math.abs(v.speed) > 0.3)) {
      this.action = null;
      return;
    }
    a.elapsed += dt;
    if (a.elapsed >= a.time) {
      this.action = null;
      a.done();
    }
  }

  render(dpr: number): void {
    const { renderer, atlas, camera, player } = this;
    renderer.begin();
    const b = camera.bounds(40);
    const [px, py] = this.playerScreen();
    const hov = this.hovered;
    for (const level of this.visibleLevels()) {
      const world = this.levels[level];
      const lift = level * WALL_H;
      // storeys below you are in shadow; ones above fade where they'd hide you
      const dim = level < player.level ? 0.6 : 1;
      const above = level > player.level && !player.dead;
      for (let ty = 0; ty < world.height; ty++)
        for (let tx = 0; tx < world.width; tx++) {
          const f = world.floors[ty * world.width + tx];
          if (!f) continue;
          const x = isoX(tx, ty);
          const y = isoY(tx, ty, lift);
          if (x + 33 < b.x0 || x - 33 > b.x1 || y + 34 < b.y0 || y > b.y1) continue;
          const a = above && x - 32 < px + 12 && x + 32 > px - 12 && y < py && y + 32 > py - 62 ? 0.3 : 1;
          renderer.draw(atlas.get(floorKey(f.id, f.variant)), x, y, dim, dim, dim, a);
        }
      if (this.marker && level === player.level) {
        const m = atlas.get(MARKER_KEY);
        const pulse = 0.65 + 0.35 * Math.sin(this.marker.t * 8);
        renderer.draw(m, isoX(this.marker.x, this.marker.y), isoY(this.marker.x, this.marker.y, lift), 1, 1, 1, pulse);
      }
      for (const d of this.drawables) {
        if (d.level !== level) continue;
        const a = d.fader?.fade ?? 1;
        const lit =
          hov && d.target &&
          ((hov.kind === "object" && d.target.kind === "object" && hov.obj === d.target.obj) ||
            (hov.kind === "edge" && d.target.kind === "edge" && hov.edge === d.target.edge) ||
            (hov.kind === "zombie" && d.target.kind === "zombie" && hov.z === d.target.z) ||
            (hov.kind === "vehicle" && d.target.kind === "vehicle" && hov.v === d.target.v));
        if (d.tint) renderer.draw(d.sprite, d.x, d.y, d.tint[0] * dim, d.tint[1] * dim, d.tint[2] * dim, a);
        else if (lit && d.target?.kind === "zombie") renderer.draw(d.sprite, d.x, d.y, 1.4, 1.0, 1.0, a);
        else {
          const t = (lit ? 1.3 : 1) * dim;
          renderer.draw(d.sprite, d.x, d.y, t, t, t * 1.05, a);
        }
      }
    }
    renderer.end(camera.x, camera.y, camera.zoom * dpr, this.canvas.width, this.canvas.height, BG);
  }
}

interface SaveData {
  v: 1;
  time: number;
  survivors: number;
  levels: SavedLevel[];
  player: {
    x: number;
    y: number;
    level: number;
    dir: number;
    stance: Stance;
    satiety: number;
    stamina: number;
    alive: number;
    kills: number;
    items: SavedItem[];
    equipped: number;
    hp: number;
    wounds: Wound[];
    infection: number | null;
    survivor: {
      name: string;
      occupation: string;
      traits: string[];
      attributes: Attributes;
      skills: Record<SkillId, number>;
      xp: Record<SkillId, number>;
      studied: SkillId[];
      look: string;
      zombieLook: string;
      infectionTime: number;
    };
  };
  pool: number;
  zombies: { x: number; y: number; look: string; hp: number; dir: number; label: string; rise: number; items: SavedItem[] }[];
  vehicles: {
    id: number;
    x: number;
    y: number;
    heading: number;
    paint: string;
    condition: number;
    fuel: number;
    wheels: number[];
    hotwired: boolean;
    trunk: SavedItem[];
  }[];
}
