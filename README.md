# Rez

**Resident Zombie**: an isometric zombie survival game that runs in the browser.

> Early prototype. Explore a small town, scavenge, fight the dead, and try to last a little longer each time.

## Features

- Isometric town with houses, a corner store, a gas station, an auto repair shop, yards and streets
- Pixel-art sprites, all drawn in code and snapped to a 32-colour palette (no image files)
- Containers you can search (fridges, shelves, wardrobes, crates and more), each with its own loot table
- Inventory with weight and capacity, plus an equipped-item slot
- Food, weapons and supplies, each with its own condition and stats
- Walking Dead style zombies: slow walkers, never runners, dangerous in numbers. They only see you in direct line of sight (walls and closed wooden doors block it; windows don't), go to where they last saw you, and hear noise (gunshots carry a long way). They bash through doors, windows and barricades and climb through broken windows and over low fences.
- A world you can take apart: smash windows (and keep the glass shards as weapons), barricade doors and windows with planks, kick in or break down doors, push furniture in front of exits, climb over fences, furniture, cars and even walls (and maybe fall), demolish walls and fences, take furniture apart for planks and scrap, chop down trees, and smash bottles into weapons
- Right-click anything for every action available on it, each with its odds and how long it takes
- A fixed zombie population that never respawns: a few roam the town, the rest are out in the wider world, and they migrate in and out across the map edges. Every few minutes a horde passes through.
- Wounds (scratches, lacerations, bites) that bleed until bandaged. A bite always infects you and is always fatal; how long you last depends on the person.
- When you die, your body gets back up as a zombie still carrying your gear. You continue as a new survivor in the same world.
- Each survivor is someone different: name, occupation, traits, attributes (Strength, Fitness, Resilience), and skills (Blunt, Blade, Firearms, First Aid, Sneaking) that improve with use
- Drivable cars of five types (hatchback, sedan, pickup, sports car, van), each with its own speed, acceleration, handling, toughness and fuel use
- Car keys are in the car, on the dead driver shambling nearby, or dropped on the ground close by. No key? Hotwire it.
- Cars need gas: fill up at the gas station pumps (limited supply), or carry a gas can and siphon from other cars
- Cars block roads and exits, and can be pushed by hand. Crashes damage the car, can knock down fences, doors and even walls, smash furniture, and at high speed throw you through the windshield.
- Crashes damage the car and its wheels. Swap wheels, repair with engine parts, or strip parts from other cars, using the right tools (lug wrench, jack, ratchet wrench, screwdriver)
- Nothing is locked behind a skill: anyone can try any job, but without experience it takes longer and can fail. Mechanics skill and books (like the Car Repair Manual) improve the odds and cut the time.
- Hunger, and status icons in the HUD for hunger, bleeding, injuries and infection symptoms
- Click-to-walk movement with pathfinding
- A batched WebGPU sprite renderer

## Controls

| Input | Action |
| --- | --- |
| Right-click | Walk (hold to steer); on a thing, show everything you can do with it |
| Left-click | The obvious action (attack, open, use a door), or the action menu |
| `Space` | Attack the nearest zombie |
| `I` / `Tab` | Inventory |
| `H` | Health |
| `S` | Skills |
| `E` | Get in / out of a car |
| `W` `A` `S` `D` / arrows | Drive |
| `Space` (in a car) | Handbrake |
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
  game/        Game loop, player, survivors and skills, health, zombie AI and migration, vehicles
  ui/          DOM HUD, inventory panel, tooltips, context menu
```
