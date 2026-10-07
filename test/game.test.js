/**
 * 引擎冒烟测试：不开浏览器，用一个假的 canvas 把整局游戏跑一遍。
 *
 * 目的不是测画面（画面看不出来 bug），而是保证：
 * 能进游戏、能走动、能换场景、能交互、天黑会长知了猴、
 * 季节会走、走完一年会结算、按 R 能重来。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Game 依赖 window 绑键盘事件，这里给个最小替身
globalThis.window = { addEventListener() {}, AudioContext: undefined, webkitAudioContext: undefined };

const { content } = await import('../content/index.js');
const { buildWorld } = await import('../src/world/builder.js');
const { Game } = await import('../src/engine/game.js');
const { SEASON_LEN, SEASONS } = await import('../src/engine/daynight.js');

function fakeCanvas() {
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k === 'measureText') return () => ({ width: 20 });
      if (k in t) return t[k];
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  return {
    width: 960, height: 600,
    getContext: () => ctx,
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600 })
  };
}

function makeGame(answers) {
  const world = buildWorld(answers, content);
  return new Game(fakeCanvas(), world, { activities: content.activities });
}

const ANSWERS = {
  region: 'north-rural', terrain: 'pond',
  activity1: 'fish', activity2: 'nymph',
  call: '再不回来，饭就凉了！', title: '那年夏天'
};

/** 走到某个玩法所在的场景，并站在它的第一个点上 */
function standOn(g, id) {
  for (const sid of g.world.sceneOrder) {
    const pts = g.world.scenes[sid].activityPos[id];
    if (pts && pts.length) {
      g._goScene(sid, true);
      g.player.x = pts[0].x;
      g.player.y = pts[0].y;
      g._updateNear();
      return true;
    }
  }
  return false;
}

test('北方农村是五个场景，互相都有门连着', () => {
  const world = buildWorld(ANSWERS, content);
  assert.equal(world.multi, true);
  assert.deepEqual(world.sceneOrder.slice().sort(), ['field', 'indoor', 'orchard', 'stream', 'yard']);
  for (const sid of world.sceneOrder) {
    for (const d of world.scenes[sid].doors) {
      assert.ok(world.scenes[d.to], `${sid} 通往不存在的场景 ${d.to}`);
    }
  }
});

test('建造态不推进时间，进游戏才推进', () => {
  const g = makeGame(ANSWERS);
  assert.equal(g.mode, 'build');
  g.tick(16, 100);
  assert.equal(g.gameT, 0);
  g.enterPlay();
  g.tick(16, 116);
  assert.ok(g.gameT > 0);
});

test('能走动，而且走不进障碍里', () => {
  const g = makeGame(ANSWERS);
  g.enterPlay();
  const x0 = g.player.x;
  g.input.keys['ArrowLeft'] = true;
  for (let i = 0; i < 60; i++) g.tick(16, 100 + i * 16);
  g.input.keys['ArrowLeft'] = false;
  assert.notEqual(g.player.x, x0, '按了方向键却没动');
  assert.ok(!g.blocker(g.player.x, g.player.y), '玩家站在了不该站的地方');
});

test('走到门口能换场景', () => {
  const g = makeGame(ANSWERS);
  g.enterPlay();
  assert.equal(g.sceneId, 'yard');
  const door = g.scene.doors.find((d) => d.to === 'indoor');
  g.player.x = door.x; g.player.y = door.y;
  g._updateNear();
  assert.ok(g.nearDoor, '站在门口却没识别到门');
  assert.equal(g.nearDoor.to, 'indoor');
  g.interact();
  assert.equal(g.sceneId, 'indoor', '按了交互却没进屋');
  assert.deepEqual(
    { x: g.player.x, y: g.player.y },
    { x: g.world.scenes.indoor.spawn.x, y: g.world.scenes.indoor.spawn.y },
    '进屋之后没有站在屋里的出生点'
  );
});

test('在摸鱼点连按 20 次，总能摸到鱼（也会扑空几次）', () => {
  const g = makeGame(ANSWERS);
  g.enterPlay();
  assert.ok(standOn(g, 'fish'), '世界里没有摸鱼点');
  assert.equal(g.nearActivity.id, 'fish');
  for (let i = 0; i < 20; i++) { g.now += 3000; g.interact(); }
  assert.ok(g.bag.fish > 0, '摸了 20 次一条都没有，概率配置可能写坏了');
});

