import { registry } from "../core/registry";
import { floors } from "./floors";
import { edges } from "./structure";
import { fridge } from "./furniture/fridge";
import { kitchenCounter } from "./furniture/kitchen-counter";
import { kitchenSink } from "./furniture/sink";
import { stove } from "./furniture/stove";
import { kitchenTable } from "./furniture/kitchen-table";
import { chair } from "./furniture/chair";
import { armchair, sofa } from "./furniture/sofa";
import { tv } from "./furniture/tv";
import { bookshelf } from "./furniture/bookshelf";
import { coffeeTable } from "./furniture/coffee-table";
import { rug } from "./furniture/rug";
import { floorLamp } from "./furniture/floor-lamp";
import { bed } from "./furniture/bed";
import { wardrobe } from "./furniture/wardrobe";
import { nightstand } from "./furniture/nightstand";
import { dresser } from "./furniture/dresser";
import { toilet } from "./furniture/toilet";
import { bathtub } from "./furniture/bathtub";
import { vanity } from "./furniture/vanity";
import { workbench } from "./furniture/workbench";
import { toolbox } from "./furniture/toolbox";
import { metalShelf } from "./furniture/metal-shelf";
import { crate } from "./furniture/crate";
import { storeShelf } from "./furniture/store-shelf";
import { drinksCooler } from "./furniture/drinks-cooler";
import { checkoutCounter } from "./furniture/checkout-counter";
import { trashCan } from "./outdoor/trash-can";
import { dumpster } from "./outdoor/dumpster";
import { mailbox } from "./outdoor/mailbox";
import { woodpile } from "./outdoor/woodpile";
import { bench } from "./outdoor/bench";
import { picnicTable } from "./outdoor/picnic-table";
import { berryBush, bush, oakTree, pineTree } from "./nature/tree";
import { car, carRed } from "./vehicles/car";
import { corpse } from "./remains/corpse";
import { gasPump } from "./auto/gas-pump";
import { tireRack } from "./auto/tire-rack";
import { partsShelf } from "./auto/parts-shelf";
import { itemPile } from "./auto/item-pile";
import { stairsWood } from "./structure/stairs";

export function registerAllComponents(): void {
  registry.register(
    ...floors,
    ...edges,
    fridge, kitchenCounter, kitchenSink, stove, kitchenTable, chair,
    sofa, armchair, tv, bookshelf, coffeeTable, rug, floorLamp,
    bed, wardrobe, nightstand, dresser,
    toilet, bathtub, vanity,
    workbench, toolbox, metalShelf, crate,
    storeShelf, drinksCooler, checkoutCounter,
    trashCan, dumpster, mailbox, woodpile, bench, picnicTable,
    oakTree, pineTree, bush, berryBush,
    car, carRed,
    corpse,
    gasPump, tireRack, partsShelf, itemPile,
    stairsWood,
  );
}
