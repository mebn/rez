import { InfoPanel } from "./info-panel";

const CONTROLS: [string, string][] = [
  ["WASD / arrows", "walk"],
  ["Right-click", "walk (hold to steer), or a thing for all actions"],
  ["Left-click", "open / use, or attack a zombie"],
  ["Space", "attack nearest"],
  ["Shift (hold)", "sprint, uses stamina"],
  ["C", "stand / crouch / crawl"],
  ["E", "get in / out of a car"],
  ["WASD / arrows", "drive"],
  ["Space (driving)", "handbrake"],
  ["I", "inventory"],
  ["H", "health"],
  ["K", "skills"],
  ["Wheel", "zoom"],
  ["Esc", "close windows / settings"],
];

/** Game settings and the controls reference. Opened from the HUD or with Esc. */
export class SettingsPanel extends InfoPanel {
  constructor(root: HTMLElement, onNewGame: () => void) {
    super(root, "Settings", 360, 120, 330);
    let html = `<div class="section">Controls</div>`;
    for (const [key, what] of CONTROLS) html += `<div class="stat"><b>${key}</b><span class="muted">${what}</span></div>`;
    html += `<div class="section">Game</div><div class="muted small">Progress saves automatically in this browser.</div>`;
    html += `<div class="actions"><button data-new>Start a new game</button></div>`;
    this.render(html);
    this.body.querySelector("[data-new]")!.addEventListener("click", () => {
      if (confirm("Start over? Your current game will be lost.")) onNewGame();
    });
  }
}
