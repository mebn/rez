# Rez

**Resident Zombie**: an isometric zombie survival game that runs in the browser.

> Early prototype. You can explore a small town, search containers, collect loot and manage hunger. The zombies haven't shown up yet.

## Features

- Isometric town with houses, a store, yards, streets and vehicles
- Pixel-art sprites, all drawn in code and snapped to a 32-colour palette (no image files)
- Containers you can search (fridges, shelves, wardrobes, crates and more), each with its own loot table
- Inventory with weight and capacity, plus an equipped-item slot
- Food, weapons and supplies, each with its own condition and stats
- Hunger status shown in the HUD
- Click-to-walk movement with pathfinding
- A batched WebGPU sprite renderer

## Controls

| Input | Action |
| --- | --- |
| Right-click | Walk (hold to steer) |
| Left-click | Open / interact |
| `I` / `Tab` | Inventory |
| Mouse wheel | Zoom |
| `Esc` | Close |

## Running

You need a browser with WebGPU: a recent Chrome or Edge, or Safari 26+.

```sh
npm install
npm run dev
```

Then open http://localhost:5173/.

Other scripts:

- `npm run build`: typecheck, then build a production bundle into `dist/`
- `npm run preview`: serve the production build
- `npm run typecheck`: run TypeScript checks only

## Project layout

```
src/
  engine/      WebGPU renderer, sprite atlas, camera, input
  art/         Drawing helpers, palette and pixelisation
  components/  Floors, furniture, structures, nature, vehicles
  items/       Item definitions, icons, loot tables
  world/       Map data, inventory, pathfinding
  maps/        Map builder and the starter town
  game/        Game loop and player
  ui/          DOM HUD, inventory panel, tooltips, context menu
```
