import { MAX_SKILL, SKILLS, xpToNext } from "../game/survivor";
import type { Player } from "../game/player";
import { esc, InfoPanel, pips } from "./info-panel";

/** Who this survivor is: occupation, traits, attributes and skill levels. Toggled with S. */
export class SkillsPanel extends InfoPanel {
  constructor(root: HTMLElement) {
    super(root, "Skills", 360, 120, 330);
  }

  refresh(p: Player): void {
    if (!this.open) return;
    const sv = p.survivor;
    const a = sv.attributes;
    let html = `<div class="who"><b>${esc(sv.name)}</b><span class="muted">${esc(sv.occupation)}</span></div>`;
    html += `<div class="traits">${sv.traits.map((t) => `<span class="trait ${t.good ? "good" : "bad"}" title="${esc(t.description)}">${esc(t.name)}</span>`).join("")}</div>`;
    html += `<div class="section">Attributes</div>`;
    html += `<div class="skill" title="Melee damage and carry weight."><span>Strength</span>${pips(a.strength)}</div>`;
    html += `<div class="skill" title="Walking speed and natural healing."><span>Fitness</span>${pips(a.fitness)}</div>`;
    html += `<div class="skill" title="Blood loss and how long you hold out against infection."><span>Resilience</span>${pips(a.resilience)}</div>`;
    html += `<div class="section">Skills</div>`;
    for (const s of SKILLS) {
      const lvl = sv.skills[s.id];
      const prog = lvl >= MAX_SKILL ? 100 : Math.floor((sv.xp[s.id] / xpToNext(lvl)) * 100);
      const book = sv.studied.has(s.id) ? ' <i class="studied" title="Read up on this">✓</i>' : "";
      html += `<div class="skill" title="${esc(s.hint)}"><span>${s.name}${book}</span>${pips(lvl)}<div class="xp"><div style="width:${prog}%"></div></div></div>`;
    }
    html += `<div class="section">Record</div>`;
    const m = Math.floor(p.alive / 60);
    html += `<div class="stat"><span>Survived</span><b>${m} min</b></div>`;
    html += `<div class="stat"><span>Zombies killed</span><b>${p.kills}</b></div>`;
    this.render(html);
  }
}
