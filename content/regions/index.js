import northRural from './north-rural.js';
import southWatertown from './south-watertown.js';
import factoryYard from './factory-yard.js';
import countyStreet from './county-street.js';

const list = [northRural, southWatertown, factoryYard, countyStreet];

export const regionList = list;
export const regions = Object.fromEntries(list.map((r) => [r.id, r]));
