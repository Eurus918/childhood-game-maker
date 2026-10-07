import catchFish from './catch-fish.js';
import rodFishing from './rod-fishing.js';
import digWorms from './dig-worms.js';
import pickFruit from './pick-fruit.js';
import pickOrchard from './pick-orchard.js';
import stickCicada from './stick-cicada.js';
import digNymph from './dig-nymph.js';
import collectEggs from './collect-eggs.js';
import tendGarden from './tend-garden.js';
import catchGrasshopper from './catch-grasshopper.js';
import roastEggs from './roast-eggs.js';
import warmKang from './warm-kang.js';

const list = [
  catchFish, rodFishing, digWorms,
  pickFruit, pickOrchard,
  stickCicada, digNymph,
  collectEggs, tendGarden, catchGrasshopper,
  roastEggs, warmKang
];

export const activityList = list;
export const activities = Object.fromEntries(list.map((a) => [a.id, a]));
