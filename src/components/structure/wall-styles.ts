import type { WallStyle } from "./wall";

function baseboard(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, height = 5): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, h - height, w, height);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(0, h - height, w, 0.7);
}

/** House exterior: painted clapboard siding over a concrete foundation. */
export const siding: WallStyle = {
  key: "siding",
  name: "Siding",
  color: "#c9bfa2",
  cap: "#57504a",
  paint(ctx, w, h) {
    ctx.fillStyle = "#c9bfa2";
    ctx.fillRect(0, 0, w, h);
    for (let y = 4; y < h - 8; y += 6) {
      ctx.fillStyle = "rgba(70,60,45,0.35)";
      ctx.fillRect(0, y, w, 0.8);
      ctx.fillStyle = "rgba(255,250,235,0.25)";
      ctx.fillRect(0, y + 0.8, w, 0.8);
    }
    ctx.fillStyle = "#6f6a61";
    ctx.fillRect(0, h - 8, w, 8);
  },
};

/** Generic interior wallpaper. */
export const wallpaper: WallStyle = {
  key: "wallpaper",
  name: "Wallpaper",
  color: "#b5a487",
  cap: "#4a4038",
  paint(ctx, w, h) {
    ctx.fillStyle = "#b5a487";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(120,90,60,0.18)";
    for (let x = 1; x < w; x += 6) ctx.fillRect(x, 0, 2, h);
    ctx.fillStyle = "rgba(255,240,210,0.15)";
    for (let x = 1; x < w; x += 6)
      for (let y = 6; y < h; y += 12) ctx.fillRect(x + 3, y, 1.4, 1.4);
    baseboard(ctx, w, h, "#5b4430");
  },
};

/** Kitchen: pale paint with a tiled backsplash band. */
export const kitchenWall: WallStyle = {
  key: "kitchen",
  name: "Kitchen",
  color: "#cdc39c",
  cap: "#4c463c",
  paint(ctx, w, h) {
    ctx.fillStyle = "#cdc39c";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#d9d6cc";
    ctx.fillRect(0, h - 58, w, 24);
    ctx.strokeStyle = "rgba(90,90,80,0.4)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, h - 58);
      ctx.lineTo(x, h - 34);
      ctx.stroke();
    }
    for (let y = h - 58; y <= h - 34; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    baseboard(ctx, w, h, "#6a5a45");
  },
};

/** Bathroom: tiled lower half, painted upper. */
export const bathroomWall: WallStyle = {
  key: "bathroom",
  name: "Bathroom",
  color: "#a7b9b8",
  cap: "#45504f",
  paint(ctx, w, h) {
    ctx.fillStyle = "#a7b9b8";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#d2dad6";
    ctx.fillRect(0, h - 44, w, 44);
    ctx.strokeStyle = "rgba(90,105,105,0.45)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, h - 44);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = h - 44; y <= h; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#7f9594";
    ctx.fillRect(0, h - 45, w, 1.4);
  },
};

/** Garage: painted cinder block. */
export const block: WallStyle = {
  key: "block",
  name: "Cinder Block",
  color: "#8e8a82",
  cap: "#4b4945",
  paint(ctx, w, h) {
    ctx.fillStyle = "#8e8a82";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(50,48,45,0.45)";
    ctx.lineWidth = 0.6;
    let row = 0;
    for (let y = h; y > 0; y -= 8, row++) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      for (let x = row % 2 ? 0 : 8; x < w; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - 8);
        ctx.stroke();
      }
    }
  },
};

/** Store exterior: red brick. */
export const brick: WallStyle = {
  key: "brick",
  name: "Brick",
  color: "#8b5240",
  cap: "#45332c",
  paint(ctx, w, h) {
    ctx.fillStyle = "#8b5240";
    ctx.fillRect(0, 0, w, h);
    let row = 0;
    for (let y = h; y > 0; y -= 4, row++) {
      for (let x = row % 2 ? -3 : 0; x < w; x += 7) {
        const t = ((x * 7 + row * 13) % 5) / 25;
        ctx.fillStyle = `rgba(${row % 3 ? 120 : 150},${60 + t * 80},50,0.35)`;
        ctx.fillRect(x + 0.4, y - 3.6, 6.2, 3.2);
      }
    }
    ctx.fillStyle = "rgba(210,200,185,0.25)";
    for (let y = h; y > 0; y -= 4) ctx.fillRect(0, y - 0.5, w, 0.5);
    ctx.fillStyle = "#5c5853";
    ctx.fillRect(0, h - 6, w, 6);
  },
};

/** Store interior: plain paint with a coloured stripe. */
export const storeWall: WallStyle = {
  key: "store",
  name: "Store",
  color: "#cbc2a8",
  cap: "#4b463e",
  paint(ctx, w, h) {
    ctx.fillStyle = "#cbc2a8";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#3f7468";
    ctx.fillRect(0, h - 50, w, 4);
    baseboard(ctx, w, h, "#3f4a46", 6);
  },
};

export const WALL_STYLES = [siding, wallpaper, kitchenWall, bathroomWall, block, brick, storeWall];
