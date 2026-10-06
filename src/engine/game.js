/**
 * 游戏主体：把世界配置跑起来。
 *
 * Game 不认识任何一个具体的童年 —— 它只认识 world 配置。
 * 给它一份北方的配置它就跑北方，给南方的就跑南方。
 */

import { Renderer } from './renderer.js';
import { Input } from './input.js';
import { createBlocker } from './collision.js';
import { isCicadaTime, isNymphTime, phaseOf } from './daynight.js';
import { audio } from './audio.js';
import { handlers, autoCollectNymphs } from './actions.js';

const REACH = 72;      // 玩法点交互半径
const GRANNY_REACH = 60;

export class Game {
  constructor(canvas, world, { activities } = {}) {
    this.canvas = canvas;
    this.world = world;
    this.activities = activities || {};
    this.renderer = new Renderer(canvas);
    this.blocker = createBlocker(world);

    this.mode = 'build';
    this.now = 0;
    this.gameT = 0;
    this.ended = false;
    this.spawned = [];
    this.toast = null;

    this.player = { x: world.spawn.x, y: world.spawn.y, dir: 1, moving: false };
    this.bag = { fish: 0, fruit: 0, cicada: 0, nymph: 0 };
    this.cicadas = (world.aspens || []).map(() => ({ alive: true }));
    this.nymphs = [];
    this.nearActivity = null;
    this.nearGranny = false;

    this.input = new Input(canvas, {
      onAction: () => this.interact(),
      onRestart: () => { if (this.mode === 'play') this.restart(); },
      onFirstGesture: () => audio.startAmbient()
    });

    this._lastPos = { x: this.player.x, y: this.player.y };
    this._stuck = 0;
    this._raf = null;
  }

  /* ---------- 生命周期 ---------- */

  start() {
    const frame = (ts) => {
      const t = ts || 0;
      const dt = this._last ? Math.min(50, t - this._last) : 16;
      this._last = t;
      this.tick(dt, t);
      this._raf = requestAnimationFrame(frame);
    };
    this._raf = requestAnimationFrame(frame);
    return this;
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  /** 供测试直接驱动，不依赖 requestAnimationFrame */
  tick(dt = 16, ts = this.now + dt) {
    this.now = ts;
    this.update(dt);
    this.renderer.draw(this);
  }

  /** 换一个新世界（采访过程中每答一题就重编译一次，实现"边聊边长"） */
  setWorld(world, plan) {
    this.world = world;
    this.blocker = createBlocker(world);
    this.cicadas = (world.aspens || []).map(() => ({ alive: true }));
    this.nymphs = [];
    this.spawned = plan || [];
    this.bag = { fish: 0, fruit: 0, cicada: 0, nymph: 0 };
    this.player.x = world.spawn.x;
    this.player.y = world.spawn.y;
    this.player.moving = false;
    this._lastPos = { x: this.player.x, y: this.player.y };
    this._stuck = 0;
    this.ended = false;
    this.gameT = 0;
  }

  enterPlay() {
    this.mode = 'play';
    this.spawned = [];
    this.gameT = 0;
    this.ended = false;
    this.player.x = this.world.spawn.x;
    this.player.y = this.world.spawn.y;
    this.input.enabled = true;
    audio.startAmbient();
  }

  restart() {
    this.bag = { fish: 0, fruit: 0, cicada: 0, nymph: 0 };
    this.nymphs = [];
    this.cicadas = (this.world.aspens || []).map(() => ({ alive: true }));
    this.gameT = 0;
    this.ended = false;
    this.toast = null;
    this.player.x = this.world.spawn.x;
    this.player.y = this.world.spawn.y;
    this._lastPos = { x: this.player.x, y: this.player.y };
    this._stuck = 0;
    this.input.clear();
  }

  /* ---------- 每帧 ---------- */

  update(dt) {
    this.cicadaVisible = isCicadaTime(this.gameT);
    this.nymphTime = isNymphTime(this.gameT);

    if (this.mode !== 'play') {
      this.nearActivity = null;
      this.nearGranny = false;
      return;
    }

    this.gameT += dt / 1000;
    this._move(dt);

    // 天黑之后，树根底下开始冒知了猴
    const cfgNymph = this.activities.nymph;
    if (cfgNymph && this.nymphTime && this.world.activities.includes('nymph')) {
      const alive = this.nymphs.filter((n) => !n.taken).length;
      if (alive < 6 && Math.random() < 0.006) this._spawnNymph();
    }

    // 白天知了会重新飞回来
    if (this.cicadaVisible && Math.random() < 0.004) {
      const i = Math.floor(Math.random() * this.cicadas.length);
      if (this.cicadas[i]) this.cicadas[i].alive = true;
    }

    if (cfgNymph) autoCollectNymphs(this, cfgNymph);

    audio.setCicada(this.cicadaVisible ? 0.005 : 0.0008);

    this._updateNear();

    if (this.world.duration && this.gameT > this.world.duration) this.ended = true;
  }

  _move(dt) {
    const p = this.player;
    if (this.ended) { p.moving = false; return; }

    let axis = this.input.axis();
    if (!axis && this.input.target) {
      const dx = this.input.target.x - p.x;
      const dy = this.input.target.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) this.input.target = null;
      else axis = { x: dx / d, y: dy / d };
    }

    if (axis) {
      const sp = 2.5 * (dt / 16);
      const nx = p.x + axis.x * sp;
      const ny = p.y + axis.y * sp;
      if (!this.blocker(nx, p.y)) p.x = nx;
      if (!this.blocker(p.x, ny)) p.y = ny;
      if (axis.x) p.dir = axis.x > 0 ? 1 : -1;
      p.moving = true;
    } else {
      p.moving = false;
    }

    // 触屏点了个走不到的地方（比如池塘中心），别让它一直卡在那儿
    if (this.input.target) {
      if (Math.abs(p.x - this._lastPos.x) < 0.25 && Math.abs(p.y - this._lastPos.y) < 0.25) this._stuck++;
      else this._stuck = 0;
      if (this._stuck > 45) { this.input.target = null; this._stuck = 0; }
    }
    this._lastPos.x = p.x;
    this._lastPos.y = p.y;
  }