test('钓鱼要先挖蚯蚓：没饵钓不上来', () => {
  const g = makeGame(ANSWERS);
  g.enterPlay();
  assert.ok(standOn(g, 'fishing'));
  g.interact();
  assert.equal(g.bag.fish, 0, '没饵也钓上来了，依赖链断了');
  assert.ok(g.toast && g.toast.text.includes('蚯蚓'), '没提示去挖蚯蚓');

  assert.ok(standOn(g, 'worms'));
  g.interact();
  assert.ok(g.bag.earthworm > 0, '挖了蚯蚓却没进兜');

  standOn(g, 'fishing');
  for (let i = 0; i < 30; i++) { g.now += 3000; g.interact(); }
  assert.ok(g.bag.fish > 0, '挂上饵了还是一条钓不到');
});

test('季节不对的事做不了，而且会告诉你什么时候来', () => {
  const g = makeGame(ANSWERS);
  g.enterPlay();
  assert.ok(standOn(g, 'bake'));       // 烤鹅蛋是冬天的
  g.setSeason(1);                      // 现在是夏天
  g.interact();
  assert.equal(g.bag.baked, 0, '夏天居然能烤鹅蛋');
  assert.ok(g.toast.text.includes('冬天'), '没告诉玩家该什么时候来');

  g.setSeason(3);                      // 冬天
  g.interact();
  assert.equal(g.bag.baked, 1, '冬天到了却烤不了');
});

test('天黑才会长知了猴；走近了自动进兜', () => {
  const g = makeGame(ANSWERS);
  g.enterPlay();
  g.gameT = 20; // 白天
  for (let i = 0; i < 100; i++) g.tick(16, 100 + i * 16);
  assert.equal(g.nymphs.length, 0, '白天不该出知了猴');

  g.gameT = 70; // 夜里
  for (let i = 0; i < 3000; i++) g.tick(16, 5000 + i * 16);
  assert.ok(g.nymphs.length > 0, '天黑了却一只都没出来');

  const n = g.nymphs.find((x) => !x.taken);
  g.player.x = n.x; g.player.y = n.y;
  g.tick(16, 999999);
  assert.ok(g.bag.nymph > 0, '走到知了猴跟前却没抓到');
});

test('季节会自己走，也能手动换；走完一年就结算', () => {
  const g = makeGame(ANSWERS);
  g.enterPlay();
  const s0 = g.season.id;
  for (let i = 0; i < 6000; i++) g.tick(16, 1000 + i * 16); // 90 秒
  assert.notEqual(g.season.id, s0, '过了 90 秒季节没变');

  g.setSeason(0);
  assert.equal(g.season.id, 'spring');

  g.seasonT = SEASON_LEN * SEASONS.length;
  g.tick(16, 999999);
  assert.ok(g.ended, '走完一年却没有结算');
  g.restart();
  assert.equal(g.ended, false);
  assert.equal(g.seasonT, SEASON_LEN * (g.world.startSeason || 0));
  assert.equal(g.bag.fish, 0);
});

test('知了天黑不叫了，白天又回来', () => {
  const g = makeGame(ANSWERS);
  g.enterPlay();
  g.tick(16, 100);
  assert.equal(g.cicadaVisible, true);
  g.gameT = 70;
  g.tick(16, 200);
  assert.equal(g.cicadaVisible, false, '夜里知了还在叫，昼夜逻辑错了');
});

test('旧版单场景世界仍然能跑（南方水乡）', () => {
  const g = makeGame({ region: 'south-watertown', terrain: 'river', activity1: 'fish', activity2: 'cicada' });
  g.enterPlay();
  assert.equal(g.world.multi, false);
  assert.ok(g.scene.activityPos.fish, '旧版世界没有落位点');
  g.player.x = g.scene.activityPos.fish[0].x;
  g.player.y = g.scene.activityPos.fish[0].y;
  g._updateNear();
  for (let i = 0; i < 20; i++) { g.now += 3000; g.interact(); }
  assert.ok(g.bag.fish > 0);
});
