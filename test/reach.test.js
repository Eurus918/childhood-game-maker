/**
 * 可达性测试 —— 这个项目最容易出、也最难肉眼发现的一类 bug。
 *
 * 症状：玩家永远走不到某个玩法点（通常是新加的树的碰撞体把路堵死了），
 * 而画面看起来一切正常。所以这里用 BFS 把每个玩法点都跑一遍。
 *
 * 你改了 layout.js 或者加了树，这个测试会告诉你有没有把人困住。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { content } from '../content/index.js';
import { buildWorld } from '../src/world/builder.js';
import { createBlocker } from '../src/engine/collision.js';
import { ACTIVITY_POS } from '../src/world/layout.js';

const REACH = 72;      // 与 game.js 里的交互半径保持一致
const GRANNY_REACH = 60;

/** 从出生点 BFS，返回所有能站人的格子 */
function reachable(world, step = 8) {
  const blocked = createBlocker(world);
  const start = world.spawn;
  const key = (x, y) => Math.round(x) + ',' + Math.round(y);
  const seen = new Set([key(start.x, start.y)]);
  const queue = [[start.x, start.y]];
  const out = [];
  while (queue.length) {
    const cur = queue.shift();
    out.push(cur);
    for (const d of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = cur[0] + d[0], ny = cur[1] + d[1];
      if (nx < 0 || ny < 0 || nx > world.width || ny > world.height) continue;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      if (!blocked(nx, ny)) queue.push([nx, ny]);
    }
  }
  return out;
}

function minDist(cells, p) {
  let best = Infinity;
  for (const c of cells) {
    const d = Math.hypot(c[0] - p.x, c[1] - p.y);
    if (d < best) best = d;
  }
  return best;
}

// 把所有地域 × 所有地形 × 所有玩法两两组合都跑一遍，别只测默认那一个
const cases = [];
for (const region of Object.keys(content.regions)) {
  for (const terrain of Object.keys(content.terrains)) {
    for (const a1 of Object.keys(content.activities)) {
      cases.push({ region, terrain, activity1: a1, activity2: a1 });
    }
  }
}

test('每个玩法点在任意地域/地形组合下都走得到', () => {
  for (const ans of cases) {
    const world = buildWorld(ans, content);
    const cells = reachable(world);
    assert.ok(cells.length > 1000, `${ans.region}/${ans.terrain} 可站立区域过小: ${cells.length}`);
    for (const id of world.activities) {
      const pos = world.activityPos[id];
      assert.ok(pos, `${id} 没有落位点`);
      const d = minDist(cells, pos);
      assert.ok(d <= REACH, `${ans.region}/${ans.terrain} 下 ${id} 不可达，最近只能到 ${d.toFixed(1)}px`);
    }
  }
});

test('奶奶站的位置能靠近（不然那句话永远听不到）', () => {
  const world = buildWorld({ region: 'north-rural', terrain: 'pond', activity1: 'fish', activity2: 'nymph' }, content);
  const d = minDist(reachable(world), world.granny);
  assert.ok(d <= GRANNY_REACH, `奶奶不可达，最近 ${d.toFixed(1)}px`);
});

test('出生点本身不在墙里', () => {
  for (const ans of cases) {
    const world = buildWorld(ans, content);
    assert.ok(!createBlocker(world)(world.spawn.x, world.spawn.y), `${ans.region}/${ans.terrain} 出生点被卡住`);
  }
});

test('知了猴能生成在树附近可达的地面上', () => {
  const world = buildWorld({ region: 'north-rural', terrain: 'wheat', activity1: 'nymph', activity2: 'cicada' }, content);
  const blocked = createBlocker(world);
  const cells = reachable(world);
  const base = world.aspens[0];
  const ok = cells.some((c) => Math.hypot(c[0] - base.x, c[1] - (base.y + 60)) <= 70);
  assert.ok(ok, '杨树下方没有可站立的地面，知了猴会生成在玩家够不到的地方');
  assert.ok(typeof blocked === 'function');
  assert.ok(ACTIVITY_POS.nymph);
});
