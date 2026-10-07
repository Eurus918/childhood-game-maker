/**
 * 把采访答案编译成可运行的世界（多场景版）。
 *
 * 北方农村是「全场景」region：院子、屋里、果园、小溪、田埂五个场景全部解锁，
 * 四季玩法都在 —— 因为那是这个产品最厚的一份素材。
 * 其他 region 仍走旧版单场景（矢量背景），等它们的画和素材被贡献进来。
 */

import { CANVAS, SCENES, LAYOUT, ACTIVITY_POS, SPAWN, DEFAULT_DURATION } from './layout.js';

export const WORLD_VERSION = 2;

const LEGACY_ACTS = ['fish', 'fruit', 'cicada', 'nymph'];

function clone(o) { return JSON.parse(JSON.stringify(o)); }

/**
 * @param {object} answers { region, terrain, activity1, activity2, call, title }
 * @param {object} content  { regions, activities, terrains }
 */
export function buildWorld(answers, content, { phase = 'play' } = {}) {
  const region = content.regions[answers.region] || Object.values(content.regions)[0];
  const multi = !!region.multi;
  const seasonal = multi;   // 四季只在全场景地域里生效；单场景地域没这个维度

  const world = {
    version: WORLD_VERSION,
    title: answers.title || '我的小时候',
    regionId: region.id,
    regionName: region.name,
    era: answers.era || null,
    width: CANVAS.width,
    height: CANVAS.height,
    duration: DEFAULT_DURATION,
    palette: region.palette,
    houseKind: region.houseKind || 'tile',
    multi,
    seasonal,
    answers: { ...answers },
    call: answers.call || '回——来——吃——饭——',
    activities: [],
    activityMeta: {},
    sceneOrder: [],
    scenes: {},
    startScene: 'yard',
    startSeason: typeof region.startSeason === 'number' ? region.startSeason : 1
  };

  // 玩法集：
  //  - 建成之后（play）多场景 region 用它自己声明的清单；
  //  - 采访过程中（build）只放用户亲口挑的那两件，这样世界是「边聊边长」的。
  const picked = [answers.activity1, answers.activity2].filter((a) => a && content.activities[a]);
  let acts;
  if (multi) {
    if (phase === 'build') {
      acts = picked.filter((id, i) => picked.indexOf(id) === i);
    } else {
      acts = (region.activities || []).filter((id) => content.activities[id]);
      for (const a of picked) if (!acts.includes(a)) acts.push(a);
    }
    if (phase !== 'build' && !acts.length) acts = LEGACY_ACTS.slice();
  } else {
    acts = picked.filter((id, i) => picked.indexOf(id) === i);
    if (!acts.length) acts = LEGACY_ACTS.slice(0, 2);
  }
  world.activities = acts;

  for (const id of acts) {
    const a = content.activities[id];
    world.activityMeta[id] = { id, label: a.label, verb: a.verb || a.label, seasons: a.seasons || null };
  }

  if (multi) {
    for (const sid of Object.keys(SCENES)) {
      const scene = clone(SCENES[sid]);
      const pos = {};
      for (const id of acts) {
        if (scene.activityPos[id]) pos[id] = scene.activityPos[id];
      }
      scene.activityPos = pos;
      world.scenes[sid] = scene;
      world.sceneOrder.push(sid);
    }
  } else {
    // 旧版单场景：矢量背景
    const terrain = content.terrains[answers.terrain] || null;
    const yard = {
      id: 'yard',
      name: region.name,
      bg: null,
      walk: null,
      house: { ...LAYOUT.house },
      granny: { x: LAYOUT.house.x + 30, y: LAYOUT.house.y + LAYOUT.house.h + 34 },
      water: terrain && terrain.kind === 'water' ? { type: terrain.id } : (acts.includes('fish') ? { type: 'pond' } : null),
      field: terrain && terrain.kind === 'field' ? { type: terrain.id } : null,
      orchard: LAYOUT.orchard.map((p) => ({ ...p })),
      aspens: LAYOUT.aspens.map((p) => ({ ...p })),
      cicadaTrees: LAYOUT.aspens.map((p) => ({ ...p })),
      spawn: { x: SPAWN.x, y: SPAWN.y },
      doors: [],
      activityPos: {}
    };
    for (const id of acts) {
      if (ACTIVITY_POS[id]) yard.activityPos[id] = [{ ...ACTIVITY_POS[id] }];
    }
    world.scenes.yard = yard;
    world.sceneOrder = ['yard'];
  }

  return world;
}

