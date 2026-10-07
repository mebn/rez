import type { Atlas, Sprite } from "../engine/atlas";
import type { Camera } from "../engine/camera";
import { bindInput } from "../engine/input";
import type { Renderer } from "../engine/renderer";
import { charKey, edgeKey, floorKey, MARKER_KEY, objectKey } from "../engine/sprites";
import { isoX, isoY, screenToTile } from "../core/iso";
import type { Item } from "../items/types";
import { findPath, nearestWalkable } from "../world/pathfinding";
import type { Interactable, ObjectInstance, World } from "../world/world";
import type { Inventory } from "../world/inventory";
import { ContextMenu, type MenuOption } from "../ui/context-menu";
import { Hud } from "../ui/hud";
import { InventoryPanel } from "../ui/inventory-panel";
import { Tooltip } from "../ui/tooltip";
import { Player } from "./player";

interface Drawable {
  key: number;
  sprite: Sprite;
  x: number;
  y: number;
  target?: Interactable;
  /** Object/edge whose fade value we animate when the player is behind it. */
  fader?: { fade: number };
  occludes: boolean;
}

const PLAYER_LOOK = "player";
// palette INK (#181425)
const BG: [number, number, number] = [0.094, 0.078, 0.145];

export class Game {
  readonly player: Player;
  private drawables: Drawable[] = [];
  private mouse: { x: number; y: number } | null = null;
  private hovered: Interactable | null = null;
  private marker: { x: number; y: number; t: number } | null = null;
  private openContainer: ObjectInstance | null = null;

  private hud: Hud;
  private tooltip: Tooltip;
  private menu: ContextMenu;
  private playerPanel: InventoryPanel;
  private lootPanel: InventoryPanel;

