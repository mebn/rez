import type { ItemDef } from "./types";
import { bottle, box, can, outline, shape, vgrad } from "./icon-kit";

const food = (d: Omit<ItemDef, "category">): ItemDef => ({ ...d, category: "food" });

export const FOOD: ItemDef[] = [
  food({
    id: "canned_beans", name: "Canned Beans", weight: 0.6, nutrition: 25,
    description: "Baked beans in tomato sauce. Needs a can opener... or a screwdriver and some patience.",
    icon: (c) => can(c, "#b5603a", "#e0c27a", { text: "BEANS" }),
  }),
  food({
    id: "canned_tuna", name: "Canned Tuna", weight: 0.3, nutrition: 18,
    description: "Chunk light tuna in water.",
    icon: (c) => can(c, "#3e6a8a", "#e8e4d6", { w: 18, h: 10, text: "TUNA" }),
  }),
  food({
    id: "canned_soup", name: "Chicken Noodle Soup", weight: 0.6, nutrition: 20,
    description: "Mmm-mm. Still good, probably.",
    icon: (c) => can(c, "#b33a32", "#e8e4d6", { text: "SOUP" }),
  }),
  food({
    id: "sardines", name: "Tin of Sardines", weight: 0.3, nutrition: 14,
    description: "Little fish packed in oil. Smells exactly how you'd expect.",
    icon: (c) => {
      shape(c, vgrad(c, 4, 28, "#c7cbcb", "#8b9091"), () => c.roundRect(4, 12, 24, 12, 4));
      c.fillStyle = "#d9b44a";
      c.fillRect(7, 15, 18, 6);
      c.fillStyle = "#3e6a8a";
      c.beginPath();
      c.ellipse(16, 18, 6, 2, 0, 0, Math.PI * 2);
      c.fill();
      shape(c, "#aaa", () => c.arc(27, 12, 2.5, 0, Math.PI * 2), 0.8);
    },
  }),
  food({
    id: "dog_food", name: "Canned Dog Food", weight: 0.6, nutrition: 15, eatMessage: "That was... meaty. Don't think about it.",
    description: "It's technically food.",
    icon: (c) => can(c, "#8a6a3a", "#c94a3a", { text: "WOOF" }),
  }),
  food({
    id: "peanut_butter", name: "Peanut Butter", weight: 0.5, nutrition: 30,
    description: "Calorie dense and practically immortal.",
    icon: (c) => {
      shape(c, vgrad(c, 8, 24, "#c58a4a", "#9a6330", "#6b4422"), () => c.roundRect(8, 9, 16, 19, 3));
      shape(c, "#b5443a", () => c.rect(7.5, 5, 17, 5));
      c.fillStyle = "#e8dcb8";
      c.fillRect(9, 14, 14, 8);
      c.fillStyle = "#7a4a22";
      c.font = "bold 5px sans-serif";
      c.textAlign = "center";
      c.fillText("PB", 16, 20);
    },
  }),
  food({
    id: "bread", name: "Loaf of Bread", weight: 0.5, nutrition: 25,
    description: "Sliced white bread. A little stale.",
    icon: (c) => {
      shape(c, vgrad(c, 4, 28, "#d9a85e", "#c08a44", "#8f622c"), () => {
        c.moveTo(4, 26);
        c.lineTo(4, 14);
        c.quadraticCurveTo(4, 8, 10, 8);
        c.lineTo(22, 8);
        c.quadraticCurveTo(28, 8, 28, 14);
        c.lineTo(28, 26);
        c.closePath();
      });
      c.fillStyle = "rgba(230,220,200,0.6)";
      c.fillRect(6, 17, 20, 5);
      c.fillStyle = "#3e6a8a";
      c.fillRect(13, 17, 6, 5);
    },
  }),
  food({
    id: "cereal", name: "Box of Cereal", weight: 0.4, nutrition: 20,
    description: "Frosted Flakes-ish. Part of a balanced apocalypse.",
    icon: (c) => {
      box(c, "#d9b44a", "#a8862e", 8, 7, 14, 21, 5);
      c.fillStyle = "#b5443a";
      c.fillRect(9.5, 10, 11, 5);
      c.fillStyle = "#e8dcb8";
      c.beginPath();
      c.arc(15, 21, 3.5, 0, Math.PI * 2);
      c.fill();
    },
  }),
  food({
    id: "crisps", name: "Bag of Crisps", weight: 0.2, nutrition: 10,
    description: "Salt & vinegar. Loud to open.",
    icon: (c) => {
      shape(c, vgrad(c, 7, 25, "#4a8a5a", "#2f6a40", "#1f4a2c"), () => {
        c.moveTo(8, 6);
        c.lineTo(24, 6);
        c.quadraticCurveTo(27, 16, 24, 27);
        c.lineTo(8, 27);
        c.quadraticCurveTo(5, 16, 8, 6);
      });
      c.fillStyle = "#e0c27a";
      c.beginPath();
      c.ellipse(16, 17, 5, 4, 0.3, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.3)";
      c.fillRect(8, 7, 16, 1.5);
      c.fillRect(8, 24.5, 16, 1.5);
    },
  }),
  food({
    id: "chocolate", name: "Chocolate Bar", weight: 0.1, nutrition: 10, eatMessage: "Pure joy. For a moment, everything is fine.",
    description: "A little morale boost in a wrapper.",
    icon: (c) => {
      c.save();
      c.translate(16, 16);
      c.rotate(-0.5);
      shape(c, "#5a3520", () => c.rect(-11, -5, 22, 10));
      shape(c, "#b5443a", () => c.rect(-3, -5.5, 14.5, 11));
      c.fillStyle = "#e8dcb8";
      c.fillRect(0, -1.5, 9, 3);
      c.strokeStyle = "rgba(0,0,0,0.4)";
      c.lineWidth = 0.6;
      for (let x = -10; x < -3; x += 3.5) c.strokeRect(x, -4, 3.2, 8);
      c.restore();
    },
  }),
  food({
    id: "apple", name: "Apple", weight: 0.2, nutrition: 8,
    description: "Crisp, a bit bruised.",
    icon: (c) => {
      const g = c.createRadialGradient(12, 14, 1, 16, 18, 11);
      g.addColorStop(0, "#e86a5a");
      g.addColorStop(1, "#8a2a22");
      shape(c, g, () => {
        c.moveTo(16, 11);
        c.bezierCurveTo(22, 6, 29, 12, 26, 21);
        c.bezierCurveTo(24, 28, 19, 29, 16, 27);
        c.bezierCurveTo(13, 29, 8, 28, 6, 21);
        c.bezierCurveTo(3, 12, 10, 6, 16, 11);
      });
      shape(c, "#5a3a1f", () => c.rect(15.3, 5, 1.6, 6), 0.6);
      shape(c, "#5f8a4c", () => c.ellipse(20, 7, 4, 2, -0.4, 0, Math.PI * 2), 0.6);
      c.fillStyle = "rgba(255,255,255,0.4)";
      c.beginPath();
      c.ellipse(11, 15, 2, 3, 0.4, 0, Math.PI * 2);
      c.fill();
    },
  }),
  food({
    id: "berries", name: "Wild Berries", weight: 0.1, nutrition: 6,
    description: "Foraged from a bush. Probably not poisonous.",
    icon: (c) => {
      const pts = [[12, 18], [18, 16], [15, 22], [21, 22], [10, 24], [17, 27], [23, 18]];
      for (const [x, y] of pts) {
        shape(c, x % 3 ? "#7a2840" : "#3a2a5a", () => c.arc(x, y, 3.4, 0, Math.PI * 2), 0.8);
        c.fillStyle = "rgba(255,255,255,0.45)";
        c.fillRect(x - 1.5, y - 1.8, 1.2, 1.2);
      }
      shape(c, "#5f8a4c", () => c.ellipse(16, 10, 6, 2.5, -0.3, 0, Math.PI * 2), 0.7);
    },
  }),
  food({
    id: "milk", name: "Carton of Milk", weight: 1.0, nutrition: 10,
    description: "Smell it first. Then decide.",
    icon: (c) => {
      shape(c, "#c9c6bb", () => {
        c.moveTo(22, 11);
        c.lineTo(26, 8);
        c.lineTo(26, 25);
        c.lineTo(22, 28);
      });
      shape(c, "#efece2", () => c.rect(9, 11, 13, 17));
      shape(c, "#dcd8cc", () => {
        c.moveTo(9, 11);
        c.lineTo(13, 4);
        c.lineTo(26, 4);
        c.lineTo(26, 8);
        c.lineTo(22, 11);
      });
      c.fillStyle = "#3e6a8a";
      c.fillRect(9.5, 16, 12, 6);
      c.fillStyle = "#fff";
      c.font = "bold 4.5px sans-serif";
      c.textAlign = "center";
      c.fillText("MILK", 15.5, 20.8);
    },
  }),
  food({
    id: "cheese", name: "Wedge of Cheese", weight: 0.3, nutrition: 15,
    description: "Sharp cheddar. Very sharp, at this point.",
    icon: (c) => {
      shape(c, "#c99a2e", () => {
        c.moveTo(4, 24);
        c.lineTo(28, 24);
        c.lineTo(28, 16);
        c.lineTo(4, 24);
      });
      shape(c, "#e8c24a", () => {
        c.moveTo(4, 24);
        c.lineTo(28, 16);
        c.lineTo(22, 9);
        c.closePath();
      });
      c.fillStyle = "#c99a2e";
      for (const [x, y, r] of [[18, 15, 1.8], [22, 18, 1.2], [13, 19, 1.4]]) {
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
    },
  }),
  food({
    id: "eggs", name: "Carton of Eggs", weight: 0.6, nutrition: 20,
    description: "Half a dozen. One is cracked.",
    icon: (c) => {
      shape(c, "#a9a08a", () => c.roundRect(3, 16, 26, 10, 2));
      for (let i = 0; i < 3; i++) {
        const g = c.createRadialGradient(8 + i * 8, 13, 0.5, 9 + i * 8, 15, 5);
        g.addColorStop(0, "#fff7e6");
        g.addColorStop(1, "#d9c9a6");
        shape(c, g, () => c.ellipse(9 + i * 8, 15, 3.6, 4.5, 0, 0, Math.PI * 2), 0.8);
      }
      c.strokeStyle = "rgba(0,0,0,0.25)";
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(4, 21);
      c.lineTo(28, 21);
      c.stroke();
    },
  }),
  food({
    id: "ham", name: "Smoked Ham", weight: 1.0, nutrition: 35,
    description: "A whole ham. Someone was planning a nice dinner.",
    icon: (c) => {
      const g = c.createRadialGradient(13, 15, 1, 15, 18, 12);
      g.addColorStop(0, "#d9846a");
      g.addColorStop(1, "#8a3a2a");
      shape(c, g, () => {
        c.moveTo(6, 22);
        c.bezierCurveTo(2, 12, 12, 4, 20, 9);
        c.bezierCurveTo(26, 13, 26, 22, 20, 26);
        c.bezierCurveTo(14, 29, 9, 28, 6, 22);
      });
      shape(c, "#efe4cf", () => c.roundRect(20, 20, 9, 4, 2), 0.8);
      c.strokeStyle = "rgba(255,230,200,0.35)";
      c.lineWidth = 0.8;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(8 + i * 4, 12 + i);
        c.lineTo(14 + i * 4, 24);
        c.stroke();
      }
    },
  }),
  food({
    id: "pizza", name: "Leftover Pizza", weight: 0.3, nutrition: 15,
    description: "Cold pizza is still pizza.",
    icon: (c) => {
      shape(c, "#e0b860", () => {
        c.moveTo(16, 28);
        c.lineTo(4, 7);
        c.quadraticCurveTo(16, 2, 28, 7);
        c.closePath();
      });
      shape(c, "#b5713a", () => {
        c.moveTo(4, 7);
        c.quadraticCurveTo(16, 2, 28, 7);
        c.lineTo(27, 9);
        c.quadraticCurveTo(16, 5, 5, 9);
        c.closePath();
      }, 0.7);
      c.fillStyle = "#a8322a";
      for (const [x, y] of [[12, 12], [19, 11], [16, 18], [14, 23]]) {
        c.beginPath();
        c.arc(x, y, 2, 0, Math.PI * 2);
        c.fill();
      }
    },
  }),
  food({
    id: "yogurt", name: "Expired Yogurt", weight: 0.2, nutrition: 5, eatMessage: "Fizzy. Yogurt shouldn't be fizzy.",
    description: "Best before... a while ago.",
    icon: (c) => {
      shape(c, vgrad(c, 9, 23, "#f0ece0", "#d0ccc0", "#a9a598"), () => {
        c.moveTo(9, 10);
        c.lineTo(23, 10);
        c.lineTo(21, 27);
        c.lineTo(11, 27);
        c.closePath();
      });
      shape(c, "#c9b2d6", () => c.ellipse(16, 10, 7.5, 2.5, 0, 0, Math.PI * 2), 0.8);
      c.fillStyle = "#7a5a9a";
      c.fillRect(11, 16, 10, 5);
      c.fillStyle = "#6f8f3a";
      c.beginPath();
      c.arc(19, 9.5, 1.6, 0, Math.PI * 2);
      c.fill();
    },
  }),
  food({
    id: "frozen_peas", name: "Frozen Peas", weight: 0.4, nutrition: 10,
    description: "Thawed and refrozen several times. Also works as an ice pack.",
    icon: (c) => {
      shape(c, vgrad(c, 6, 26, "#5f9a5a", "#3f7a3a", "#2a5a2a"), () => c.roundRect(6, 6, 20, 22, 3));
      for (const [x, y] of [[11, 17], [15, 15], [19, 18], [13, 21], [18, 23], [21, 14]]) {
        shape(c, "#8bd06a", () => c.arc(x, y, 2.2, 0, Math.PI * 2), 0.6);
      }
      c.fillStyle = "#e8e4d6";
      c.fillRect(8, 8, 16, 3);
    },
  }),
  food({
    id: "soda", name: "Can of Pop", weight: 0.3, nutrition: 4,
    description: "Warm cola. Sugar is sugar.",
    icon: (c) => can(c, "#a8322a", "#f0e8d8", { w: 12, h: 20 }),
  }),
  food({
    id: "water", name: "Bottle of Water", weight: 0.6, nutrition: 0, eatMessage: "Clean water. Better than anything else right now.",
    description: "Precious, clean drinking water.",
    icon: (c) => bottle(c, "rgba(170,210,230,0.75)", "#3e6a8a", "rgba(120,180,220,0.5)", "#3e6a8a"),
  }),
  food({
    id: "hot_sauce", name: "Hot Sauce", weight: 0.2, nutrition: 1, eatMessage: "WHY DID YOU DRINK THAT.",
    description: "Makes anything edible. Or at least distracting.",
    icon: (c) => {
      bottle(c, "#b8322a", "#e8e4d6", undefined, "#e0c27a");
    },
  }),
  food({
    id: "pickles", name: "Jar of Pickles", weight: 0.8, nutrition: 10,
    description: "Crunchy, salty, and will outlive us all.",
    icon: (c) => {
      shape(c, "rgba(190,210,160,0.8)", () => c.roundRect(8, 9, 16, 19, 4));
      c.fillStyle = "#5a7a2a";
      for (const x of [11, 15.5, 20]) {
        c.beginPath();
        c.roundRect(x - 2, 12, 4, 14, 2);
        c.fill();
      }
      c.fillStyle = "rgba(255,255,255,0.3)";
      c.fillRect(9.5, 11, 1.5, 15);
      shape(c, "#c9a95a", () => c.rect(8.5, 5, 15, 4.5));
      outline(c, 0.5);
    },
  }),
];
