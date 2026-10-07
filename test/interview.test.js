/**
 * 采访引擎测试：
 * 「问一句、收一句、给一句回应」是整个产品的入口，这里把它跑通。
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { content } from '../content/index.js';
import { Interview } from '../src/interview/index.js';
import { buildWorld, emptyWorld } from '../src/world/builder.js';
import { matchByKeywords } from '../src/interview/matcher.js';

test('关键词匹配：说"村口有棵老槐树"要落到北方农村', () => {
  const iv = new Interview(content);
  const opts = iv.options();
  const hit = matchByKeywords('我家在村口，有棵老槐树', opts);
  assert.ok(hit, '没匹配上任何地域');
  assert.equal(hit.value, 'north-rural');
});

test('关键词匹配：说"江南水乡"要落到南方水乡', () => {
  const iv = new Interview(content);
  const hit = matchByKeywords('我是江南水乡长大的', iv.options());
  assert.ok(hit);
  assert.equal(hit.value, 'south-watertown');
});

test('第二个玩法不会重复列出第一个（dedupe）', () => {
  const iv = new Interview(content);
  iv.answer('北方农村');                 // region
  iv.answer('一口池塘');                  // terrain
  iv.answer('下河摸鱼');                  // activity1
  const opts = iv.options();              // activity2
  assert.ok(!opts.some((o) => o.value === 'fish'), '摸鱼没被排除，用户会选重');
  assert.ok(opts.length >= 3);
});

test('完整走完一轮采访，答案齐了、世界也编译得出来', () => {
  const iv = new Interview(content);
  const log = [];
  while (!iv.done) {
    const opts = iv.options();
    assert.ok(opts.length > 0, '某一步没有可选项，流程会卡死');
    const res = iv.answer(opts[0]);
    log.push(res);
    assert.ok(res.reply && res.reply.length > 0, '每一步都得有回应，不能干巴巴');
  }
  assert.equal(log.length, 6);
  assert.ok(iv.answers.region);
  assert.ok(iv.answers.activity1);
  assert.ok(iv.answers.activity2);

  const world = buildWorld(iv.answers, content);
  assert.ok(world.activities.length >= 2);
  assert.ok(world.title);
  assert.ok(world.palette.ground);
});

test('自由输入没匹配上时：喊回家的话用原话，标题走兜底', () => {
  const iv = new Interview(content);
  iv.answer('北方农村');
  iv.answer('一口池塘');
  iv.answer('下河摸鱼');
  iv.answer('天黑摸知了猴');

  const r = iv.answer('小宇！再不回来鸡都进窝了！');
  assert.equal(iv.answers.call, '小宇！再不回来鸡都进窝了！', '原话必须原样保留');
  assert.ok(!r.fallback);

  const r2 = iv.answer('qwerty');   // 无关键词命中，走兜底
  assert.ok(iv.answers.title, '标题不能是空的');
  assert.ok(r2.fallback, '完全听不懂的时候应该明确告诉用户走了兜底');
});

test('空世界不该有任何东西（采访开始前画布是空的）', () => {
  const w = emptyWorld(content);
  assert.equal(w.activities.length, 0);
  assert.equal(Object.keys(w.scenes).length, 0, '采访还没开始，就已经有场景了');
});

test('选了摸鱼就必须有能摸鱼的地方：素材之间的依赖要在编译期兜住', () => {
  const world = buildWorld({ region: 'north-rural', terrain: 'wheat', activity1: 'fish', activity2: 'fruit' }, content);
  const hasFish = world.sceneOrder.some((sid) => world.scenes[sid].activityPos.fish);
  assert.ok(hasFish, '选了摸鱼却没有能摸鱼的地方，玩家会摸到空气');

  // 旧版单场景地域：选了摸鱼就得有水
  const old = buildWorld({ region: 'south-watertown', terrain: 'wheat', activity1: 'fish', activity2: 'fruit' }, content);
  assert.ok(old.scenes.yard.water, '旧版地域选了摸鱼却没水');
});

test('采访进行中只长出用户挑的那两件，答完才铺开整个地域', () => {
  const answers = { region: 'north-rural', terrain: 'pond', activity1: 'fish', activity2: 'cicada' };
  const during = buildWorld(answers, content, { phase: 'build' });
  assert.deepEqual(during.activities.slice().sort(), ['cicada', 'fish']);
  const after = buildWorld(answers, content, { phase: 'play' });
  assert.ok(after.activities.length > 5, '答完之后应该把整个地域的玩法都铺开');
  assert.ok(after.activities.includes('fish') && after.activities.includes('cicada'));
});
