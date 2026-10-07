/**
 * 昼夜循环。
 *
 * 这不是装饰性功能，是核心设计：把「有些东西要等到天黑」变成玩法。
 * 知了猴只有天黑才出土，所以玩家必须在世界里待到天黑 —— 等待本身成了内容。
 */

export const CYCLE = 96; // 一轮昼夜 96 秒

export function phaseOf(gameT) {
  const c = ((gameT % CYCLE) + CYCLE) % CYCLE;
  if (c < 42) return { name: 'day', k: c / 42, label: '白天' };
  if (c < 58) return { name: 'dusk', k: (c - 42) / 16, label: '傍晚' };
  if (c < 88) return { name: 'night', k: (c - 58) / 30, label: '夜里' };
  return { name: 'dawn', k: (c - 88) / 8, label: '天亮' };
}

/** 0 = 全亮，1 = 全黑 */
export function nightAmount(gameT) {
  const p = phaseOf(gameT);
  if (p.name === 'day') return 0;
  if (p.name === 'dawn') return 0.35 * (1 - p.k);
  if (p.name === 'dusk') return 0.55 * p.k;
  return 0.55 + 0.35 * Math.min(1, p.k * 3);
}

/** 知了白天叫、傍晚也叫，天黑就不叫了 */
export function isCicadaTime(gameT) {
  const n = phaseOf(gameT).name;
  return n === 'day' || n === 'dusk';
}

/** 知了猴（蝉的幼虫）天黑后才爬出土 */
export function isNymphTime(gameT) {
  return nightAmount(gameT) > 0.35;
}

/* ---------------- 四季 ----------------
 * 这是比昼夜更大的一层"等待"：春抓蚂蚱、夏钓鱼、秋摘果、冬烤鹅蛋。
 * 每季 90 秒，一年 6 分钟；也允许玩家手动换季（有些回忆不想等）。
 */

export const SEASON_LEN = 90;

export const SEASONS = [
  { id: 'spring', label: '春天' },
  { id: 'summer', label: '夏天' },
  { id: 'autumn', label: '秋天' },
  { id: 'winter', label: '冬天' }
];

export function seasonIndex(seasonT) {
  return Math.floor((((seasonT % (SEASON_LEN * 4)) + SEASON_LEN * 4) % (SEASON_LEN * 4)) / SEASON_LEN);
}
export function seasonOf(seasonT) {
  return SEASONS[seasonIndex(seasonT)];
}
/** 把季节拨到第 idx 季 */
export function seekSeason(idx) {
  return idx * SEASON_LEN + 1;
}
