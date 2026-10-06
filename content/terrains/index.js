import pond from './pond.js';
import river from './river.js';
import wheat from './wheat.js';
import orchard from './orchard.js';

const list = [pond, river, wheat, orchard];

export const terrainList = list;
export const terrains = Object.fromEntries(list.map((t) => [t.id, t]));
