import "./ui/style.css";
import { registerAllComponents } from "./components";
import { Atlas } from "./engine/atlas";
import { Camera } from "./engine/camera";
import { Renderer } from "./engine/renderer";
import { registerLook } from "./engine/sprites";
import { Game } from "./game/game";
import { buildStarterMap } from "./maps/starter";
import { World } from "./world/world";

async function main(): Promise<void> {
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const ui = document.getElementById("ui")!;

  let renderer: Renderer;
  try {
    renderer = await Renderer.create(canvas);
  } catch (err) {
    const box = document.createElement("div");
    box.className = "fatal";
    box.innerHTML = `<div><b>WebGPU is required.</b><br>${(err as Error).message}<br>Try a recent Chrome, Edge, or Safari 26+.</div>`;
    document.body.appendChild(box);
    return;
  }

  registerAllComponents();
  registerLook("player", {
    skin: "#d9a786",
    hair: "#4a3324",
    shirt: "#6d7f8c",
    pants: "#3f4f68",
    shoes: "#2c2622",
    hairStyle: "short",
  });

  const atlas = new Atlas(renderer.device);
  renderer.setTexture(atlas.texture);
  const camera = new Camera();
  const world = new World(buildStarterMap());
  const game = new Game(renderer, atlas, camera, world, canvas, ui);

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    camera.viewW = window.innerWidth;
    camera.viewH = window.innerHeight;
  };
  resize();
  window.addEventListener("resize", resize);

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.render(Math.min(window.devicePixelRatio || 1, 2));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // handy for poking at things from the console
  Object.assign(window, { game, world });
}

main();
