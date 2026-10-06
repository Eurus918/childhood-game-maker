import catchFish from './catch-fish.js';
import pickFruit from './pick-fruit.js';
import stickCicada from './stick-cicada.js';
import digNymph from './dig-nymph.js';

const list = [catchFish, pickFruit, stickCicada, digNymph];

export const activityList = list;
export const activities = Object.fromEntries(list.map((a) => [a.id, a]));
