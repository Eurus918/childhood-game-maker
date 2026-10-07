/**
 * 可达性测试 —— 这个项目最容易出、也最难肉眼发现的一类 bug。
 *
 * 症状：玩家永远走不到某个玩法点（通常是新加的树的碰撞体把路堵死了），
 * 或者某一扇门站在门口却触发不了，而画面看起来一切正常。
 * 所以这里用 BFS 把每个场景的每个玩法点、每扇门都跑一遍。
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
const DOOR_REACH = 46; // 与 game.js 里的门的判定半径保持一致
const GRANNY_REACH = 60;

/** 从出生点 BFS，返回所有能站人的格子 */
function reachable(scene, world, step = 8) {
  const blocked = createBlocker(scene);
  const start = scene.spawn;
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

test('每个场景的每个玩法点都走得到', () => {
  for (const ans of cases) {
    const world = buildWorld(ans, content);
    for (const sid of world.sceneOrder) {
      const scene = world.scenes[sid];
      const cells = reachable(scene, world);
      assert.ok(cells.length > 1000, `${ans.region}/${sid} 可站立区域过小: ${cells.length}`);
      for (const id of world.activities) {
        const pts = scene.activityPos[id];
        if (!pts) continue;
        pts.forEach((pos, i) => {
          const d = minDist(cells, pos);
          assert.ok(d <= REACH, `${ans.region}/${sid} 下 ${id}[${i}] 不可达，最近只能到 ${d.toFixed(1)}px`);
        });
      }
    }
  }
});

test('每扇门都站得上去（不然这个场景就出不去了）', () => {
  for (const region of Object.keys(content.regions)) {
    const world = buildWorld({ region, terrain: 'pond', activity1: 'fish', activity2: 'cicada' }, content);
    for (const sid of world.sceneOrder) {
      const scene = world.scenes[sid];
      if (!scene.doors || !scene.doors.length) continue;
      const cells = reachable(scene, world);
      for (const d of scene.doors) {
        assert.ok(world.scenes[d.to], `${sid} 有一扇通往不存在场景的门：${d.to}`);
        const dist = minDist(cells, d);
        assert.ok(dist <= DOOR_REACH, `${sid} 的门「${d.label}」走不到，最近 ${dist.toFixed(1)}px`);
      }
    }
  }
});

test('门不能压在玩法点上（不然站在玩法点按空格会被传送走）', () => {
  const world = buildWorld({ region: 'north-rural', terrain: 'pond', activity1: 'fish', activity2: 'cicada' }, content);
  for (const sid of world.sceneOrder) {
    const scene = world.scenes[sid];
    for (const d of scene.doors || []) {
      for (const id of world.activities) {
        for (const pos of scene.activityPos[id] || []) {
          const dist = Math.hypot(d.x - pos.x, d.y - pos.y);
          assert.ok(dist > DOOR_REACH + 20, `${sid} 的门「${d.label}」压在 ${id} 上（相距 ${dist.toFixed(1)}px）`);
        }
      }
      if (scene.granny) {
        const dist = Math.hypot(d.x - scene.granny.x, d.y - scene.granny.y);
        assert.ok(dist > GRANNY_REACH, `${sid} 的门和姥姥挨太近，会抢交互`);
      }
    }
  }
});

test('姥姥站的位置能靠近（不然那句话永远听不到）', () => {
  const world = buildWorld({ region: 'north-rural', terrain: 'pond', activity1: 'fish', activity2: 'nymph' }, content);
  const yard = world.scenes.yard;
  const d = minDist(reachable(yard, world), yard.granny);
  assert.ok(d <= GRANNY_REACH, `姥姥不可达，最近 ${d.toFixed(1)}px`);
});

test('每个场景的出生点都不在墙里', () => {
  for (const ans of cases) {
    const world = buildWorld(ans, content);
    for (const sid of world.sceneOrder) {
      const scene = world.scenes[sid];
      assert.ok(!createBlocker(scene)(scene.spawn.x, scene.spawn.y), `${ans.region}/${sid} 出生点被卡住`);
    }
  }
});

test('知了猴能生成在树附近可达的地面上', () => {
  const world = buildWorld({ region: 'north-rural', terrain: 'wheat', activity1: 'nymph', activity2: 'cicada' }, content);
  const yard = world.scenes.yard;
  const cells = reachable(yard, world);
  const base = yard.cicadaTrees[0];
  const ok = cells.some((c) => Math.hypot(c[0] - base.x, c[1] - (base.y + 60)) <= 70);
  assert.ok(ok, '树下方没有可站立的地面，知了猴会生成在玩家够不到的地方');
  assert.ok(ACTIVITY_POS.nymph, '旧版单场景的落位点还在，别删');
});

test('旧版单场景世界的玩法点也能走到', () => {
  const world = buildWorld({ region: 'south-watertown', terrain: 'river', activity1: 'fish', activity2: 'cicada' }, content);
  const yard = world.scenes.yard;
  const cells = reachable(yard, world);
  for (const id of world.activities) {
    const pts = yard.activityPos[id];
    assert.ok(pts && pts.length, `旧版世界里 ${id} 没有落位点`);
    const d = minDist(cells, pts[0]);
    assert.ok(d <= REACH, `旧版世界里 ${id} 不可达，最近 ${d.toFixed(1)}px`);
  }
});
