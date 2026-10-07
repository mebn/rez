import { itemIcon } from "../items/registry";
import type { Item } from "../items/types";
import { el } from "./dom";

/** Equipped slot, inventory button, hunger moodle, help, hover label and halo text. */
export class Hud {
  private slot: HTMLDivElement;
  private slotImg: HTMLImageElement;
  private slotCond: HTMLDivElement;
  private moodles: HTMLDivElement;
  private hoverLabel: HTMLDivElement;
  private halo: HTMLDivElement;
  private haloUntil = 0;

  constructor(root: HTMLElement, onInventory: () => void, onUnequip: () => void) {
    const help = el("div", "help", root);
    help.innerHTML =
      "<b>Right-click</b> walk (hold to steer) &nbsp;·&nbsp; <b>Left-click</b> open / interact<br>" +
      "<b>I</b> / <b>Tab</b> inventory &nbsp;·&nbsp; <b>Wheel</b> zoom &nbsp;·&nbsp; <b>Esc</b> close";

    const hud = el("div", "hud", root);
    this.slot = el("div", "slot", hud);
    this.slotImg = el("img", undefined, this.slot);
    this.slotImg.hidden = true;
    const cond = el("div", "cond", this.slot);
    this.slotCond = el("div", undefined, cond);
    el("div", "slot-label", this.slot, "Primary");
    this.slot.title = "Right-click to unequip";
    this.slot.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      onUnequip();
    });
    const btn = el("button", "hud-btn", hud, "Inventory [I]");
    btn.addEventListener("click", onInventory);

    this.moodles = el("div", "moodles", root);
    this.hoverLabel = el("div", "hover-label", root);
    this.hoverLabel.hidden = true;
    this.halo = el("div", "halo", root);
    this.halo.style.opacity = "0";
  }

  setEquipped(item: Item | null): void {
    this.slotImg.hidden = !item;
    if (item) this.slotImg.src = itemIcon(item.def);
    this.slotCond.parentElement!.hidden = item?.condition === undefined;
    if (item?.condition !== undefined) {
      this.slotCond.style.width = `${item.condition * 100}%`;
      this.slotCond.style.background = item.condition > 0.5 ? "#63c74d" : item.condition > 0.25 ? "#feae34" : "#e43b44";
    }
  }

  setSatiety(s: number): void {
    const stage = s > 50 ? 0 : s > 30 ? 1 : s > 12 ? 2 : 3;
    const key = String(stage);
    if (this.moodles.dataset.stage === key) return;
    this.moodles.dataset.stage = key;
    this.moodles.innerHTML = "";
    if (!stage) return;
    const labels = ["", "Peckish", "Hungry", "Starving"];
    const colors = ["", "#fee761", "#f77622", "#e43b44"];
    const m = el("div", "moodle", this.moodles);
    const i = el("i", undefined, m, "H");
    i.style.background = colors[stage];
    el("span", undefined, m, labels[stage]);
  }

  hover(text: string | null, x: number, y: number): void {
    this.hoverLabel.hidden = !text;
    if (!text) return;
    this.hoverLabel.textContent = text;
    this.hoverLabel.style.left = `${x}px`;
    this.hoverLabel.style.top = `${y}px`;
  }

  /** Floating text above the character's head. */
  say(text: string, ms = 2600): void {
    this.halo.textContent = text;
    this.halo.style.opacity = "1";
    this.haloUntil = performance.now() + ms;
  }

  placeHalo(x: number, y: number): void {
    this.halo.style.left = `${x}px`;
    this.halo.style.top = `${y}px`;
    if (performance.now() > this.haloUntil) this.halo.style.opacity = "0";
  }
}
