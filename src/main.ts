import "./ui/style.css";
import { registerAllComponents } from "./components";
import { Atlas } from "./engine/atlas";
import { Camera } from "./engine/camera";
import { Renderer } from "./engine/renderer";
import { Game } from "./game/game";
import { registerSurvivorLooks } from "./game/survivor";
import { registerZombieLooks } from "./game/zombies";
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
  registerSurvivorLooks();
  registerZombieLooks();

  const atlas = new Atlas(renderer.device);
  renderer.setTexture(atlas.texture);
  atlas.onGrow = (texture) => renderer.setTexture(texture);
  const camera = new Camera();
  const world = new World(buildStarterMap());
  const game = new Game(renderer, atlas, camera, world, canvas, ui);
  game.load();
  // save on the way out too, not just every few seconds
  window.addEventListener("pagehide", () => game.save());
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && game.save());

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
  Object.assign(window, { game, world, zombies: game.director });
}

main();
