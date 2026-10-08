import { itemIcon } from "../items/registry";
import type { Item } from "../items/types";
import { el } from "./dom";

/** Equipped slot, panel buttons, hunger moodle, hover label and halo text. */
export class Hud {
  private slot: HTMLDivElement;
  private slotImg: HTMLImageElement;
  private slotCond: HTMLDivElement;
  private moodles: HTMLDivElement;
  private hoverLabel: HTMLDivElement;
  private halo: HTMLDivElement;
  private haloUntil = 0;
  private hpBar: HTMLDivElement;
  private staminaBar: HTMLDivElement;
  private who: HTMLDivElement;
  private hurtFx: HTMLDivElement;
  private death: HTMLDivElement;
  private deathText: HTMLParagraphElement;
  private progress: HTMLDivElement;
  private progressFill: HTMLDivElement;
  private progressLabel: HTMLSpanElement;
  private drive: HTMLDivElement;
  private driveInfo: HTMLDivElement;
  private driveEngine: HTMLButtonElement;
  private driveHotwire: HTMLButtonElement;

  constructor(
    root: HTMLElement,
    onInventory: () => void,
    onUnequip: () => void,
    onHealth: () => void,
    onSkills: () => void,
    onSettings: () => void,
    onRespawn: () => void,
    drive: { engine: () => void; hotwire: () => void; exit: () => void },
  ) {
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
    const vitals = el("div", "vitals", hud);
    this.who = el("div", "who", vitals);
    const row = el("div", "row", vitals);
    el("span", undefined, row, "HP");
    const bar = el("div", "bar", row);
    this.hpBar = el("div", undefined, bar);
    const srow = el("div", "row", vitals);
    el("span", undefined, srow, "ST");
    this.staminaBar = el("div", undefined, el("div", "bar", srow));
    this.staminaBar.style.background = "#6fb6c4";
    const btn = el("button", "hud-btn", hud, "Inventory [I]");
    btn.addEventListener("click", onInventory);
    el("button", "hud-btn", hud, "Health [H]").addEventListener("click", onHealth);
    el("button", "hud-btn", hud, "Skills [K]").addEventListener("click", onSkills);
    el("button", "hud-btn", hud, "Settings [Esc]").addEventListener("click", onSettings);

    this.progress = el("div", "progress", root);
    this.progressLabel = el("span", undefined, this.progress);
    this.progressFill = el("div", "fill", el("div", "bar", this.progress));
    this.progress.hidden = true;

    this.drive = el("div", "drive", root);
    this.drive.hidden = true;
    this.driveInfo = el("div", "info", this.drive);
    const btns = el("div", "btns", this.drive);
    this.driveEngine = el("button", undefined, btns, "Start engine");
    this.driveEngine.addEventListener("click", drive.engine);
    this.driveHotwire = el("button", undefined, btns, "Hotwire");
    this.driveHotwire.addEventListener("click", drive.hotwire);
    el("button", undefined, btns, "Get out [E]").addEventListener("click", drive.exit);

    this.hurtFx = el("div", "hurt", root);
    this.death = el("div", "death", root);
    this.death.hidden = true;
    const box = el("div", "box", this.death);
    el("h1", undefined, box, "You died");
    this.deathText = el("p", undefined, box);
    el("button", undefined, box, "Play as a new survivor").addEventListener("click", onRespawn);

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
      this.slotCond.style.background = item.condition > 0.5 ? "#5c9e4e" : item.condition > 0.25 ? "#d8b25a" : "#c8443a";
    }
  }

  setVitals(name: string, hp: number, stamina: number): void {
    this.staminaBar.style.width = `${Math.max(0, stamina)}%`;
    this.who.textContent = name;
    this.hpBar.style.width = `${Math.max(0, hp)}%`;
    this.hpBar.style.background = hp > 60 ? "#5c9e4e" : hp > 30 ? "#d8b25a" : "#c8443a";
  }

  /** Status icons on the right: [letter, label, severity 1..3]. */
  setMoodles(list: [string, string, number][]): void {
    const key = list.map((m) => m.join(":")).join("|");
    if (this.moodles.dataset.key === key) return;
    this.moodles.dataset.key = key;
    this.moodles.innerHTML = "";
    const colors = ["", "#d8c46a", "#c87a3a", "#c8443a"];
    for (const [letter, label, sev] of list) {
      const m = el("div", "moodle", this.moodles);
      const i = el("i", undefined, m, letter);
      i.style.background = colors[sev];
      el("span", undefined, m, label);
    }
  }

  /** Progress bar over the character's head for timed jobs. */
  setProgress(label: string | null, frac: number, x: number, y: number): void {
    this.progress.hidden = !label;
    if (!label) return;
    this.progressLabel.textContent = label;
    this.progressFill.style.width = `${Math.min(100, frac * 100)}%`;
    this.progress.style.left = `${x}px`;
    this.progress.style.top = `${y}px`;
  }

  /** Dashboard while driving; null hides it. */
  setDriving(d: { name: string; kmh: number; fuel: number; tank: number; condition: number; engine: boolean; canHotwire: boolean } | null): void {
    this.drive.hidden = !d;
    if (!d) return;
    const fuelPct = Math.round((d.fuel / d.tank) * 100);
    const html =
      `<b>${d.name}</b><span>${Math.round(Math.abs(d.kmh))} km/h</span>` +
      `<span class="g">Fuel <span class="bar${fuelPct < 15 ? " bad" : ""}"><span style="width:${fuelPct}%"></span></span> ${d.fuel.toFixed(1)} L</span>` +
      `<span class="g">Condition <span class="bar${d.condition < 30 ? " bad" : ""}"><span style="width:${d.condition}%"></span></span></span>`;
    if (this.driveInfo.dataset.html !== html) {
      this.driveInfo.dataset.html = html;
      this.driveInfo.innerHTML = html;
    }
    this.driveEngine.textContent = d.engine ? "Engine off" : "Start engine";
    this.driveHotwire.hidden = !d.canHotwire;
  }

  hurt(): void {
    this.hurtFx.style.transition = "none";
    this.hurtFx.style.opacity = "1";
    void this.hurtFx.offsetWidth;
    this.hurtFx.style.transition = "opacity 0.6s";
    this.hurtFx.style.opacity = "0";
  }

  showDeath(text: string): void {
    this.deathText.innerHTML = text;
    this.death.hidden = false;
  }

  hideDeath(): void {
    this.death.hidden = true;
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
