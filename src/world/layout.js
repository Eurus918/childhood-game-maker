/**
 * 固定模板布局（多场景版）。
 *
 * 场景坐标不是拍脑袋定的：是照着 assets/scenes/ 里那五张水彩画反推的——
 * 画里房子在哪、井在哪、门在哪，碰撞和交互点就在哪。
 * 背景图负责「像不像」，这份文件负责「走得通」。
 *
 * ⚠️ 改这里之前先跑 `npm test`：用例会 BFS 检查每个玩法点是否可达。
 */

export const CANVAS = { width: 960, height: 600 };

/* ---------- 院子：姥姥家的三间屋 ---------- */
export const YARD = {
  id: 'yard',
  name: '姥姥家的院子',
  bg: 'assets/scenes/yard.jpg',
  walk: { x: 105, y: 58, w: 740, h: 487 },
  obstacles: [
    { kind: 'rect', x: 110, y: 20, w: 390, h: 258 },
    { kind: 'rect', x: 595, y: 60, w: 135, h: 138 },
    { kind: 'rect', x: 652, y: 136, w: 122, h: 90 },
    { kind: 'rect', x: 18, y: 342, w: 142, h: 118 },
    { kind: 'rect', x: 146, y: 430, w: 88, h: 82 },
    { kind: 'circle', x: 520, y: 232, r: 26 },
    { kind: 'circle', x: 782, y: 330, r: 38 },
    { kind: 'circle', x: 650, y: 268, r: 22 }
  ],
  spawn: { x: 250, y: 330 },
  // 姥姥站在院子当院，不贴着门 —— 不然站在门口按空格只会听她喊，进不去屋
  granny: { x: 470, y: 372 },
  cicadaTrees: [{ x: 782, y: 330 }, { x: 520, y: 232 }],
  doors: [
    { to: 'indoor', x: 362, y: 296, label: '进屋' },
    { to: 'field', x: 588, y: 500, label: '出大门，去田埂上' },
    { to: 'orchard', x: 852, y: 332, label: '去果园' }
  ],
  activityPos: {
    eggs: [{ x: 90, y: 480 }],
    garden: [{ x: 330, y: 382 }],
    cicada: [{ x: 782, y: 388 }],
    nymph: [{ x: 520, y: 278 }]
  }
};

/* ---------- 屋里：土炕连着灶台 ---------- */
export const INDOOR = {
  id: 'indoor',
  name: '屋里',
  bg: 'assets/scenes/indoor.jpg',
  walk: { x: 62, y: 85, w: 836, h: 470 },
  obstacles: [
    { kind: 'rect', x: 52, y: 112, w: 405, h: 345 },
    { kind: 'rect', x: 652, y: 122, w: 228, h: 158 },
    { kind: 'rect', x: 822, y: 182, w: 125, h: 138 },
    { kind: 'circle', x: 620, y: 424, r: 86 },
    { kind: 'circle', x: 878, y: 468, r: 42 }
  ],
  spawn: { x: 480, y: 500 },
  granny: null,
  cicadaTrees: [],
  doors: [{ to: 'yard', x: 480, y: 556, label: '出去，回院子' }],
  activityPos: {
    bake: [{ x: 742, y: 312 }],
    kang: [{ x: 258, y: 478 }]
  }
};

/* ---------- 果园：山楂梨苹果桃栗子 ---------- */
export const ORCHARD = {
  id: 'orchard',
  name: '果园',
  bg: 'assets/scenes/orchard.jpg',
  walk: { x: 38, y: 42, w: 884, h: 502 },
  obstacles: [
    { kind: 'circle', x: 230, y: 162, r: 36 },
    { kind: 'circle', x: 700, y: 142, r: 36 },
    { kind: 'circle', x: 480, y: 300, r: 40 },
    { kind: 'circle', x: 762, y: 332, r: 36 },
    { kind: 'circle', x: 202, y: 432, r: 36 }
  ],
  spawn: { x: 480, y: 505 },
  granny: null,
  cicadaTrees: [],
  doors: [{ to: 'yard', x: 480, y: 556, label: '回姥姥家' }],
  activityPos: {
    pick: [
      { x: 230, y: 215, meta: { fruit: '梨' } },
      { x: 700, y: 195, meta: { fruit: '栗子' } },
      { x: 480, y: 355, meta: { fruit: '山楂' } },
      { x: 762, y: 385, meta: { fruit: '桃' } },
      { x: 202, y: 485, meta: { fruit: '苹果' } }
    ]
  }
};

/* ---------- 小溪：夏天钓鱼摸鱼 ---------- */
export const STREAM = {
  id: 'stream',
  name: '村边小溪',
  bg: 'assets/scenes/stream.jpg',
  walk: { x: 15, y: 45, w: 930, h: 540 },
  obstacles: [],
  streamLine: { ax: 960, ay: 60, bx: 100, by: 560, r: 78 },
  spawn: { x: 862, y: 502 },
  granny: null,
  cicadaTrees: [],
  doors: [{ to: 'field', x: 902, y: 528, label: '沿田埂回去' }],
  activityPos: {
    fish: [{ x: 340, y: 530 }],
    fishing: [{ x: 642, y: 382 }]
  }
};

/* ---------- 田埂：春天抓蚂蚱 ---------- */
export const FIELD = {
  id: 'field',
  name: '田埂上',
  bg: 'assets/scenes/field.jpg',
  walk: { x: 15, y: 45, w: 930, h: 540 },
  obstacles: [
    { kind: 'circle', x: 130, y: 508, r: 46 },
    { kind: 'circle', x: 822, y: 122, r: 24 }
  ],
  spawn: { x: 240, y: 420 },
  granny: null,
  cicadaTrees: [],
  doors: [
    { to: 'yard', x: 192, y: 462, label: '回姥姥家' },
    { to: 'stream', x: 906, y: 472, label: '去小溪' }
  ],
  activityPos: {
    grasshopper: [
      { x: 302, y: 298 },
      { x: 602, y: 190 },
      { x: 700, y: 452 }
    ],
    // 挖蚯蚓在湿土那头，别贴着回姥姥家的门
    worms: [{ x: 320, y: 498 }]
  }
};

export const SCENES = { yard: YARD, indoor: INDOOR, orchard: ORCHARD, stream: STREAM, field: FIELD };
export const SCENE_IDS = Object.keys(SCENES);

/* ---------- 旧版单场景兼容（南方水乡等 region 用矢量背景） ---------- */
export const LAYOUT = {
  house: { x: 70, y: 80, w: 140, h: 110 },
  pond: { x: 640, y: 395, w: 290, h: 165 },
  river: { x: 600, y: 410, w: 340, h: 120 },
  wheat: { x: 55, y: 400, w: 270, h: 160 },
  orchard: [{ x: 700, y: 135 }, { x: 812, y: 205 }, { x: 648, y: 225 }],
  aspens: [{ x: 430, y: 150 }, { x: 525, y: 215 }, { x: 355, y: 245 }]
};

export const ACTIVITY_POS = {
  fish: { x: 690, y: 360 },
  fruit: { x: 700, y: 196 },
  cicada: { x: 430, y: 196 },
  nymph: { x: 470, y: 300 }
};

export const SPAWN = { x: 250, y: 330 };
export const DEFAULT_DURATION = null; // 开放世界：不强制结算
