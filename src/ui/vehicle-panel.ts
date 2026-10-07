import type { Vehicle } from "../game/vehicles";
import { WHEEL_NAMES } from "../game/vehicles";
import { esc, InfoPanel } from "./info-panel";

/** One thing you can do to a car, with what it takes and how likely it is to work. */
export interface JobView {
  id: string;
  label: string;
  /** Missing tools or parts; empty when ready. */
  needs: string[];
  /** Chance and seconds, or null for jobs that can't fail. */
  chance: number | null;
  time: number;
  /** Wheel slot this belongs to, if any. */
  wheel?: number;
}

export interface VehicleActions {
  jobs(v: Vehicle): JobView[];
  run(v: Vehicle, jobId: string): void;
  hasKey(v: Vehicle): boolean;
}

/** Condition, fuel, wheels and the repair jobs for one car. */
export class VehiclePanel extends InfoPanel {
  vehicle: Vehicle | null = null;

  constructor(
    root: HTMLElement,
    private actions: VehicleActions,
  ) {
    super(root, "Vehicle", 700, 120, 360);
    this.body.classList.add("vehicle-body");
    this.body.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("button");
      if (btn?.dataset.job && this.vehicle) this.actions.run(this.vehicle, btn.dataset.job);
    });
  }

  show(v: Vehicle): void {
    this.vehicle = v;
    if (!this.open) this.toggle();
  }

  refresh(): void {
    const v = this.vehicle;
    if (!this.open || !v) return;
    const fuelPct = Math.round((v.fuel / v.type.tank) * 100);
    const cond = Math.round(v.condition);
    const t = v.type;
    let html = `<div class="who"><b>${esc(v.name)}</b><span class="muted">${this.actions.hasKey(v) ? "Have the key" : v.hotwired ? "Hotwired" : "No key"}</span></div>`;
    html += `<div class="hp-row"><span>Condition</span><div class="bar${cond > 60 ? "" : cond > 25 ? " warn" : " bad"}"><div style="width:${cond}%"></div></div><b>${cond}</b></div>`;
    html += `<div class="hp-row"><span>Fuel</span><div class="bar${fuelPct > 20 ? "" : " bad"}"><div style="width:${fuelPct}%"></div></div><b>${v.fuel.toFixed(0)}L</b></div>`;
    html += `<div class="muted small">Top speed ${Math.round(t.maxSpeed * 7.2)} km/h · ${t.tank} L tank · uses ${(t.burn * 100).toFixed(1)} L per 100 tiles</div>`;
    const jobs = this.actions.jobs(v);
    const button = (j: JobView) => {
      const odds = j.chance === null ? `${Math.round(j.time)}s` : `${Math.round(j.chance * 100)}% · ${Math.round(j.time)}s`;
      const needs = j.needs.length ? `<div class="needs">Needs ${esc(j.needs.join(", "))}</div>` : "";
      return `<span><button data-job="${j.id}" ${j.needs.length ? "disabled" : ""}>${esc(j.label)}</button> <span class="odds">${odds}</span>${needs}</span>`;
    };
    html += `<div class="section">Wheels</div>`;
    v.wheels.forEach((w, i) => {
      const state = !w ? `<span class="bad">Missing</span>` : w.condition <= 0 ? `<span class="bad">Flat</span>` : `${Math.round(w.condition)}%`;
      const job = jobs.find((j) => j.wheel === i);
      html += `<div class="wheel"><span>${WHEEL_NAMES[i]}</span><span>${state}</span>${job ? button(job) : "<span></span>"}</div>`;
    });
    const general = jobs.filter((j) => j.wheel === undefined);
    if (general.length) html += `<div class="section">Work</div>`;
    for (const j of general) html += `<div class="job">${button(j)}</div>`;
    this.render(html);
  }
}
