import { doorGlass, doorWhite, doorWood } from "./door";
import { fencePicket, fenceWood } from "./fence";
import { makeWall, makeWindow } from "./wall";
import { WALL_STYLES } from "./wall-styles";

export const edges = [
  ...WALL_STYLES.map(makeWall),
  ...WALL_STYLES.map(makeWindow),
  doorWood,
  doorWhite,
  doorGlass,
  fencePicket,
  fenceWood,
];
