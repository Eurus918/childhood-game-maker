/**
 * 玩法机制。
 *
 * 这里有一条刻意守住的边界：
 *   - 「怎么玩」写死在代码里（本文件）—— 不让模型、也不让内容配置去发明玩法。
 *   - 「玩的时候说什么」来自 content/activities/*.js —— 素材作者只改文案和概率。
 *
 * 这么做的原因：AI 自由生成玩法基本跑不起来；让内容作者只改表层，
 * 生成成功率才可控。新增一个玩法 = 这里加一个 handler + content 加一份素材。
 */

import { audio } from './audio.js';
import { isNymphTime } from './daynight.js';

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const handlers = {
  /** 摸鱼：会扑空。空手才是记忆里那个下午 */
  fish(game, cfg) {
    const m = cfg.mechanic;
    audio.splash();
    if (Math.random() < m.success) {
      const n = m.min + Math.floor(Math.random() * (m.max - m.min + 1));
      game.bag.fish += n;
      audio.good();
      game.say(pick(m.hit).replace('{n}', n), '#2f6b8a');
    } else {
      audio.miss();
      game.say(pick(m.miss), '#6b6255');
    }
  },

  /** 摘果子 */
  fruit(game, cfg) {
    const m = cfg.mechanic;
    const n = m.min + Math.floor(Math.random() * (m.max - m.min + 1));
    game.bag.fruit += n;
    audio.good();
    game.say(pick(m.hit).replace('{n}', n), '#8a5f2a');
  },

  /** 粘知了：会惊飞 */
  cicada(game, cfg) {
    const m = cfg.mechanic;
    if (!game.cicadaVisible) {
      game.say(pick(m.wrongTime || ['天黑了，知了不叫了，看不见']), '#6b6255');
      audio.miss();
      return;
    }
    const idx = game.nearestAspenIndex();
    const c = game.cicadas[idx];
    if (!c || !c.alive) {
      game.say(pick(m.empty || ['这棵树上已经没了，换一棵']), '#6b6255');
      return;
    }
    if (Math.random() < m.success) {
      c.alive = false;
      game.bag.cicada += 1;
      audio.good();
      game.say(pick(m.hit), '#4a6b2a');
    } else {
      audio.fly();
      game.say(pick(m.miss), '#6b6255');
    }
  },

  /** 摸知了猴：只有天黑才出土，走近了自动进兜 */
  nymph(game, cfg) {
    const m = cfg.mechanic;
    if (!isNymphTime(game.gameT)) {
      game.say(pick(m.wrongTime), '#6b6255');
      audio.miss();
      return;
    }
    game.say(pick(m.waiting || ['树根底下有动静，走近点看看']), '#7a5a20');
  }
};

/** 走近知了猴自动收进兜里 —— 那时候确实是摸黑在地上摸的，不用按什么键 */
export function autoCollectNymphs(game, cfg) {
  for (const n of game.nymphs) {
    if (n.taken) continue;
    const dx = n.x - game.player.x, dy = n.y - game.player.y;
    if (dx * dx + dy * dy < 26 * 26) {
      n.taken = true;
      game.bag.nymph += 1;
      audio.good();
      game.say(cfg.mechanic.autoText || '抓到一只知了猴！它还在你手心里动', '#7a5a20');
    }
  }
}