/**
 * 旧存档（v1，只有一层场景）升级成多场景结构。
 * 放在这里而不是 serialize 里，是因为 Game / Renderer 都要保证拿到 scenes，
 * 免得两处各写一份兜底逻辑然后写得不一样。
 */
export function ensureScenes(world) {
  if (world && world.scenes && world.sceneOrder && world.sceneOrder.length) return world;
  const w = world || {};
  const scene = {
    id: 'yard',
    name: w.regionName || '小时候',
    bg: null,
    walk: null,
    house: w.house ? { ...w.house } : null,
    granny: w.granny ? { ...w.granny } : null,
    water: w.water || null,
    field: w.field || null,
    orchard: w.orchard ? w.orchard.map((p) => ({ ...p })) : [],
    aspens: w.aspens ? w.aspens.map((p) => ({ ...p })) : [],
    cicadaTrees: w.aspens ? w.aspens.map((p) => ({ ...p })) : [],
    spawn: w.spawn ? { ...w.spawn } : { x: SPAWN.x, y: SPAWN.y },
    doors: [],
    activityPos: {}
  };
  for (const id of w.activities || []) {
    if (w.activityPos && w.activityPos[id]) {
      const v = w.activityPos[id];
      scene.activityPos[id] = Array.isArray(v) ? v.map((p) => ({ ...p })) : [{ ...v }];
    } else if (ACTIVITY_POS[id]) {
      scene.activityPos[id] = [{ ...ACTIVITY_POS[id] }];
    }
  }
  w.multi = false;
  w.scenes = { yard: scene };
  w.sceneOrder = ['yard'];
  w.startScene = 'yard';
  return w;
}

/** 空场景：采访还没开始时用，画上只有一块地 */
export function blankScene(world) {
  return {
    id: 'blank',
    name: '',
    bg: null,
    walk: null,
    obstacles: [],
    house: null, granny: null, water: null, field: null,
    orchard: [], aspens: [], cicadaTrees: [],
    spawn: { x: (world && world.width || CANVAS.width) / 2, y: (world && world.height || CANVAS.height) / 2 },
    doors: [],
    activityPos: {}
  };
}

/** 空世界：采访开始前画布上什么都不该有 —— 连场景都还没有 */
export function emptyWorld(content) {
  const w = buildWorld({}, content, { phase: 'build' });
  w.title = '还没起名';
  w.activities = [];
  w.activityMeta = {};
  w.sceneOrder = [];
  w.scenes = {};
  return w;
}

/** 建造阶段的生长动画（只给旧版单场景用；多场景背景图本来就在） */
export function spawnPlan(world) {
  if (world.multi) return [];
  const plan = [];
  const yard = world.scenes.yard;
  const t = 0;
  if (yard.house) plan.push({ kind: 'house', born: t });
  if (yard.water) plan.push({ kind: 'water', born: t + 120 });
  if (yard.field) plan.push({ kind: 'field', born: t + 200 });
  (yard.orchard || []).forEach((_, i) => plan.push({ kind: 'tree', born: t + 260 + i * 40 }));
  (yard.aspens || []).forEach((_, i) => plan.push({ kind: 'aspen', born: t + 320 + i * 40 }));
  world.activities.forEach((id, i) => plan.push({ kind: id, born: t + 400 + i * 120 }));
  if (yard.granny) plan.push({ kind: 'granny', born: t + 460 });
  return plan;
}
