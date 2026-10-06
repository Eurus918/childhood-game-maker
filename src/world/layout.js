/**
 * 固定模板布局。
 *
 * 这是整个产品最重要的一次「收敛」：地图坐标、树的位置、碰撞全部写死，
 * 只有表层素材和文案能变。
 *
 * 代价是全世界长一个样；收益是 AI 生成的东西永远跑得起来、永远走得到。
 * 我们选后者 —— 这个产品的价值在「像不像我的童年」，不在「关卡设计」。
 *
 * ⚠️ 改这里之前先跑 `npm test`：用例里会用 BFS 检查每个玩法点是否可达。
 */

export const CANVAS = { width: 960, height: 600 };

export const LAYOUT = {
  house: { x: 70, y: 80, w: 140, h: 110 },
  pond: { x: 640, y: 395, w: 290, h: 165 },
  river: { x: 600, y: 410, w: 340, h: 120 },
  wheat: { x: 55, y: 400, w: 270, h: 160 },
  orchard: [{ x: 700, y: 135 }, { x: 812, y: 205 }, { x: 648, y: 225 }],
  aspens: [{ x: 430, y: 150 }, { x: 525, y: 215 }, { x: 355, y: 245 }]
};

/** 每种玩法在地图上的位置 —— 必须由上面的布局保证可达 */
export const ACTIVITY_POS = {
  fish: { x: 690, y: 360 },
  fruit: { x: 700, y: 196 },
  cicada: { x: 430, y: 196 },
  nymph: { x: 470, y: 300 }
};

/** 玩家出生点：家门口那条土路上 */
export const SPAWN = { x: 250, y: 330 };

export const DEFAULT_DURATION = 150; // 一局 150 秒，够走完一个半昼夜
