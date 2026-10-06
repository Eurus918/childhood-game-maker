/**
 * 把采访答案编译成一份可运行的世界配置。
 *
 * 输入是一堆答案（住在哪、门口有什么、爱干什么、家人怎么喊你），
 * 输出是一个 Game 能直接跑的 world 对象。中间没有任何 AI 自由发挥 —— 全是查表。
 */

import { CANVAS, LAYOUT, ACTIVITY_POS, SPAWN, DEFAULT_DURATION } from './layout.js';

export const WORLD_VERSION = 1;

/**
 * @param {object} answers  { region, terrain, activity1, activity2, call, title }
 * @param {object} content  { regions:{id:cfg}, activities:{id:cfg}, terrains:{id:cfg} }
 */
export function buildWorld(answers, content) {
  const region = content.regions[answers.region] || Object.values(content.regions)[0];
  const terrain = content.terrains[answers.terrain] || null;

  const acts = [];
  for (const a of [answers.activity1, answers.activity2]) {
    if (a && content.activities[a] && !acts.includes(a)) acts.push(a);
  }
  // 一个玩法都没有就塞默认的两个，别让世界空着
  if (!acts.length) {
    const fallback = Object.keys(content.activities);
    acts.push(fallback[0]);
    if (fallback[1]) acts.push(fallback[1]);
  }

  const world = {
    version: WORLD_VERSION,
    title: answers.title || '我的小时候',
    regionId: region.id,
    regionName: region.name,
    era: answers.era || null,

    width: CANVAS.width,
    height: CANVAS.height,
    layout: LAYOUT,
    spawn: { x: SPAWN.x, y: SPAWN.y },
    duration: DEFAULT_DURATION,

    palette: region.palette,
    houseKind: region.houseKind || 'tile',

    house: { ...LAYOUT.house },
    granny: { x: LAYOUT.house.x + 30, y: LAYOUT.house.y + LAYOUT.house.h + 34 },

    water: null,
    field: null,
    // 果树和杨树是模板的一部分：摘果子和粘知了都得有地方发生
    orchard: LAYOUT.orchard.map((p) => ({ ...p })),
    aspens: LAYOUT.aspens.map((p) => ({ ...p })),

    activities: acts,
    activityPos: {},
    activityMeta: {},

    call: answers.call || '回——来——吃——饭——',
    answers: { ...answers }
  };

  if (terrain) {
    if (terrain.kind === 'water') world.water = { type: terrain.id };
    else if (terrain.kind === 'field') world.field = { type: terrain.id };
  }
  // 选了摸鱼就必须有水，选了摘果子就必须有果树 —— 素材之间的依赖在这里兜底
  if (acts.includes('fish') && !world.water) world.water = { type: 'pond' };

  for (const id of acts) {
    world.activityPos[id] = ACTIVITY_POS[id] ? { ...ACTIVITY_POS[id] } : null;
    world.activityMeta[id] = {
      id,
      label: content.activities[id].label,
      verb: content.activities[id].verb || content.activities[id].label
    };
  }

  return world;
}

/** 空世界：采访开始前，画布上什么都不该有 */
export function emptyWorld(content) {
  const w = buildWorld({}, content);
  w.house = null;
  w.granny = null;
  w.water = null;
  w.field = null;
  w.orchard = [];
  w.aspens = [];
  w.activities = [];
  w.activityPos = {};
  w.activityMeta = {};
  w.title = '还没起名';
  return w;
}

/** 建造阶段按「答案出现了什么」决定哪些物件要播生长动画 */
export function spawnPlan(world) {
  const plan = [];
  const t = 0;
  plan.push({ kind: 'house', born: t });
  if (world.water) plan.push({ kind: 'water', born: t + 120 });
  if (world.field) plan.push({ kind: 'field', born: t + 200 });
  world.orchard.forEach((_, i) => plan.push({ kind: 'tree', born: t + 260 + i * 40 }));
  world.aspens.forEach((_, i) => plan.push({ kind: 'aspen', born: t + 320 + i * 40 }));
  world.activities.forEach((id, i) => plan.push({ kind: id, born: t + 400 + i * 120 }));
  plan.push({ kind: 'granny', born: t + 460 });
  return plan;
}
