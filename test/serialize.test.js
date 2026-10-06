/**
 * 存档与分享：做完一个童年，第一反应一定是发给某个人。
 * 这条链路不能坏。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { content } from '../content/index.js';
import { buildWorld } from '../src/world/builder.js';
import { toSave, parseSave, encodeShare, decodeShare, shareUrl } from '../src/world/serialize.js';

const ANSWERS = {
  region: 'south-watertown', terrain: 'river',
  activity1: 'fish', activity2: 'cicada',
  call: '小宇——回来吃饭——', title: '那年夏天'
};

test('存档往返：导出来再导回去，还是同一个童年', () => {
  const world = buildWorld(ANSWERS, content);
  const text = toSave(world);
  const back = parseSave(text);
  assert.equal(back.region, 'south-watertown');
  assert.equal(back.terrain, 'river');
  assert.equal(back.activity1, 'fish');
  assert.equal(back.activity2, 'cicada');
  assert.equal(back.call, '小宇——回来吃饭——');
  assert.equal(back.title, '那年夏天');

  const again = buildWorld(back, content);
  assert.equal(again.regionId, world.regionId);
  assert.deepEqual(again.activities, world.activities);
});

test('分享码往返，中文不乱码', () => {
  const world = buildWorld(ANSWERS, content);
  const code = encodeShare(world);
  // URL 里只该出现这些字符，否则丢进浏览器地址栏会被转义
  assert.ok(/^[A-Za-z0-9\-_]+$/.test(code), '分享码含有 URL 不安全字符: ' + code.slice(0, 30));
  const back = decodeShare(code);
  assert.equal(back.region, 'south-watertown');
  assert.equal(back.call, '小宇——回来吃饭——');
  assert.equal(back.title, '那年夏天');
  assert.deepEqual(back.activity1, 'fish');
});

test('分享链接带得上 hash，也读得回来', () => {
  const world = buildWorld(ANSWERS, content);
  const url = shareUrl(world, 'https://example.com/play/');
  assert.ok(url.startsWith('https://example.com/play/#w='));
  const code = url.split('#w=')[1];
  assert.equal(decodeShare(code).title, '那年夏天');
});

test('坏存档要给明确的报错，不能静默变成空世界', () => {
  assert.throws(() => parseSave('{}'), /格式不对|版本/);
  assert.throws(() => parseSave('{"version":999}'), /版本/);
  assert.throws(() => parseSave('not json'));
});
