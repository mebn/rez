import { shade } from "../../art/color";
import type { Frame } from "../../art/frame";
import type { ObjectComponent } from "../../core/types";

function sedan(f: Frame, paint: string): void {
  const W = f.W;
  const D = f.D;
  const glass = "#3b4a52";
  f.groundShade(0.3);
  f.p.groundShade(f.wx / 2, f.wy / 2, (f.wx + f.wy) * 16, (f.wx + f.wy) * 8, 0.25);
  // lower body between the bumpers, sorted so the far bumper stays behind
  f.boxes([
    [5, 2, 6, W - 5, 6, 13, "#8e9090"],
    [6, 4, 7, W - 6, D - 4, 26, paint, { edge: shade(paint, 0.45) }],
    [5, D - 6, 6, W - 5, D - 2, 13, "#8e9090"],
  ]);
  // cabin
  f.box(9, 28, 26, W - 9, 70, 44, paint, { edge: shade(paint, 0.45) });
  const window = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 3, 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(4, 3, (w - 8) * 0.35, h - 6);
  };
  const sideWindow = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = glass;
    ctx.fillRect(3, 2, w / 2 - 4, h - 4);
    ctx.fillRect(w / 2 + 1, 2, w / 2 - 4, h - 4);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(5, 3, 4, h - 6);
  };
  f.face("front", 9, 28, 26, W - 9, 70, 44, window);
  f.face("back", 9, 28, 26, W - 9, 70, 44, window);
  f.face("left", 9, 28, 26, W - 9, 70, 44, sideWindow);
  f.face("right", 9, 28, 26, W - 9, 70, 44, sideWindow);
  f.top(9, 28, W - 9, 70, 44, (ctx, w, d) => {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(3, 3, w - 6, d - 6);
  });
  // body details: wheels, lights, doors
  const sides = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    for (const x of [w * 0.2, w * 0.8]) {
      ctx.fillStyle = "#1f1f1f";
      ctx.beginPath();
      ctx.arc(x, h - 1, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#777";
      ctx.beginPath();
      ctx.arc(x, h - 1, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = shade(paint, 0.55);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, 2);
    ctx.lineTo(w * 0.35, h - 4);
    ctx.moveTo(w * 0.62, 2);
    ctx.lineTo(w * 0.62, h - 4);
    ctx.stroke();
    ctx.fillStyle = "#c9c4b4";
    ctx.fillRect(w * 0.38, 5, 4, 1.2);
    ctx.fillRect(w * 0.65, 5, 4, 1.2);
  };
  f.face("left", 6, 4, 7, W - 6, D - 4, 26, sides);
  f.face("right", 6, 4, 7, W - 6, D - 4, 26, sides);
  f.face("front", 6, 4, 7, W - 6, D - 4, 26, (ctx, w) => {
    ctx.fillStyle = "#e8e2c8";
    ctx.fillRect(3, 5, 8, 4);
    ctx.fillRect(w - 11, 5, 8, 4);
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(w / 2 - 10, 6, 20, 5);
  });
  f.face("back", 6, 4, 7, W - 6, D - 4, 26, (ctx, w) => {
    ctx.fillStyle = "#9b2b25";
    ctx.fillRect(3, 5, 8, 4);
    ctx.fillRect(w - 11, 5, 8, 4);
    ctx.fillStyle = "#d9d3bd";
    ctx.fillRect(w / 2 - 6, 9, 12, 5);
  });
}

export const car: ObjectComponent = {
  kind: "object",
  id: "car_sedan",
  name: "Sedan",
  category: "vehicle",
  size: [2, 3],
  height: 50,
  solid: true,
  container: { capacity: 40, loot: "car", label: "Trunk" },
  draw(f) {
    sedan(f, "#5b6f86");
  },
};

export const carRed: ObjectComponent = {
  ...car,
  id: "car_sedan_red",
  name: "Red Sedan",
  draw(f) {
    sedan(f, "#8a3a32");
  },
};
