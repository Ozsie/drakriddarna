import type { TurnEvent } from "../types";

export const events: TurnEvent[] = [
  {
    name: 'The Hungry Troll',
    number: 1,
    description: 'You suddenly hear a terrible roar echo in the halls behind you. It\'s the sound of a hungry troll',
    effect: 'theHungryTroll',
    used: false,
  },
  {
    name: 'The Sun Stone',
    number: 2,
    description: 'One of you kicks a pile of rubble, revealing a small, transparent crystal. It radiates a warm, yellow light turning all nearby trolls to stone.',
    effect: 'sunStone',
    used: false,
  },
  {
    name: 'The Time Portal',
    number: 3,
    description: 'You notice how everything around you seem to move slower, as if time it self had slowed down.',
    effect: 'timePortal',
    used: false,
  },
  {
    name: 'The Fountain of Youth',
    number: 4,
    description: 'You hear the weak sound of water running from a wall. When you taste it, you feel stronger than before',
    effect: 'fountainOfYouth',
    used: false,
  },
  {
    name: 'Sleeping Gas Cloud',
    number: 5,
    description: 'Noxious gas seeps through a hole in the wall, making you feel heavy and sleepy.',
    effect: 'sleepingGasCloud',
    used: false,
  },
  {
    name: 'The Lost Orch',
    number: 6,
    description: 'You hear a snarling filled with rage somewhere behind you. You quickly realise there were more monsters here than you thought.',
    effect: 'theLostOrch',
    used: false,
  },
  {
    name: 'The Dragons Breath',
    number: 7,
    description: 'The flames of your torches start to flicker and soon the dungeon is completely dark.',
    effect: 'theDragonsBreath',
    used: false,
  }
]