  _spawnNymph() {
    const list = this.world.aspens;
    const base = list && list.length ? list[Math.floor(Math.random() * list.length)] : { x: 470, y: 300 };
    const nx = base.x + (Math.random() * 130 - 65);
    const ny = base.y + 40 + Math.random() * 50;
    if (!this.blocker(nx, ny - 20) && !this.blocker(nx, ny + 20)) {
      this.nymphs.push({ x: nx, y: ny, taken: false });
    }
  }

  _updateNear() {
    const p = this.player;
    let best = null, bd = REACH;
    for (const id of this.world.activities) {
      const pos = this.world.activityPos[id];
      if (!pos) continue;
      const d = Math.hypot(p.x - pos.x, p.y - pos.y);
      if (d < bd) { bd = d; best = { id, label: (this.world.activityMeta[id] || {}).label || id }; }
    }
    this.nearActivity = best;
    const g = this.world.granny;
    this.nearGranny = !!g && Math.hypot(p.x - g.x, p.y - g.y) < GRANNY_REACH;
  }

  nearestAspenIndex() {
    const list = this.world.aspens || [];
    let idx = 0, bd = Infinity;
    list.forEach((a, i) => {
      const d = Math.hypot(this.player.x - a.x, this.player.y - a.y);
      if (d < bd) { bd = d; idx = i; }
    });
    return idx;
  }

  /* ---------- 交互 ---------- */

  interact() {
    if (this.mode !== 'play') return;
    audio.unlock();

    if (this.nearGranny) {
      this.say(this.world.call || '回——来——吃——饭——', '#8a5f2a');
      audio.blip(420, 0.35, 'sine', 0.12);
      return;
    }
    if (!this.nearActivity) {
      this.say('这儿没什么可干的，往别处走走', '#6b6255');
      return;
    }
    const id = this.nearActivity.id;
    const cfg = this.activities[id];
    const fn = handlers[id];
    if (!fn || !cfg) {
      this.say('（这个玩法还没做出来）', '#6b6255');
      return;
    }
    fn(this, cfg);
  }

  say(text, color) {
    this.toast = { text, color: color || '#4a3f2e', born: this.now };
  }
}
