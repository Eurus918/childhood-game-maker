/**
 * 游戏主体：把世界配置跑起来。
 *
 * Game 不认识任何一个具体的童年 —— 它只认识 world 配置。
 * 给它一份北方的配置它就跑北方，给南方的就跑南方。
 *
 * 世界由若干「场景」组成（院子 / 屋里 / 果园 / 小溪 / 田埂），
 * 场景之间靠门走。时间有两层：昼夜（96 秒一轮）和四季（每季 90 秒）。
 */

import { Renderer } from './renderer.js';
import { Input } from './input.js';
import { createBlocker } from './collision.js';
import {
  isCicadaTime, isNymphTime,
  seasonOf, seekSeason, SEASONS, SEASON_LEN
} from './daynight.js';
import { audio } from './audio.js';
import { handlers, autoCollectNymphs } from './actions.js';
import { ensureScenes, blankScene } from '../world/builder.js';

const REACH = 72;        // 玩法点交互半径
const DOOR_REACH = 46;   // 门的判定半径（门要"贴上去"才触发，别和玩法点抢）
const GRANNY_REACH = 60;

function emptyBag() {
  return {
    fish: 0, fruit: 0, fruitKinds: {}, cicada: 0, nymph: 0,
    eggs: 0, veg: 0, earthworm: 0, grasshopper: 0, baked: 0
  };
}

export class Game {
  constructor(canvas, world, { activities, images } = {}) {
    this.canvas = canvas;
    this.world = ensureScenes(world);
    this.activities = activities || {};
    this.renderer = new Renderer(canvas, { images });

    this.sceneId = this.world.startScene || 'yard';
    this.scene = this.world.scenes[this.sceneId] || blankScene(this.world);
    this.blocker = createBlocker(this.scene);

    this.mode = 'build';
    this.now = 0;
    this.gameT = 0;      // 昼夜
    this.seasonT = (this.world.startSeason || 0) * SEASON_LEN;
    this.ended = false;
    this.spawned = [];
    this.toast = null;

    this.player = { x: this.scene.spawn.x, y: this.scene.spawn.y, dir: 1, moving: false };
    this.bag = emptyBag();
    this.nymphs = [];
    this.cicadas = [];
    this.nearActivity = null;
    this.nearDoor = null;
    this.nearGranny = false;

    this.input = new Input(canvas, {
      onAction: () => this.interact(),
      onRestart: () => { if (this.mode === 'play') this.restart(); },
      onSeason: () => { if (this.mode === 'play') this.nextSeason(); },
      onFirstGesture: () => audio.startAmbient()
    });

    this._lastPos = { x: this.player.x, y: this.player.y };
    this._stuck = 0;
    this._raf = null;

    this._resetSceneState();
  }

  /* ---------- 场景 ---------- */

  /** 换场景时重置「属于这个场景」的东西，兜里的东西不动 */
  _resetSceneState() {
    this.cicadas = (this.scene.cicadaTrees || []).map(() => ({ alive: true }));
    this.nymphs = [];
    this.nearActivity = null;
    this.nearDoor = null;
    this.nearGranny = false;
    this.hint = null;
  }

  _goScene(id, silently) {
    const target = this.world.scenes[id];
    if (!target) return;
    this.sceneId = id;
    this.scene = target;
    this.blocker = createBlocker(target);
    this.player.x = target.spawn.x;
    this.player.y = target.spawn.y;
    this.player.moving = false;
    this.input.target = null;
    this._lastPos = { x: this.player.x, y: this.player.y };
    this._stuck = 0;
    this._resetSceneState();
    if (!silently) this.say(target.name, '#7a5a20');
  }

  /* ---------- 季节 ---------- */

  get season() { return seasonOf(this.seasonT); }
  get seasonIndex() { return Math.floor((((this.seasonT % (SEASON_LEN * 4)) + SEASON_LEN * 4) % (SEASON_LEN * 4)) / SEASON_LEN); }

  setSeason(idx) {
    const i = ((idx % SEASONS.length) + SEASONS.length) % SEASONS.length;
    this.seasonT = seekSeason(i);
    this.say('现在是' + SEASONS[i].label + '了', '#5a6b3a');
  }
  nextSeason() { this.setSeason(this.seasonIndex + 1); }

