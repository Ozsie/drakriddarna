import { Colour, Level } from "../routes/types";
import type { Hero } from "../routes/types";
import { weapons } from "../routes/items/weapons";


export const newHero = (name: string, colour: Colour): Hero => {
  weapons[0].amountInDeck--;
  return {
    name: name,
    actions: 2,
    movement: 3,
    maxMovement: 3,
    defense: 0,
    level: Level.APPRENTICE,
    health: 7,
    maxHealth: 7,
    colour: colour,
    experience: 0,
    position: {x:-1,y:-1},
    weapon: weapons[0],
    incapacitated: false,
    inventory: [],
  }
}