import type { Player } from "../game/player";
import { WOUND_NAME, type Wound } from "../game/health";
import { esc, InfoPanel } from "./info-panel";

export interface HealthActions {
  bandage(w: Wound): void;
  painkillers(): void;
  /** Does the player have something to dress a wound with? */
  hasBandage(): boolean;
  hasPainkillers(): boolean;
}

function hungerText(s: number): string {
  return s > 70 ? "Full" : s > 50 ? "Fine" : s > 30 ? "Peckish" : s > 12 ? "Hungry" : s > 0 ? "Starving" : "Wasting away";
}

/** Body status: overall health, wounds and how they're doing. Toggled with H. */
export class HealthPanel extends InfoPanel {
  constructor(
    root: HTMLElement,
    private actions: HealthActions,
  ) {
    super(root, "Health", 20, 120, 320);
    this.body.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("button");
      if (!btn) return;
      if (btn.dataset.wound) {
        const w = this.player?.health.wounds.find((x) => x.id === Number(btn.dataset.wound));
        if (w) this.actions.bandage(w);
      }
      if (btn.dataset.act === "pills") this.actions.painkillers();
    });
  }

  private player: Player | null = null;

  refresh(p: Player): void {
    this.player = p;
    if (!this.open) return;
    const h = p.health;
    const hp = Math.max(0, Math.ceil(h.hp));
    const hpClass = hp > 60 ? "" : hp > 30 ? " warn" : " bad";
    const canBandage = this.actions.hasBandage();
    let html = `<div class="hp-row"><span>Health</span><div class="bar${hpClass}"><div style="width:${hp}%"></div></div><b>${hp}</b></div>`;
    html += `<div class="stat"><span>Hunger</span><b>${hungerText(p.satiety)}</b></div>`;
    html += `<div class="stat"><span>Condition</span><b class="${h.symptom ? "bad" : ""}">${h.symptom ?? (h.bleeding ? "Bleeding" : "Healthy")}</b></div>`;
    if (h.wounds.some((w) => w.kind === "bite")) html += `<div class="note bad">You've been bitten. There's no cure.</div>`;
    html += `<div class="section">Wounds</div>`;
    if (!h.wounds.length) html += `<div class="muted">No injuries.</div>`;
    for (const w of h.wounds) {
      const state = w.bandaged ? `Bandaged · ${Math.floor(w.healed * 100)}%` : w.healed < 0.5 ? "Bleeding" : "Closing";
      const btn = w.bandaged ? "" : `<button data-wound="${w.id}" ${canBandage ? "" : "disabled"}>Bandage</button>`;
      html += `<div class="wound ${w.kind}"><span>${WOUND_NAME[w.kind]}</span><span class="muted">${esc(w.part)}</span><span class="muted">${state}</span>${btn}</div>`;
    }
    if (h.wounds.some((w) => !w.bandaged) && !canBandage) html += `<div class="muted small">Find bandages or toilet paper to dress wounds.</div>`;
    if (this.actions.hasPainkillers()) html += `<div class="actions"><button data-act="pills">Take painkillers</button></div>`;
    this.render(html);
  }
}
