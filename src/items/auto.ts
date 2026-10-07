import type { ItemDef } from "./types";
import { diag, handle, shape, STEEL, STEEL_DARK, vgrad } from "./icon-kit";

function book(c: CanvasRenderingContext2D, cover: string, stripe: string): void {
  shape(c, "#e8e0c8", () => c.rect(9, 5, 17, 23));
  shape(c, cover, () => c.rect(6, 4, 17, 23));
  shape(c, stripe, () => c.rect(6, 10, 17, 4), 0.6);
  c.fillStyle = "rgba(0,0,0,0.25)";
  c.fillRect(6, 4, 2, 23);
}

/** Car keys, tools, parts, building materials, fuel and skill books. */
export const AUTO: ItemDef[] = [
  { id: "plank", name: "Wooden Plank", category: "material", weight: 1.0,
    description: "A length of timber. Nail it across a door or window, or build with it.",
    icon: (c) => diag(c, () => {
      shape(c, vgrad(c, 12, 20, "#e4a672", "#b86f50", "#733e39"), () => c.rect(12, -2, 8, 38));
      c.fillStyle = "#733e39";
      c.fillRect(14, 6, 1, 6);
      c.fillRect(17, 20, 1, 8);
    }) },
  { id: "scrap_metal", name: "Scrap Metal", category: "material", weight: 1.5,
    description: "Bent sheet metal and brackets from something you took apart.",
    icon: (c) => {
      shape(c, STEEL, () => {
        c.moveTo(6, 22);
        c.lineTo(14, 8);
        c.lineTo(26, 12);
        c.lineTo(22, 26);
        c.closePath();
      });
      shape(c, STEEL_DARK, () => c.rect(10, 16, 10, 3), 0.6);
    } },
  { id: "saw", name: "Hand Saw", category: "tool", weight: 0.9,
    description: "Cuts wood. Makes taking furniture apart and felling trees go much faster.",
    icon: (c) => diag(c, () => {
      shape(c, STEEL, () => {
        c.moveTo(12, -2);
        c.lineTo(20, -2);
        c.lineTo(20, 22);
        c.lineTo(12, 22);
        c.closePath();
      });
      handle(c, 16, 21, 33, 7, "#b86f50");
    }) },

  { id: "car_key", name: "Car Key", category: "key", weight: 0.05, unique: true,
    description: "Starts one particular car around here.",
    icon: (c) => {
      c.lineWidth = 2;
      c.strokeStyle = "#8b9bb4";
      c.beginPath();
      c.arc(10, 11, 5, 0, Math.PI * 2);
      c.stroke();
      shape(c, "#c9a95a", () => c.roundRect(13, 9, 5, 7, 1.5), 0.8);
      shape(c, "#c0c4c6", () => {
        c.moveTo(16, 15);
        c.lineTo(18, 15);
        c.lineTo(26, 25);
        c.lineTo(23, 27);
        c.lineTo(21, 25);
        c.lineTo(22, 23);
        c.lineTo(20, 22);
        c.closePath();
      }, 0.8);
    } },
  { id: "lug_wrench", name: "Lug Wrench", category: "tool", weight: 1.2,
    description: "Cross-shaped wrench for wheel nuts. You need it to take a wheel off or put one on.",
    icon: (c) => {
      shape(c, STEEL, () => {
        c.save();
        c.translate(16, 16);
        c.rotate(Math.PI / 4);
        c.rect(-13, -1.6, 26, 3.2);
        c.rect(-1.6, -13, 3.2, 26);
        c.restore();
      });
    } },
  { id: "car_jack", name: "Car Jack", category: "tool", weight: 3.0,
    description: "Scissor jack. Lifts a corner of the car so a wheel can come off.",
    icon: (c) => {
      shape(c, "#be4a2f", () => c.rect(5, 23, 22, 4));
      shape(c, "#be4a2f", () => {
        c.moveTo(8, 23);
        c.lineTo(16, 14);
        c.lineTo(24, 23);
        c.lineTo(21, 23);
        c.lineTo(16, 17);
        c.lineTo(11, 23);
        c.closePath();
      });
      shape(c, "#be4a2f", () => c.rect(11, 10, 10, 4));
      shape(c, STEEL, () => c.rect(3, 15.5, 26, 2), 0.6);
    } },
  { id: "wrench", name: "Ratchet Wrench", category: "tool", weight: 0.8,
    description: "Socket wrench. Needed for engine work and pulling parts.",
    icon: (c) => diag(c, () => {
      shape(c, vgrad(c, 12, 20, "#e8ecec", STEEL, STEEL_DARK), () => c.roundRect(13, 2, 6, 9, 3));
      shape(c, STEEL_DARK, () => c.rect(14.5, 9, 3, 6));
      handle(c, 16, 14, 33, 4.5, "#2f2a26");
    }) },
  { id: "car_wheel", name: "Car Wheel", category: "part", weight: 6.0, unique: true, durability: 1,
    description: "Tire on a steel rim. Heavy.",
    icon: (c) => {
      shape(c, "#262b44", () => c.arc(16, 16, 12, 0, Math.PI * 2));
      shape(c, "#8b9bb4", () => c.arc(16, 16, 6, 0, Math.PI * 2), 0.8);
      c.fillStyle = "#3a4466";
      c.beginPath();
      c.arc(16, 16, 2, 0, Math.PI * 2);
      c.fill();
    } },
  { id: "engine_parts", name: "Engine Parts", category: "part", weight: 1.0,
    description: "Belts, hoses, filters, gaskets. What a tired engine needs.",
    icon: (c) => {
      c.save();
      c.translate(16, 16);
      shape(c, STEEL, () => {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          c.rect(Math.cos(a) * 9 - 2, Math.sin(a) * 9 - 2, 4, 4);
        }
      }, 0.6);
      shape(c, STEEL, () => c.arc(0, 0, 9, 0, Math.PI * 2));
      shape(c, "#3a4466", () => c.arc(0, 0, 3.5, 0, Math.PI * 2), 0.8);
      c.restore();
    } },
  { id: "gas_can", name: "Gas Can", category: "tool", weight: 1.0, unique: true, capacity: 10,
    description: "Ten litre jerry can. Fill it at a pump or siphon it out of a car.",
    icon: (c) => {
      shape(c, "#be4a2f", () => c.roundRect(7, 8, 18, 20, 2));
      shape(c, "#be4a2f", () => c.rect(18, 4, 4, 5), 0.8);
      c.strokeStyle = "rgba(0,0,0,0.3)";
      c.beginPath();
      c.moveTo(9, 10);
      c.lineTo(23, 26);
      c.moveTo(23, 10);
      c.lineTo(9, 26);
      c.stroke();
    } },
  { id: "book_mechanics", name: "Car Repair Manual", category: "book", weight: 0.6, teaches: "Mechanics",
    description: "A greasy Haynes-style manual. Reading it makes car work quicker and less likely to go wrong.",
    icon: (c) => book(c, "#124e89", "#feae34") },
  { id: "book_firstaid", name: "Field Medicine Handbook", category: "book", weight: 0.5, teaches: "First Aid",
    description: "Wound care for when the hospital isn't an option.",
    icon: (c) => book(c, "#e8e0c8", "#e43b44") },
  { id: "book_firearms", name: "Gun Owner's Guide", category: "book", weight: 0.5, teaches: "Firearms",
    description: "Stance, sight picture, breathing. Better aim with any gun.",
    icon: (c) => book(c, "#3e2731", "#c28569") },
  { id: "book_blunt", name: "Batting Practice", category: "book", weight: 0.5, teaches: "Blunt",
    description: "A baseball coaching book. The swing advice works on more than baseballs.",
    icon: (c) => book(c, "#3e8948", "#ffffff") },
  { id: "book_carpentry", name: "Carpentry for Beginners", category: "book", weight: 0.6, teaches: "Carpentry",
    description: "Joints, nails, load-bearing walls and how not to bring a ceiling down on yourself.",
    icon: (c) => book(c, "#b86f50", "#ead4aa") },
  { id: "book_athletics", name: "Urban Climbing", category: "book", weight: 0.4, teaches: "Athletics",
    description: "Vaults, wall runs and how to land without breaking an ankle.",
    icon: (c) => book(c, "#0099db", "#181425") },
  { id: "book_blade", name: "Knife Skills", category: "book", weight: 0.5, teaches: "Blade",
    description: "A chef's guide to knife work. Some of it carries over.",
    icon: (c) => book(c, "#733e39", "#ead4aa") },
];
