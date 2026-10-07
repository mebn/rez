import { shade } from "../../art/color";
import type { EdgeComponent } from "../../core/types";
import { WALL_H, WALL_T } from "./wall";

const TRIM = "#d8d2c2";
const DOOR_TOP = 76;

function makeDoor(id: string, name: string, color: string, glass: boolean): EdgeComponent {
  return {
    kind: "edge",
    id,
    name,
    category: "door",
    height: WALL_H,
    states: ["closed", "open"],
    door: true,
    blocksMovement: (state) => state !== "open",
    draw(f, state) {
      const trim = { edge: shade(TRIM, 0.6) };
      const panel = (u0: number, v0: number, u1: number, v1: number) => {
        f.box(u0, v0, 0, u1, v1, DOOR_TOP - 1, color, { edge: shade(color, 0.5) });
        for (const side of ["front", "left", "right"] as const) {
          f.face(side, u0, v0, 0, u1, v1, DOOR_TOP - 1, (ctx, w, h) => {
            if (w < 6) return;
            const lit = f.light(side);
            ctx.strokeStyle = shade(color, 0.7 * lit);
            ctx.lineWidth = 0.9;
            if (glass) {
              ctx.fillStyle = "rgba(150,180,190,0.75)";
              ctx.fillRect(w * 0.18, 6, w * 0.64, h * 0.38);
              ctx.strokeRect(w * 0.18, 6, w * 0.64, h * 0.38);
            } else {
              ctx.strokeRect(w * 0.15, 6, w * 0.7, h * 0.36);
            }
            ctx.strokeRect(w * 0.15, h * 0.52, w * 0.7, h * 0.4);
            ctx.fillStyle = "#c9a95a";
            ctx.beginPath();
            ctx.arc(w * 0.85, h * 0.52, 1.3, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      };
      const parts: [number, number, number, number, number, number, string, object][] = [
        [-WALL_T, -WALL_T, 0, 4, WALL_T, WALL_H, TRIM, trim],
        [4, -WALL_T, DOOR_TOP, 28, WALL_T, WALL_H, TRIM, trim],
        [28, -WALL_T, 0, 32 + WALL_T, WALL_T, WALL_H, TRIM, trim],
      ];
      f.boxes(parts);
      if (state === "open") panel(4, 1, 6.5, 25);
      else panel(4.5, -1, 27.5, 1);
    },
  };
}

export const doorWood = makeDoor("door_wood", "Wooden Door", "#7a5636", false);
export const doorWhite = makeDoor("door_white", "Painted Door", "#bdb6a3", false);
export const doorGlass = makeDoor("door_glass", "Glass Door", "#5d6a68", true);
