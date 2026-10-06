/**
 * 引擎冒烟测试：不开浏览器，用一个假的 canvas 把整局游戏跑一遍。
 *
 * 目的不是测画面（画面看不出来 bug），而是保证：
 * 能进游戏、能走动、能交互、天黑会长知了猴、到点会结算、按 R 能重来。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Game 依赖 window 绑键盘事件，这里给个最小替身
globalThis.window = { addEventListener() {}, AudioContext: undefined, webkitAudioContext: undefined };

const { content } = await import('../content/index.js');
const { buildWorld } = await import('../src/world/builder.js');
const { Game } = await import('../src/engine/game.js');

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

test('建造态不推进时间，进游戏才推进', () => {
  const g = makeGame(ANSWERS);
  assert.equal(g.mode, 'build');
  g.tick(16, 100);
  assert.equal(g.gameT, 0);
  g.enterPlay();
  g.tick(16, 116);
  assert.ok(g.gameT > 0);
});

test('能走动，而且走不进池塘里', () => {
  const g = makeGame(ANSWERS);
  g.enterPlay();
  const x0 = g.player.x;
  g.input.keys['ArrowLeft'] = true;
  for (let i = 0; i < 60; i++) g.tick(16, 100 + i * 16);
  g.input.keys['ArrowLeft'] = false;
  assert.notEqual(g.player.x, x0, '按了方向键却没动');
  assert.ok(!g.blocker(g.player.x, g.player.y), '玩家站在了不该站的地方');
});

test('在摸鱼点连按 20 次，总能摸到鱼（也会扑空几次）', () => {
  const g = makeGame(ANSWERS);
  g.enterPlay();
  const p = g.world.activityPos.fish;
  g.player.x = p.x; g.player.y = p.y;
  g._updateNear();
  assert.ok(g.nearActivity, '站在摸鱼点却没识别到');
  assert.equal(g.nearActivity.id, 'fish');
  for (let i = 0; i < 20; i++) { g.now += 3000; g.interact(); }
  assert.ok(g.bag.fish > 0, '摸了 20 次一条都没有，概率配置可能写坏了');
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

test('到点结算，按 R 能重来', () => {
  const g = makeGame(ANSWERS);
  g.enterPlay();
  g.gameT = 149.9;
  g.tick(200, 1000);
  assert.ok(g.ended, '超过时长却没有结算');
  g.restart();
  assert.equal(g.ended, false);
  assert.equal(g.gameT, 0);
  assert.deepEqual(g.bag, { fish: 0, fruit: 0, cicada: 0, nymph: 0 });
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
