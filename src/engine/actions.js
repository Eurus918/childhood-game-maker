/**
 * 玩法机制。
 *
 * 「怎么玩」写死在代码里 —— 不让模型、也不让内容配置去发明玩法。
 * 「玩的时候说什么、概率多少」来自 content/activities/*.js。
 * 新增一个玩法 = 这里加一个 handler + content 加一份素材。
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

  /** 钓鱼：要先挖蚯蚓当饵 —— 童年的玩法是有依赖链的 */
  fishing(game, cfg) {
    const m = cfg.mechanic;
    if ((game.bag.earthworm || 0) <= 0) {
      game.say(pick(m.noBait), '#6b6255');
      audio.miss();
      return;
    }
    game.bag.earthworm -= 1;
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

  /** 挖蚯蚓：钓鱼的前置任务 */
  worms(game, cfg) {
    const m = cfg.mechanic;
    const n = m.min + Math.floor(Math.random() * (m.max - m.min + 1));
    game.bag.earthworm = (game.bag.earthworm || 0) + n;
    audio.good();
    game.say(pick(m.hit).replace('{n}', n), '#5a4a32');
  },

  /** 摘果子（旧版单场景） */
  fruit(game, cfg) {
    const m = cfg.mechanic;
    const n = m.min + Math.floor(Math.random() * (m.max - m.min + 1));
    game.bag.fruit += n;
    audio.good();
    game.say(pick(m.hit).replace('{n}', n), '#8a5f2a');
  },

  /** 秋天摘果园：五棵树五种果，交互点带 meta.fruit */
  pick(game, cfg, point) {
    const m = cfg.mechanic;
    const name = (point && point.meta && point.meta.fruit) || '果子';
    const n = m.min + Math.floor(Math.random() * (m.max - m.min + 1));
    game.bag.fruit += n;
    game.bag.fruitKinds = game.bag.fruitKinds || {};
    game.bag.fruitKinds[name] = (game.bag.fruitKinds[name] || 0) + n;
    audio.good();
    game.say(pick(m.hit).replace('{fruit}', name).replace('{n}', n), '#8a5f2a');
  },

  /** 粘知了：会惊飞 */
  cicada(game, cfg) {
    const m = cfg.mechanic;
    if (!game.cicadaVisible) {
      game.say(pick(m.wrongTime || ['天黑了，知了不叫了，看不见']), '#6b6255');
      audio.miss();
      return;
    }
    const idx = game.nearestTreeIndex();
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

  /** 摸知了猴：只有天黑才出土 */
  nymph(game, cfg) {
    const m = cfg.mechanic;
    if (!isNymphTime(game.gameT)) {
      game.say(pick(m.wrongTime), '#6b6255');
      audio.miss();
      return;
    }
    game.say(pick(m.waiting || ['树根底下有动静，走近点看看']), '#7a5a20');
  },

  /** 捡鸡蛋：鸡又不会按你的日程表下蛋 */
  eggs(game, cfg) {
    const m = cfg.mechanic;
    if (Math.random() < m.success) {
      const n = m.min + Math.floor(Math.random() * (m.max - m.min + 1));
      game.bag.eggs += n;
      audio.good();
      game.say(pick(m.hit).replace('{n}', n), '#8a5f2a');
    } else {
      audio.miss();
      game.say(pick(m.miss), '#6b6255');
    }
  },

  /** 浇菜：春天种下去的东西，要等好几个季节 */
  garden(game, cfg) {
    game.bag.veg += 1;
    audio.good();
    game.say(pick(cfg.mechanic.hit), '#4a6b2a');
  },

  /** 抓蚂蚱：草丛里看着有，一脚踩下去就没了 */
  grasshopper(game, cfg) {
    const m = cfg.mechanic;
    if (Math.random() < m.success) {
      const n = m.min + Math.floor(Math.random() * (m.max - m.min + 1));
      game.bag.grasshopper += n;
      audio.good();
      game.say(pick(m.hit).replace('{n}', n), '#4a6b2a');
    } else {
      audio.blip(1800, 0.12, 'square', 0.04);
      game.say(pick(m.miss), '#6b6255');
    }
  },

  /** 烤鹅蛋：冬天的灶膛。炕洞里除了烤蛋还烤过鞋袜 */
  bake(game, cfg) {
    const what = pick(cfg.mechanic.what);
    game.bag.baked += 1;
    audio.blip(320, 0.4, 'sine', 0.1);
    game.say(pick(cfg.mechanic.hit).replace('{what}', what), '#a05a20');
  },

  /** 暖炕：冬天的核心不是干什么，是待着 */
  kang(game, cfg) {
    game.say(pick(cfg.mechanic.lines), '#8a5f2a');
    audio.blip(240, 0.5, 'sine', 0.08);
  }
};

/** 走近知了猴自动收进兜里 */
export function autoCollectNymphs(game, cfg) {
  if (!cfg) return;
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