  /** 这个玩法在当前季节能不能玩 */
  seasonOk(id) {
    if (!this.world.seasonal) return true;   // 单场景地域没有季节这个维度
    const meta = this.world.activityMeta[id];
    if (!meta || !meta.seasons || !meta.seasons.length) return true;
    return meta.seasons.includes(this.season.id);
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
    this.world = ensureScenes(world);
    this.sceneId = this.world.startScene || 'yard';
    this.scene = this.world.scenes[this.sceneId] || blankScene(this.world);
    this.blocker = createBlocker(this.scene);
    this.spawned = plan || [];
    this.bag = emptyBag();
    this.player.x = this.scene.spawn.x;
    this.player.y = this.scene.spawn.y;
    this.player.moving = false;
    this._lastPos = { x: this.player.x, y: this.player.y };
    this._stuck = 0;
    this.ended = false;
    this._lastSeason = undefined;
    this.gameT = 0;
    this.seasonT = (this.world.startSeason || 0) * SEASON_LEN;
    this.toast = null;
    this._resetSceneState();
  }

  enterPlay() {
    this.mode = 'play';
    this.spawned = [];
    this.gameT = 0;
    this.seasonT = (this.world.startSeason || 0) * SEASON_LEN;
    this.ended = false;
    this.bag = emptyBag();
    this._lastSeason = undefined;
    this.sceneId = this.world.startScene || 'yard';
    this.scene = this.world.scenes[this.sceneId];
    this.blocker = createBlocker(this.scene);
    this.player.x = this.scene.spawn.x;
    this.player.y = this.scene.spawn.y;
    this._resetSceneState();
    this.input.enabled = true;
    audio.startAmbient();
  }

  restart() {
    this.bag = emptyBag();
    this.gameT = 0;
    this.seasonT = (this.world.startSeason || 0) * SEASON_LEN;
    this.ended = false;
    this.toast = null;
    this._lastSeason = undefined;
    this.sceneId = this.world.startScene || 'yard';
    this.scene = this.world.scenes[this.sceneId];
    this.blocker = createBlocker(this.scene);
    this.player.x = this.scene.spawn.x;
    this.player.y = this.scene.spawn.y;
    this._lastPos = { x: this.player.x, y: this.player.y };
    this._stuck = 0;
    this._resetSceneState();
    this.input.clear();
  }

  /* ---------- 每帧 ---------- */

  update(dt) {
    this.cicadaVisible = isCicadaTime(this.gameT);
    this.nymphTime = isNymphTime(this.gameT);

    if (this.mode !== 'play') {
      this.nearActivity = null;
      this.nearDoor = null;
      this.nearGranny = false;
      this.hint = null;
      return;
    }

    const s = dt / 1000;
    this.gameT += s;
    this.seasonT += s;
    this._move(dt);

    // 天黑之后，树根底下开始冒知了猴
    const cfgNymph = this.activities.nymph;
    if (cfgNymph && this.nymphTime && this.cicadas.length) {
      const alive = this.nymphs.filter((n) => !n.taken).length;
      if (alive < 6 && Math.random() < 0.006) this._spawnNymph();
    }

    // 白天知了会重新飞回来
    if (this.cicadaVisible && this.cicadas.length && Math.random() < 0.004) {
      const i = Math.floor(Math.random() * this.cicadas.length);
      if (this.cicadas[i]) this.cicadas[i].alive = true;
    }

    if (cfgNymph) autoCollectNymphs(this, cfgNymph);

    audio.setCicada(this.cicadaVisible ? 0.005 : 0.0008);

    this._updateNear();

    // 换季时提示一句：人不看 HUD 也能知道"秋天来了"
    const si = this.seasonIndex;
    if (this.world.seasonal && this._lastSeason !== undefined && si !== this._lastSeason) {
      const s = SEASONS[si];
      this.say(s.label + '了' + (this._seasonHint(s.id) || ''), '#5a6b3a');
    }
    this._lastSeason = si;

    const year = SEASON_LEN * SEASONS.length;
    if (this.world.duration && this.gameT > this.world.duration) this.ended = true;
    else if (this.world.seasonal && this.seasonT >= year) this.ended = true; // 过完一年，收摊
  }