  constructor(
    private renderer: Renderer,
    private atlas: Atlas,
    private camera: Camera,
    readonly world: World,
    private canvas: HTMLCanvasElement,
    uiRoot: HTMLElement,
  ) {
    this.player = new Player(world.data.spawn);
    const [sx, sy] = this.playerScreen();
    camera.x = sx;
    camera.y = sy;

    this.tooltip = new Tooltip(uiRoot);
    this.menu = new ContextMenu(uiRoot);
    this.hud = new Hud(uiRoot, () => this.togglePlayerPanel(), () => this.equip(null));
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
      rightDown: (x, y) => this.moveTo(x, y),
      rightDrag: (x, y) => this.moveTo(x, y, true),
      move: (x, y) => (this.mouse = { x, y }),
      wheel: (d) => this.camera.wheel(d),
      key: (code) => this.onKey(code),
    });
    this.hud.say("Better see what's in this house.");
  }

  // --------------------------------------------------------------- input

  private onKey(code: string): void {
    if (code === "KeyI" || code === "Tab") this.togglePlayerPanel();
    if (code === "Escape") {
      this.menu.hide();
      this.closeContainer();
      this.playerPanel.hide();
    }
  }

  private moveTo(sx: number, sy: number, quiet = false): void {
    this.menu.hide();
    const [wx, wy] = this.camera.toWorld(sx, sy);
    const t = screenToTile(wx, wy);
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

  private onLeftClick(sx: number, sy: number): void {
    this.menu.hide();
    const target = this.pick(sx, sy);
    if (target) this.approach(target);
  }

  // --------------------------------------------------------- interaction

  /** Walk next to the thing (if needed), then use it. */
  private approach(target: Interactable): void {
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
      p.walk([{ x: p.tileX, y: p.tileY }], () => this.use(target));
      return;
    }
    const path = findPath(this.world, { x: p.tileX, y: p.tileY }, tiles);
    if (!path) {
      this.hud.say("I can't get there.", 1500);
      return;
    }
    this.marker = null;
    p.walk(path, () => this.use(target));
  }

  private use(target: Interactable): void {
    const p = this.player;
    if (target.kind === "edge") {
      const e = target.edge;
      p.face(e.side === "N" ? e.x + 0.5 : e.x, e.side === "N" ? e.y : e.y + 0.5);
      if (e.comp.door) e.state = e.state === "open" ? "closed" : "open";
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
    this.openContainer = null;
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

  private pick(sx: number, sy: number): Interactable | null {
    const [wx, wy] = this.camera.toWorld(sx, sy);
    for (let i = this.drawables.length - 1; i >= 0; i--) {
      const d = this.drawables[i];
      if (!d.target) continue;
      if (this.atlas.hit(d.sprite, wx - (d.x - d.sprite.ax), wy - (d.y - d.sprite.ay))) return d.target;
    }
    return null;
  }

  private targetName(t: Interactable): string {
    if (t.kind === "edge") return t.edge.comp.name;
    return t.obj.comp.container?.label && t.obj.comp.container.label !== t.obj.comp.name
      ? `${t.obj.comp.name} — ${t.obj.comp.container.label}`
      : t.obj.comp.name;
  }

  // ---------------------------------------------------------- simulation

  private playerScreen(): [number, number] {
    return [isoX(this.player.x, this.player.y), isoY(this.player.x, this.player.y)];
  }

  update(dt: number): void {
    const p = this.player;
    p.update(dt, this.world);
    const [px, py] = this.playerScreen();
    this.camera.follow(px, py - 30, dt);
    if (this.marker) {
      this.marker.t += dt;
      if (!p.moving && this.marker.t > 0.3) this.marker = null;
    }

    // walked away from the open container
    if (this.openContainer && !p.moving) {
      const near = this.world.interactTiles({ kind: "object", obj: this.openContainer }).some((t) => t.x === p.tileX && t.y === p.tileY);
      if (!near) this.closeContainer();
    } else if (this.openContainer && p.moving) {
      const o = this.openContainer;
      const d = Math.max(Math.abs(p.x - (o.x + o.wx / 2)) - o.wx / 2, Math.abs(p.y - (o.y + o.wy / 2)) - o.wy / 2);
      if (d > 1.6) this.closeContainer();
    }

    this.hud.setSatiety(p.satiety);
    const [hx, hy] = this.camera.toScreen(px, py - 92);
    this.hud.placeHalo(hx, hy);

    this.buildDrawables(dt);
    this.hovered = this.mouse ? this.pick(this.mouse.x, this.mouse.y) : null;
    this.canvas.style.cursor = this.hovered ? "pointer" : "default";
    this.hud.hover(this.hovered ? this.targetName(this.hovered) : null, this.mouse?.x ?? 0, this.mouse?.y ?? 0);
  }

  private buildDrawables(dt: number): void {
    const { world, atlas, player } = this;
    const list: Drawable[] = [];
    const b = this.camera.bounds();
    const visible = (x: number, y: number, s: Sprite) =>
      x - s.ax < b.x1 && x - s.ax + s.w > b.x0 && y - s.ay < b.y1 && y - s.ay + s.h > b.y0;

    for (const e of world.edges.values()) {
      const s = atlas.get(edgeKey(e.comp.id, e.side, e.state));
      const x = isoX(e.x, e.y);
      const y = isoY(e.x, e.y);
      if (!visible(x, y, s)) continue;
      list.push({
        key: (e.x + e.y) * 10 + (e.side === "N" ? 1 : 1.05),
        sprite: s, x, y,
        target: e.comp.door ? { kind: "edge", edge: e } : undefined,
        fader: e,
        occludes: e.comp.height > 40,
      });
    }
    for (const o of world.objects) {
      const s = atlas.get(objectKey(o.comp.id, o.facing, o.state));
      const x = isoX(o.x, o.y);
      const y = isoY(o.x, o.y);
      if (!visible(x, y, s)) continue;
      const layer = o.comp.layer ?? 2;
      list.push({
        // flat decals (rugs) go right after the floor
        key: layer < 1 ? -1 : (o.x + o.wx - 1 + o.y + o.wy - 1) * 10 + layer,
        sprite: s, x, y,
        target: o.comp.container ? { kind: "object", obj: o } : undefined,
        fader: o,
        occludes: o.comp.occludes ?? o.comp.height > 50,
      });
    }

    const ps = atlas.get(charKey(PLAYER_LOOK, player.dir, player.animFrame()));
    const [px, py] = this.playerScreen();
    const playerKey = (player.tileX + player.tileY) * 10 + 3;
    list.push({ key: playerKey, sprite: ps, x: px, y: py, occludes: false });
    list.sort((a, b) => a.key - b.key);

    // fade tall things whose pixels actually cover the player's body
    const probes: [number, number][] = [[0, -72], [0, -50], [0, -28], [-9, -44], [9, -44], [0, -8]];
    const k = 1 - Math.exp(-dt * 10);
    for (const d of list) {
      if (!d.fader) continue;
      let target = 1;
      if (d.occludes && d.key > playerKey) {
        const s = d.sprite;
        const x0 = d.x - s.ax;
        const y0 = d.y - s.ay;
        if (probes.some(([dx, dy]) => atlas.hit(s, px + dx - x0, py + dy - y0))) target = 0.3;
      }
      d.fader.fade += (target - d.fader.fade) * k;
    }
    this.drawables = list;
  }

  render(dpr: number): void {
    const { renderer, atlas, world, camera } = this;
    renderer.begin();
    const b = camera.bounds(40);
    for (let ty = 0; ty < world.height; ty++)
      for (let tx = 0; tx < world.width; tx++) {
        const f = world.floors[ty * world.width + tx];
        if (!f) continue;
        const x = isoX(tx, ty);
        const y = isoY(tx, ty);
        if (x + 33 < b.x0 || x - 33 > b.x1 || y + 34 < b.y0 || y > b.y1) continue;
        renderer.draw(atlas.get(floorKey(f.id, f.variant)), x, y);
      }
    if (this.marker) {
      const m = atlas.get(MARKER_KEY);
      const pulse = 0.65 + 0.35 * Math.sin(this.marker.t * 8);
      renderer.draw(m, isoX(this.marker.x, this.marker.y), isoY(this.marker.x, this.marker.y), 1, 1, 1, pulse);
    }
    const hov = this.hovered;
    for (const d of this.drawables) {
      const a = d.fader?.fade ?? 1;
      const lit =
        hov && d.target &&
        ((hov.kind === "object" && d.target.kind === "object" && hov.obj === d.target.obj) ||
          (hov.kind === "edge" && d.target.kind === "edge" && hov.edge === d.target.edge));
      const t = lit ? 1.3 : 1;
      renderer.draw(d.sprite, d.x, d.y, t, t, t * 1.05, a);
    }
    // snap to the world pixel grid so every texel lands on a whole block of screen pixels
    const sx = Math.round(camera.x);
    const sy = Math.round(camera.y);
    renderer.end(sx, sy, camera.zoom * dpr, this.canvas.width, this.canvas.height, BG);
  }
}
