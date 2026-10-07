import type { ItemDef } from "./types";
import { diag, handle, outline, shape, STEEL, STEEL_DARK, vgrad, type Ctx } from "./icon-kit";

const OUTLINE_C = "rgba(25,20,15,0.85)";

const melee = (d: Omit<ItemDef, "category">): ItemDef => ({ ...d, category: "weapon" });
const gun = (d: Omit<ItemDef, "category">): ItemDef => ({ ...d, category: "firearm" });

/** Drawn vertically (head at top, handle at bottom) inside diag(), so y runs about -4..36. */
function blade(c: Ctx, top: number, bottom: number, width: number, color = STEEL, edgeRight = true): void {
  shape(c, vgrad(c, 16 - width / 2, 16 + width / 2, "#e8ecec", color, STEEL_DARK), () => {
    c.moveTo(16 - width / 2, bottom);
    c.lineTo(16 + width / 2, bottom);
    if (edgeRight) {
      c.lineTo(16 + width / 2, top + width);
      c.quadraticCurveTo(16 + width / 2, top, 16 - width / 2, top);
    } else {
      c.lineTo(16 + width / 2, top);
      c.quadraticCurveTo(16 - width / 2, top, 16 - width / 2, top + width);
    }
    c.closePath();
  });
}

export const WEAPONS: ItemDef[] = [
  melee({
    id: "sledgehammer", name: "Sledgehammer", weight: 4.5, damage: 2.4, durability: 60,
    description: "Ten pounds of steel on a stick. Knocks down walls, and anything standing between you and them.",
    icon: (c) => diag(c, () => {
      shape(c, vgrad(c, 8, 24, "#c0cbdc", "#8b9bb4", "#5a6988"), () => c.rect(8, -2, 16, 9));
      handle(c, 16, 7, 35, 3.5, "#b86f50", 2);
    }),
  }),
  melee({
    id: "glass_shard", name: "Glass Shard", weight: 0.1, damage: 0.5, durability: 3,
    description: "A jagged piece of window. Cuts both ways: you might slice your own hand.",
    icon: (c) => {
      shape(c, "rgba(192,203,220,0.9)", () => {
        c.moveTo(10, 4);
        c.lineTo(22, 10);
        c.lineTo(18, 28);
        c.lineTo(12, 20);
        c.closePath();
      });
      c.fillStyle = "#ffffff";
      c.fillRect(14, 9, 2, 7);
    },
  }),
  melee({
    id: "screwdriver", name: "Screwdriver", weight: 0.3, damage: 0.6, durability: 10,
    description: "Flathead. Surprisingly effective when stabbed through an eye socket.",
    icon: (c) => diag(c, () => {
      shape(c, STEEL, () => c.rect(15, 0, 2, 20));
      shape(c, STEEL_DARK, () => c.rect(14.5, -2, 3, 3), 0.8);
      handle(c, 16, 19, 33, 6, "#d9b44a", 3);
      c.fillStyle = "#2a2a2a";
      c.fillRect(13, 25, 6, 2);
    }),
  }),
  melee({
    id: "butter_knife", name: "Butter Knife", weight: 0.1, damage: 0.2, durability: 4,
    description: "Rounded tip. You'd have better luck spreading butter on them.",
    icon: (c) => diag(c, () => {
      shape(c, vgrad(c, 13, 19, "#eef0f0", STEEL), () => c.roundRect(13.5, 0, 5, 18, 2.5));
      handle(c, 16, 17, 33, 4.5, "#cfd3d3");
    }),
  }),
  melee({
    id: "kitchen_knife", name: "Kitchen Knife", weight: 0.3, damage: 0.8, durability: 12,
    description: "A chef's knife. Sharp and reliable, but it won't last forever.",
    icon: (c) => diag(c, () => {
      blade(c, -2, 21, 6);
      handle(c, 16, 21, 35, 5, "#2f2a26");
      c.fillStyle = "#cfd3d3";
      c.fillRect(15.4, 24, 1.2, 1.2);
      c.fillRect(15.4, 30, 1.2, 1.2);
    }),
  }),
  melee({
    id: "sharp_stick", name: "Sharpened Stick", weight: 0.6, damage: 0.5, durability: 6,
    description: "A broken branch whittled to a nasty point. Caveman chic.",
    icon: (c) => diag(c, () => {
      shape(c, vgrad(c, 13, 19, "#a7845a", "#7a5a3a", "#4a3420"), () => {
        c.moveTo(16, -4);
        c.lineTo(18.5, 6);
        c.lineTo(18, 20);
        c.lineTo(19, 26);
        c.lineTo(18, 36);
        c.lineTo(14, 36);
        c.lineTo(13.5, 24);
        c.lineTo(12.5, 18);
        c.lineTo(13.5, 6);
        c.closePath();
      });
      c.fillStyle = "#d8bc8a";
      c.beginPath();
      c.moveTo(16, -4);
      c.lineTo(18, 5);
      c.lineTo(14, 5);
      c.fill();
      shape(c, "#7a5a3a", () => {
        c.moveTo(18, 22);
        c.lineTo(23, 18);
        c.lineTo(23.5, 19);
        c.lineTo(18.5, 24);
      }, 0.6);
    }),
  }),
  melee({
    id: "broken_bottle", name: "Broken Bottle", weight: 0.3, damage: 0.5, durability: 3,
    description: "Bar-fight classic. Mind your own fingers.",
    icon: (c) => diag(c, () => {
      shape(c, vgrad(c, 10, 22, "rgba(110,160,90,0.95)", "rgba(70,120,60,0.9)", "rgba(40,80,40,0.9)"), () => {
        c.moveTo(14, 34);
        c.lineTo(18, 34);
        c.lineTo(18, 22);
        c.quadraticCurveTo(22, 19, 22, 14);
        c.lineTo(21, 4);
        c.lineTo(19, 9);
        c.lineTo(17, 1);
        c.lineTo(15, 8);
        c.lineTo(12, 3);
        c.lineTo(10, 14);
        c.quadraticCurveTo(10, 19, 14, 22);
        c.closePath();
      });
      c.fillStyle = "rgba(255,255,255,0.4)";
      c.fillRect(11.5, 11, 1.4, 9);
    }),
  }),
  melee({
    id: "frying_pan", name: "Frying Pan", weight: 1.2, damage: 1.0, durability: 25,
    description: "Cast iron. Makes a satisfying BONG.",
    icon: (c) => {
      c.save();
      c.translate(16, 16);
      c.rotate(-Math.PI / 4);
      shape(c, "#2f2f2f", () => c.roundRect(-2, 6, 4, 14, 2));
      const g = c.createRadialGradient(-2, -6, 1, 0, -4, 11);
      g.addColorStop(0, "#5a5a5a");
      g.addColorStop(1, "#1f1f1f");
      shape(c, g, () => c.arc(0, -4, 11, 0, Math.PI * 2));
      c.strokeStyle = "rgba(255,255,255,0.15)";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(0, -4, 8.5, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    },
  }),
  melee({
    id: "rolling_pin", name: "Rolling Pin", weight: 0.8, damage: 0.6, durability: 15,
    description: "For dough. And for doughheads.",
    icon: (c) => diag(c, () => {
      handle(c, 16, -3, 4, 3.5, "#a8865a");
      shape(c, vgrad(c, 11, 21, "#e0c290", "#c9a46e", "#8f6e44"), () => c.roundRect(11, 4, 10, 24, 2));
      handle(c, 16, 28, 35, 3.5, "#a8865a");
    }),
  }),
  melee({
    id: "hammer", name: "Claw Hammer", weight: 1.0, damage: 1.0, durability: 20,
    description: "Drives nails. Also skulls.",
    icon: (c) => diag(c, () => {
      handle(c, 16, 2, 35, 4, "#a8865a");
      handle(c, 16, 24, 35, 4.6, "#2f2a26", 2);
      shape(c, vgrad(c, 6, 26, "#d0d4d4", STEEL_DARK), () => {
        c.moveTo(8, 0);
        c.lineTo(20, 0);
        c.lineTo(20, -1);
        c.lineTo(24, -1);
        c.lineTo(24, 7);
        c.lineTo(20, 7);
        c.lineTo(20, 6);
        c.lineTo(12, 6);
        c.quadraticCurveTo(8, 7, 4, 10);
        c.quadraticCurveTo(6, 3, 8, 0);
      });
    }),
  }),
  melee({
    id: "crowbar", name: "Crowbar", weight: 2.0, damage: 1.3, durability: 40,
    description: "Pry bar, door opener, problem solver. Nearly indestructible.",
    icon: (c) => diag(c, () => {
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(14, 36);
      c.lineTo(16, 2);
      c.quadraticCurveTo(16, -4, 21, -3);
      c.lineTo(23, 0);
      c.strokeStyle = "rgba(25,20,15,0.85)";
      c.lineWidth = 5;
      c.stroke();
      c.strokeStyle = "#a8322a";
      c.lineWidth = 3;
      c.stroke();
      c.strokeStyle = "rgba(255,255,255,0.25)";
      c.lineWidth = 1;
      c.stroke();
    }),
  }),
  melee({
    id: "pipe_wrench", name: "Pipe Wrench", weight: 1.8, damage: 1.2, durability: 30,
    description: "Heavy, red, and very persuasive.",
    icon: (c) => diag(c, () => {
      shape(c, vgrad(c, 13, 19, "#c9443a", "#a8322a", "#7a2420"), () => c.roundRect(13.5, 8, 5, 28, 2));
      shape(c, vgrad(c, 9, 23, "#d0d4d4", STEEL_DARK), () => {
        c.moveTo(12, 9);
        c.lineTo(12, -2);
        c.lineTo(22, -2);
        c.lineTo(22, 2);
        c.lineTo(16, 2);
        c.lineTo(16, 4);
        c.lineTo(22, 4);
        c.lineTo(22, 9);
        c.closePath();
      });
      c.fillStyle = "#8a8f90";
      c.fillRect(12.5, 10, 7, 3);
    }),
  }),
  melee({
    id: "lead_pipe", name: "Lead Pipe", weight: 1.5, damage: 1.1, durability: 30,
    description: "It was the survivor, in the kitchen, with the lead pipe.",
    icon: (c) => diag(c, () => {
      shape(c, vgrad(c, 13, 19, "#9a9e9c", "#6e7270", "#4a4e4c"), () => c.rect(13.5, -2, 5, 36));
      shape(c, "#5e6260", () => c.rect(12.5, -3, 7, 4), 0.8);
      shape(c, "#5e6260", () => c.rect(12.5, 31, 7, 4), 0.8);
    }),
  }),
  melee({
    id: "baseball_bat", name: "Baseball Bat", weight: 1.5, damage: 1.2, durability: 25,
    description: "America's pastime, repurposed.",
    icon: (c) => diag(c, () => {
      shape(c, vgrad(c, 11, 21, "#e0c290", "#c9a46e", "#8f6e44"), () => {
        c.moveTo(14.8, 35);
        c.lineTo(17.2, 35);
        c.lineTo(17.6, 22);
        c.quadraticCurveTo(21, 8, 20.5, -1);
        c.quadraticCurveTo(16, -5, 11.5, -1);
        c.quadraticCurveTo(11, 8, 14.4, 22);
        c.closePath();
      });
      shape(c, "#3a3a3a", () => c.rect(14.5, 27, 3, 6), 0.6);
      shape(c, "#c9a46e", () => c.ellipse(16, 35, 3, 1.5, 0, 0, Math.PI * 2), 0.8);
    }),
  }),
  melee({
    id: "spiked_bat", name: "Nail-Studded Bat", weight: 1.7, damage: 1.6, durability: 22,
    description: "A baseball bat with a dozen nails hammered through the business end.",
    icon: (c) => diag(c, () => {
      c.strokeStyle = "#9da1a3";
      c.lineWidth = 0.9;
      for (let i = 0; i < 7; i++) {
        const y = 0 + i * 2.6;
        const s = i % 2 ? 1 : -1;
        c.beginPath();
        c.moveTo(16, y);
        c.lineTo(16 + s * 7, y - 1);
        c.stroke();
      }
      shape(c, vgrad(c, 11, 21, "#c9a46e", "#a8865a", "#6e5030"), () => {
        c.moveTo(14.8, 35);
        c.lineTo(17.2, 35);
        c.lineTo(17.6, 22);
        c.quadraticCurveTo(21, 8, 20.5, -1);
        c.quadraticCurveTo(16, -5, 11.5, -1);
        c.quadraticCurveTo(11, 8, 14.4, 22);
        c.closePath();
      });
      c.fillStyle = "#6a1a14";
      c.fillRect(13, 6, 3, 2);
      c.fillRect(17, 11, 2, 3);
      shape(c, "#3a3a3a", () => c.rect(14.5, 27, 3, 6), 0.6);
    }),
  }),
  melee({
    id: "golf_club", name: "Golf Club", weight: 1.2, damage: 1.0, durability: 15,
    description: "A 7-iron. Fore!",
    icon: (c) => diag(c, () => {
      shape(c, STEEL, () => c.rect(15.3, 2, 1.6, 30), 0.8);
      handle(c, 16, 22, 36, 3.5, "#222", 4);
      shape(c, vgrad(c, 8, 18, "#e0e4e4", STEEL_DARK), () => {
        c.moveTo(17, -1);
        c.lineTo(17, 3);
        c.lineTo(7, 5);
        c.lineTo(7, 1);
        c.closePath();
      });
    }),
  }),
  melee({
    id: "machete", name: "Machete", weight: 1.0, damage: 1.8, durability: 18,
    description: "Long, heavy blade. Clears jungle and crowds equally well.",
    icon: (c) => diag(c, () => {
      blade(c, -5, 24, 7.5, STEEL, false);
      handle(c, 16, 23, 36, 4.6, "#2f2a26", 2);
    }),
  }),
  melee({
    id: "fire_axe", name: "Fire Axe", weight: 3.0, damage: 2.2, durability: 30,
    description: "Break glass in case of emergency. This counts.",
    icon: (c) => diag(c, () => {
      handle(c, 16, -2, 36, 3.8, "#c9a46e");
      shape(c, vgrad(c, 16, 28, "#c9443a", "#a8322a"), () => {
        c.moveTo(16, -1);
        c.lineTo(23, -3);
        c.quadraticCurveTo(28, 4, 25, 12);
        c.lineTo(16, 7);
        c.closePath();
      });
      shape(c, "#d0d4d4", () => {
        c.moveTo(23, -3);
        c.quadraticCurveTo(28, 4, 25, 12);
        c.lineTo(23.5, 11);
        c.quadraticCurveTo(26, 4, 22, -2);
        c.closePath();
      }, 0.6);
      shape(c, "#7a2420", () => {
        c.moveTo(16, 0);
        c.lineTo(9, 3);
        c.lineTo(16, 6);
        c.closePath();
      });
    }),
  }),
  melee({
    id: "shovel", name: "Shovel", weight: 2.5, damage: 1.4, durability: 28,
    description: "Dig a hole, fill a hole. Circle of life.",
    icon: (c) => diag(c, () => {
      handle(c, 16, 6, 33, 3, "#a8865a");
      shape(c, "#2f2a26", () => c.roundRect(12, 31, 8, 4, 1.5), 0.8);
      shape(c, vgrad(c, 9, 23, "#a7acad", "#7c8284", "#5a5e60"), () => {
        c.moveTo(10, 8);
        c.lineTo(22, 8);
        c.lineTo(22, -2);
        c.quadraticCurveTo(16, -8, 10, -2);
        c.closePath();
      });
    }),
  }),
  melee({
    id: "tire_iron", name: "Tire Iron", weight: 1.2, damage: 1.0, durability: 30,
    description: "Found in every trunk. Loosens lug nuts and teeth.",
    icon: (c) => diag(c, () => {
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(16, 35);
      c.lineTo(16, 2);
      c.lineTo(21, -2);
      c.strokeStyle = OUTLINE_C;
      c.lineWidth = 4.4;
      c.stroke();
      c.strokeStyle = "#5a5e60";
      c.lineWidth = 2.8;
      c.stroke();
      shape(c, "#3a3e40", () => c.rect(13.8, 30, 4.4, 6), 0.8);
    }),
  }),
  melee({
    id: "garden_fork", name: "Garden Fork", weight: 2.0, damage: 1.3, durability: 20,
    description: "Four tines of pointy pitchfork-adjacent justice.",
    icon: (c) => diag(c, () => {
      handle(c, 16, 8, 34, 3, "#a8865a");
      shape(c, "#2f2a26", () => c.roundRect(12, 31, 8, 4, 1.5), 0.8);
      shape(c, STEEL_DARK, () => c.rect(10.5, 7, 11, 3), 0.8);
      for (let i = 0; i < 4; i++) {
        shape(c, STEEL, () => {
          c.moveTo(11 + i * 3.3, 7);
          c.lineTo(11 + i * 3.3, -2);
          c.lineTo(12 + i * 3.3, -5);
          c.lineTo(13 + i * 3.3, -2);
          c.lineTo(13 + i * 3.3, 7);
        }, 0.6);
      }
    }),
  }),
  gun({
    id: "nail_gun", name: "Nail Gun", weight: 2.0, damage: 0.9, durability: 30, ammo: "nails",
    description: "Battery powered. Fires nails at point-blank range. A tradesman's firearm.",
    icon: (c) => {
      shape(c, "#d9a83a", () => {
        c.moveTo(5, 9);
        c.lineTo(25, 9);
        c.lineTo(27, 13);
        c.lineTo(27, 16);
        c.lineTo(13, 16);
        c.lineTo(13, 26);
        c.lineTo(7, 26);
        c.lineTo(7, 16);
        c.lineTo(5, 15);
        c.closePath();
      });
      shape(c, "#2f2f2f", () => c.rect(5, 24, 10, 5));
      shape(c, "#5a5e60", () => c.rect(25, 12, 4, 8));
      c.fillStyle = "#2f2f2f";
      c.fillRect(9, 11, 12, 2);
    },
  }),
  gun({
    id: "pistol", name: "M9 Pistol", weight: 1.0, damage: 2.5, durability: 40, ammo: "ammo_9mm",
    description: "9mm semi-automatic. Loud. Very loud.",
    icon: (c) => {
      shape(c, vgrad(c, 0, 32, "#4a4e50", "#2f3234", "#1f2122"), () => {
        c.moveTo(3, 9);
        c.lineTo(29, 9);
        c.lineTo(29, 15);
        c.lineTo(15, 15);
        c.lineTo(14, 17);
        c.lineTo(11, 17);
        c.lineTo(12, 27);
        c.lineTo(5, 27);
        c.lineTo(6, 15);
        c.lineTo(3, 15);
        c.closePath();
      });
      c.strokeStyle = OUTLINE_C;
      c.lineWidth = 1;
      c.beginPath();
      c.arc(12, 16.5, 2.5, 0, Math.PI);
      c.stroke();
      c.fillStyle = "#6a4a30";
      c.fillRect(6.5, 18, 4.5, 7);
      c.fillStyle = "rgba(255,255,255,0.18)";
      c.fillRect(4, 10, 24, 1.2);
    },
  }),
  gun({
    id: "revolver", name: ".38 Revolver", weight: 1.0, damage: 2.8, durability: 50, ammo: "ammo_38",
    description: "Six shots. Never jams. Granddad's old sidearm.",
    icon: (c) => {
      shape(c, vgrad(c, 0, 32, "#b9bec0", "#8a8f90", "#5a5e60"), () => {
        c.moveTo(14, 10);
        c.lineTo(29, 10);
        c.lineTo(29, 13.5);
        c.lineTo(20, 13.5);
        c.lineTo(20, 17);
        c.lineTo(14, 17);
        c.closePath();
      });
      shape(c, "#7c8284", () => c.roundRect(11, 9, 9, 9, 2));
      shape(c, "#6a4a30", () => {
        c.moveTo(11, 14);
        c.lineTo(14, 14);
        c.quadraticCurveTo(12, 22, 13, 27);
        c.lineTo(6, 27);
        c.quadraticCurveTo(6, 19, 11, 14);
      });
      c.strokeStyle = OUTLINE_C;
      c.beginPath();
      c.arc(15, 18, 2.4, 0, Math.PI);
      c.stroke();
      c.fillStyle = "#5a5e60";
      c.fillRect(12, 11, 7, 1);
      c.fillRect(12, 14, 7, 1);
    },
  }),
  gun({
    id: "shotgun", name: "Pump Shotgun", weight: 3.5, damage: 4.0, durability: 40, ammo: "shells",
    description: "12 gauge. The great equaliser. Will attract every zombie in the county.",
    icon: (c) => diag(c, () => {
      shape(c, vgrad(c, 13, 19, "#5a5e60", "#3a3e40", "#24282a"), () => c.rect(14.6, -5, 2.8, 25));
      shape(c, "#3a3e40", () => c.rect(17.5, -1, 2, 16), 0.8);
      shape(c, "#8a5a34", () => c.roundRect(16.8, 2, 3.6, 8, 1));
      shape(c, "#3a3e40", () => c.rect(13.5, 18, 5, 6));
      shape(c, vgrad(c, 12, 20, "#a8704a", "#8a5a34", "#5a3a20"), () => {
        c.moveTo(14, 23);
        c.lineTo(18.5, 23);
        c.lineTo(20.5, 37);
        c.lineTo(13, 37);
        c.closePath();
      });
    }),
  }),
  gun({
    id: "hunting_rifle", name: "Hunting Rifle", weight: 3.5, damage: 4.5, durability: 45, ammo: "ammo_308",
    description: "Bolt-action .308 with a scope. Dad's deer rifle.",
    icon: (c) => diag(c, () => {
      shape(c, "#2f3234", () => c.rect(15.2, -6, 1.8, 22), 0.8);
      shape(c, vgrad(c, 10, 14, "#3a3e40", "#1f2122"), () => c.roundRect(10.2, 4, 3.6, 12, 1.5), 0.8);
      shape(c, vgrad(c, 12, 20, "#a8704a", "#8a5a34", "#5a3a20"), () => {
        c.moveTo(14.4, 8);
        c.lineTo(18, 8);
        c.lineTo(18, 22);
        c.lineTo(20.5, 37);
        c.lineTo(13, 37);
        c.lineTo(14.4, 24);
        c.closePath();
      });
      shape(c, "#5a5e60", () => c.rect(17.8, 17, 3, 1.4), 0.5);
    }),
  }),
  gun({
    id: "flare_gun", name: "Flare Gun", weight: 0.8, damage: 1.0, durability: 10, ammo: "flares",
    description: "Meant for signalling rescue. Nobody is coming. Still, it sets things on fire.",
    icon: (c) => {
      shape(c, "#e0702a", () => {
        c.moveTo(6, 9);
        c.lineTo(28, 9);
        c.lineTo(28, 17);
        c.lineTo(15, 17);
        c.lineTo(14, 27);
        c.lineTo(7, 27);
        c.lineTo(8, 17);
        c.lineTo(6, 17);
        c.closePath();
      });
      c.fillStyle = "#2f2f2f";
      c.beginPath();
      c.arc(27, 13, 2.6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.25)";
      c.fillRect(7, 10, 20, 1.4);
      outline(c, 0.5);
    },
  }),
];