  /** 换季提示里带一句"这季节能干嘛" —— 不然玩家不知道该去哪儿 */
  _seasonHint(id) {
    const map = {
      spring: '，田埂上的蚂蚱出来了',
      summer: '，溪里有鱼，树上有知了',
      autumn: '，果园该摘了',
      winter: '，屋里烧着炕'
    };
    return map[id] || '';
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

    // 触屏点了个走不到的地方（比如水塘中心），别让它一直卡在那儿
    if (this.input.target) {
      if (Math.abs(p.x - this._lastPos.x) < 0.25 && Math.abs(p.y - this._lastPos.y) < 0.25) this._stuck++;
      else this._stuck = 0;
      if (this._stuck > 45) { this.input.target = null; this._stuck = 0; }
    }
    this._lastPos.x = p.x;
    this._lastPos.y = p.y;
  }

  _spawnNymph() {
    const list = this.scene.cicadaTrees || [];
    const base = list.length ? list[Math.floor(Math.random() * list.length)] : { x: 470, y: 300 };
    const nx = base.x + (Math.random() * 130 - 65);
    const ny = base.y + 40 + Math.random() * 50;
    if (!this.blocker(nx, ny - 20) && !this.blocker(nx, ny + 20)) {
      this.nymphs.push({ x: nx, y: ny, taken: false });
    }
  }

  /** 找出离玩家最近的可交互点：门优先于玩法点，免得站在门口按不出来 */
  _updateNear() {
    const p = this.player;

    let door = null, dd = DOOR_REACH;
    for (const d of this.scene.doors || []) {
      const dist = Math.hypot(p.x - d.x, p.y - d.y);
      if (dist < dd) { dd = dist; door = d; }
    }
    this.nearDoor = door;
    this.nearDoorDist = door ? dd : Infinity;

    let best = null, bd = REACH, bestPoint = null;
    for (const id of this.world.activities) {
      const pts = this.scene.activityPos[id];
      if (!pts) continue;
      for (const pos of pts) {
        const dist = Math.hypot(p.x - pos.x, p.y - pos.y);
        if (dist < bd) {
          bd = dist;
          best = { id, label: (this.world.activityMeta[id] || {}).label || id };
          bestPoint = pos;
        }
      }
    }
    this.nearActivity = best;
    this.nearActivityDist = best ? bd : Infinity;
    this.nearPoint = bestPoint;

    const g = this.scene.granny;
    this.nearGranny = !!g && Math.hypot(p.x - g.x, p.y - g.y) < GRANNY_REACH;

    // 玩法点和门离得太近时，按"谁更贴身"决定 —— 不然会出现站在玩法点上按空格却被传送走
    this.wantDoor = !!door && (!best || this.nearDoorDist / DOOR_REACH <= this.nearActivityDist / REACH);

    if (this.wantDoor) this.hint = { kind: 'door', label: door.label };
    else if (best) this.hint = { kind: 'activity', id: best.id, label: best.label };
    else this.hint = null;
  }

  /** 粘知了用：找离玩家最近的那棵有知了的树 */
  nearestTreeIndex() {
    const list = this.scene.cicadaTrees || this.scene.aspens || [];
    let idx = 0, bd = Infinity;
    list.forEach((a, i) => {
      const d = Math.hypot(this.player.x - a.x, this.player.y - a.y);
      if (d < bd) { bd = d; idx = i; }
    });
    return idx;
  }

  nearestAspenIndex() { return this.nearestTreeIndex(); }

  /* ---------- 交互 ---------- */

  interact() {
    if (this.mode !== 'play') return;
    audio.unlock();

    if (this.nearGranny) {
      this.say(this.world.call || '回——来——吃——饭——', '#8a5f2a');
      audio.blip(420, 0.35, 'sine', 0.12);
      return;
    }
    const wantDoor = this.wantDoor;
    if (wantDoor) {
      this._goScene(this.nearDoor.to, false);
      audio.blip(520, 0.12, 'sine', 0.06);
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

    // 季节不对：不是"不能玩"，而是告诉你什么时候来 —— 这本身是内容
    if (!this.seasonOk(id)) {
      const meta = this.world.activityMeta[id] || {};
      const when = (meta.seasons || []).map((s) => (SEASONS.find((x) => x.id === s) || {}).label).filter(Boolean);
      this.say('这个得等' + (when.join('或') || '别的季节') + '，现在' + this.season.label + '还没有', '#6b6255');
      audio.miss();
      return;
    }

    fn(this, cfg, this.nearPoint);
  }

  say(text, color) {
    this.toast = { text, color: color || '#4a3f2e', born: this.now };
  }
}
