import type { ItemDef } from "./types";
import { box, outline, shape, vgrad } from "./icon-kit";

function ammoBox(c: CanvasRenderingContext2D, color: string, label: string, roundColor: string): void {
  box(c, color, "#3a3a32", 6, 12, 18, 14, 4);
  c.fillStyle = "#e8e4d6";
  c.font = "bold 5px sans-serif";
  c.textAlign = "center";
  c.fillText(label, 15, 21);
  for (let i = 0; i < 3; i++) {
    shape(c, roundColor, () => c.roundRect(9 + i * 5, 4, 3, 8, 1.4), 0.6);
  }
}

export const MISC: ItemDef[] = [
  { id: "ammo_9mm", name: "Box of 9mm Rounds", category: "ammo", weight: 0.3,
    description: "Fifty rounds of 9mm.", icon: (c) => ammoBox(c, "#5a6a3a", "9MM", "#c9a95a") },
  { id: "ammo_38", name: "Box of .38 Rounds", category: "ammo", weight: 0.3,
    description: "Revolver cartridges.", icon: (c) => ammoBox(c, "#6a3a3a", ".38", "#c9a95a") },
  { id: "ammo_308", name: "Box of .308 Rounds", category: "ammo", weight: 0.4,
    description: "Rifle cartridges. Big ones.", icon: (c) => ammoBox(c, "#3a4a5a", ".308", "#d9b46a") },
  { id: "shells", name: "Box of Shotgun Shells", category: "ammo", weight: 0.4,
    description: "12 gauge buckshot.", icon: (c) => ammoBox(c, "#8a2a22", "12GA", "#b5443a") },
  { id: "flares", name: "Signal Flares", category: "ammo", weight: 0.2,
    description: "Two flare cartridges.",
    icon: (c) => {
      for (const x of [11, 19]) {
        shape(c, "#e0702a", () => c.roundRect(x - 3, 8, 6, 18, 2));
        shape(c, "#c9a95a", () => c.rect(x - 3, 22, 6, 4), 0.6);
      }
    } },
  { id: "nails", name: "Box of Nails", category: "ammo", weight: 0.3,
    description: "Nail gun ammo. Also for, you know, carpentry.",
    icon: (c) => {
      box(c, "#8a6a3a", "#5a4428", 6, 12, 18, 14, 4);
      c.strokeStyle = "#9da1a3";
      c.lineWidth = 1.1;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(9 + i * 4, 3);
        c.lineTo(9 + i * 4, 14);
        c.stroke();
        c.fillStyle = "#9da1a3";
        c.fillRect(7.6 + i * 4, 2.5, 2.8, 1.2);
      }
    } },
  { id: "bandage", name: "Bandage", category: "medical", weight: 0.1,
    description: "Clean cotton bandage.",
    icon: (c) => {
      shape(c, vgrad(c, 6, 26, "#f4f0e4", "#d9d4c4", "#a9a598"), () => c.roundRect(6, 9, 20, 15, 7));
      c.strokeStyle = "rgba(0,0,0,0.15)";
      for (let x = 10; x < 24; x += 3) {
        c.beginPath();
        c.moveTo(x, 9);
        c.lineTo(x, 24);
        c.stroke();
      }
      shape(c, "#f4f0e4", () => c.rect(20, 20, 9, 6), 0.8);
    } },
  { id: "painkillers", name: "Painkillers", category: "medical", weight: 0.1,
    description: "Takes the edge off.",
    icon: (c) => {
      shape(c, vgrad(c, 10, 22, "#e0702a", "#c95a20", "#8a3a10"), () => c.roundRect(10, 10, 12, 18, 2));
      shape(c, "#f4f0e4", () => c.rect(9, 5, 14, 5.5));
      c.fillStyle = "#f4f0e4";
      c.fillRect(11, 15, 10, 7);
      c.fillStyle = "#b5443a";
      c.fillRect(14.5, 16, 3, 5);
      c.fillRect(13, 17.5, 6, 2);
    } },
  { id: "toilet_paper", name: "Toilet Paper", category: "tool", weight: 0.2,
    description: "Worth more than gold in the first week.",
    icon: (c) => {
      shape(c, vgrad(c, 8, 24, "#ffffff", "#e8e4d6", "#b9b5a8"), () => {
        c.moveTo(8, 8);
        c.lineTo(8, 24);
        c.ellipse(16, 24, 8, 3, 0, Math.PI, 0, true);
        c.lineTo(24, 8);
      });
      shape(c, "#f4f0e4", () => c.ellipse(16, 8, 8, 3, 0, 0, Math.PI * 2));
      shape(c, "#a9a598", () => c.ellipse(16, 8, 2.5, 1, 0, 0, Math.PI * 2), 0.6);
    } },
  { id: "duct_tape", name: "Duct Tape", category: "tool", weight: 0.3,
    description: "Fixes everything except the apocalypse.",
    icon: (c) => {
      const g = c.createRadialGradient(13, 13, 1, 16, 16, 12);
      g.addColorStop(0, "#c9cccb");
      g.addColorStop(1, "#7c8284");
      shape(c, g, () => {
        c.arc(16, 16, 11, 0, Math.PI * 2);
        c.moveTo(21, 16);
        c.arc(16, 16, 5, 0, Math.PI * 2, true);
      });
      c.strokeStyle = "rgba(25,20,15,0.85)";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(16, 16, 5, 0, Math.PI * 2);
      c.stroke();
    } },
  { id: "lighter", name: "Lighter", category: "tool", weight: 0.1,
    description: "Disposable lighter. About half full.",
    icon: (c) => {
      shape(c, vgrad(c, 11, 21, "#5a9ac9", "#3e6a8a", "#24485a"), () => c.roundRect(11, 11, 10, 17, 2));
      shape(c, "#b9bec0", () => c.rect(11, 6, 10, 5.5), 0.8);
      shape(c, "#2f2f2f", () => c.arc(18, 7, 2, 0, Math.PI * 2), 0.6);
    } },
  { id: "flashlight", name: "Flashlight", category: "tool", weight: 0.5,
    description: "Heavy-duty torch.",
    icon: (c) => {
      c.save();
      c.translate(16, 16);
      c.rotate(-Math.PI / 4);
      shape(c, vgrad(c, -3, 3, "#4a4e50", "#2f3234", "#1f2122"), () => c.roundRect(-3, -4, 6, 18, 1.5));
      shape(c, "#3a3e40", () => {
        c.moveTo(-3, -4);
        c.lineTo(-5.5, -12);
        c.lineTo(5.5, -12);
        c.lineTo(3, -4);
        c.closePath();
      });
      shape(c, "#f0e8b0", () => c.ellipse(0, -12, 5.5, 1.6, 0, 0, Math.PI * 2), 0.6);
      c.restore();
    } },
  { id: "batteries", name: "Batteries", category: "tool", weight: 0.1,
    description: "A pair of D cells.",
    icon: (c) => {
      for (const x of [11, 21]) {
        shape(c, vgrad(c, x - 4, x + 4, "#3a3a3a", "#2a2a2a"), () => c.rect(x - 4, 9, 8, 18));
        c.fillStyle = "#c9a95a";
        c.fillRect(x - 4, 9, 8, 6);
        shape(c, "#b9bec0", () => c.rect(x - 1.5, 6.5, 3, 2.5), 0.6);
      }
      outline(c, 0.1);
    } },
];
