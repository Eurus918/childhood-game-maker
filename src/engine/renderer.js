/**
 * 渲染层：只负责画，不负责规则。
 *
 * 所有颜色都从 world.palette / world.houseKind 来 —— 引擎里不写死任何一个
 * 「童年」相关的常量。换一个地域素材，画出来的就是另一种童年。
 *
 * 多场景：底图来自 assets/scenes/*.jpg（水彩画），画不到的东西（玩法点、门、
 * 姥姥）由引擎画在上面。画负责「像不像」，文件里那份 layout 负责「走得通」。
 */

import { nightAmount, phaseOf, SEASONS } from './daynight.js';
import { actionButtonRect } from './input.js';

const FONT = '-apple-system,"PingFang SC","Microsoft YaHei",sans-serif';

/** 四季的色调：同一张画，春天发绿、秋天发黄、冬天发白 */
const SEASON_TINT = {
  spring: 'rgba(150,205,120,.10)',
  summer: 'rgba(255,224,130,.08)',
  autumn: 'rgba(228,152,58,.15)',
  winter: 'rgba(196,220,244,.22)'
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h, r);
}
function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}
function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}
function easeBack(t) {
  t = Math.max(0, Math.min(1, t));
  const c = 2.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

export class Renderer {
  constructor(canvas, { images } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._spawnUsed = null;
    this._imgs = Object.assign(Object.create(null), images || {});
  }

  /** 底图按需加载；Node / 没加载好之前返回 null，就退回矢量画法 */
  _bg(src) {
    if (!src) return null;
    const cached = this._imgs[src];
    if (cached) return cached.complete && cached.naturalWidth ? cached : null;
    if (typeof Image === 'undefined') return null;
    const im = new Image();
    im.src = src;
    this._imgs[src] = im;
    return null;
  }

  /** 每个物件长出来时的弹性动画：先冲过头，再弹回来 */
  _scale(kind) {
    const list = this._spawnUsed;
    if (!list) return 1;
    for (const s of list) {
      if (s.kind === kind && !s.used) {
        s.used = true;
        const t = (this._now - s.born) / 520;
        return t >= 1 ? 1 : Math.max(0, easeBack(t));
      }
    }
    return 1;
  }

  draw(game) {
    const ctx = this.ctx;
    const w = game.world;
    const sc = game.scene;
    this._now = game.now;
    this._spawnUsed = game.spawned ? game.spawned.map((s) => ({ kind: s.kind, born: s.born, used: false })) : null;

    ctx.clearRect(0, 0, w.width, w.height);

    const img = sc && sc.bg ? this._bg(sc.bg) : null;
    if (img) {
      ctx.drawImage(img, 0, 0, w.width, w.height);
      this._seasonWash(game);
    } else {
      this._ground(w);
      this._water(w, sc, game.now);
      this._field(w, sc, game.now);
      this._house(w, sc);
      this._trees(w, sc, game);
    }

    this._points(game, !!img);
    this._doors(game);
    this._granny(sc);

    if (game.mode === 'play') {
      this._nymphs(game);
      this._player(game);
      this._dayNight(game, sc);
      this._hud(game);
      if (game.ended) this._ending(game);
    } else {
      this._marks(game);
    }
  }

  _seasonWash(game) {
    if (!game.world.seasonal) return;
    const ctx = this.ctx;
    const w = game.world;
    const tint = SEASON_TINT[game.season ? game.season.id : 'summer'];
    if (!tint) return;
    ctx.save();
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w.width, w.height);
    ctx.restore();
  }

  /* ---------- 地面（矢量兜底） ---------- */
  _ground(w) {
    const ctx = this.ctx;
    ctx.fillStyle = w.palette.ground;
    ctx.fillRect(0, 0, w.width, w.height);
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = w.palette.groundAlt;
    for (let i = 0; i < 260; i++) {
      ctx.fillRect((i * 137.5) % w.width, (i * 79.3) % w.height, 3, 2);
    }
    ctx.restore();
    // 被踩出来的土路
    ctx.save();
    ctx.strokeStyle = w.palette.path;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(205, 135); ctx.lineTo(430, 300); ctx.lineTo(690, 380);
    ctx.moveTo(430, 300); ctx.lineTo(700, 200);
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- 水 ---------- */
  _water(w, sc, t) {
    if (!sc || !sc.water) return;
    const ctx = this.ctx;
    const s = this._scale('water');
    if (s <= 0.001) return;
    const r = sc.water.type === 'pond' ? w.layout.pond : w.layout.river;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);

    ctx.fillStyle = w.palette.bank;
    ellipse(ctx, cx, cy, r.w / 2 + 10, r.h / 2 + 10); ctx.fill();
    ctx.fillStyle = w.palette.water;
    ellipse(ctx, cx, cy, r.w / 2, r.h / 2); ctx.fill();
    ctx.fillStyle = w.palette.waterDeep;
    ellipse(ctx, cx - 12, cy + 8, r.w / 2 - 34, r.h / 2 - 30); ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const p = ((t / 900) + i * 0.25) % 1;
      ctx.globalAlpha = 0.5 * (1 - p);
      ellipse(ctx, cx, cy, 20 + p * r.w * 0.42, 12 + p * r.h * 0.42);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = w.palette.reed;
    ctx.lineWidth = 3;
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const rx = cx + Math.cos(a) * (r.w / 2 + 6);
      const ry = cy + Math.sin(a) * (r.h / 2 + 5);
      const sw = Math.sin(t / 700 + k) * 4;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(rx + sw, ry - 14, rx + sw * 1.6, ry - 26);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- 田 ---------- */
  _field(w, sc, t) {
    if (!sc || !sc.field || sc.field.type !== 'wheat') return;
    const ctx = this.ctx;
    const s = this._scale('field');
    if (s <= 0.001) return;
    const r = w.layout.wheat;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
    ctx.fillStyle = w.palette.wheat;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = w.palette.wheatDark;
    ctx.lineWidth = 2;
    for (let i = 0; i < 150; i++) {
      const x = r.x + ((i * 53.7) % r.w);
      const y = r.y + ((i * 31.3) % r.h);
      const sw = Math.sin(t / 600 + i * 0.6) * 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + sw, y - 9, x + sw * 1.5, y - 17);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- 房子 ---------- */
  _house(w, sc) {
    if (!sc || !sc.house) return;
    const ctx = this.ctx;
    const s = this._scale('house');
    if (s <= 0.001) return;
    const h = sc.house;
    const cx = h.x + h.w / 2, cy = h.y + h.h / 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);

    ctx.fillStyle = 'rgba(90,70,40,.18)';
    ellipse(ctx, cx, h.y + h.h + 6, h.w * 0.55, 10); ctx.fill();

    ctx.fillStyle = w.palette.wall;
    ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.fillStyle = w.palette.wallBase;
    ctx.fillRect(h.x, h.y + h.h - 14, h.w, 14);

    ctx.fillStyle = w.palette.roof;
    ctx.beginPath();
    ctx.moveTo(h.x - 12, h.y);
    ctx.lineTo(h.x + h.w / 2, h.y - 40);
    ctx.lineTo(h.x + h.w + 12, h.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(h.x + h.w / 2 - 20, h.y + h.h - 52, 40, 52);
    ctx.fillStyle = '#e8c86a';
    circle(ctx, h.x + h.w / 2 + 13, h.y + h.h - 28, 3); ctx.fill();

    ctx.fillStyle = w.palette.window;
    ctx.fillRect(h.x + 16, h.y + 32, 34, 30);
    ctx.fillRect(h.x + h.w - 50, h.y + 32, 34, 30);
    ctx.strokeStyle = '#6b4a2f';
    ctx.lineWidth = 2;
    ctx.strokeRect(h.x + 16, h.y + 32, 34, 30);
    ctx.strokeRect(h.x + h.w - 50, h.y + 32, 34, 30);

    if (w.houseKind !== 'whiteblack') {
      ctx.fillStyle = '#d9a441';
      for (let i = 0; i < 3; i++) ellipse(ctx, h.x + 30 + i * 26, h.y + 14, 5, 12, 0.2), ctx.fill();
      ctx.strokeStyle = '#b03a2a';
      ctx.lineWidth = 3;
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.moveTo(h.x + h.w - 30 - j * 22, h.y + 8);
        ctx.quadraticCurveTo(h.x + h.w - 28 - j * 22, h.y + 20, h.x + h.w - 34 - j * 22, h.y + 30);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---------- 树 ---------- */
  _trees(w, sc, game) {
    if (!sc) return;
    const ctx = this.ctx;
    const t = game.now;

    if ((sc.orchard || []).length) {
      const s = this._scale('tree');
      if (s > 0.001) {
        sc.orchard.forEach((p) => {
          ctx.save();
          ctx.translate(p.x, p.y); ctx.scale(s, s); ctx.translate(-p.x, -p.y);
          ctx.fillStyle = 'rgba(90,70,40,.18)';
          ellipse(ctx, p.x, p.y + 26, 30, 9); ctx.fill();
          ctx.fillStyle = '#6b4a2f';
          ctx.fillRect(p.x - 5, p.y, 10, 30);
          ctx.fillStyle = w.palette.leaf;
          circle(ctx, p.x, p.y - 18, 32); ctx.fill();
          ctx.fillStyle = w.palette.leafLight;
          circle(ctx, p.x - 12, p.y - 26, 20); ctx.fill();
          circle(ctx, p.x + 14, p.y - 12, 18); ctx.fill();
          const fruits = [[-18, -22], [10, -30], [20, -8], [-6, -6], [2, -38]];
          fruits.forEach((f, fi) => {
            ctx.fillStyle = w.palette.fruit[fi % w.palette.fruit.length];
            circle(ctx, p.x + f[0], p.y + f[1], 5); ctx.fill();
          });
          ctx.restore();
        });
      }
    }

    if ((sc.aspens || []).length) {
      const s = this._scale('aspen');
      if (s > 0.001) {
        sc.aspens.forEach((p, idx) => {
          ctx.save();
          ctx.translate(p.x, p.y); ctx.scale(s, s); ctx.translate(-p.x, -p.y);
          ctx.fillStyle = 'rgba(90,70,40,.2)';
          ellipse(ctx, p.x, p.y + 28, 24, 8); ctx.fill();
          ctx.fillStyle = '#7a5b3a';
          ctx.fillRect(p.x - 6, p.y - 20, 12, 50);
          ctx.fillStyle = w.palette.aspen;
          ellipse(ctx, p.x, p.y - 44, 30, 40); ctx.fill();
          ctx.fillStyle = w.palette.leafLight;
          ellipse(ctx, p.x - 10, p.y - 58, 18, 22); ctx.fill();

          const c = game.cicadas[idx];
          if (c && c.alive && game.cicadaVisible) {
            ctx.fillStyle = '#3b3b3b';
            ellipse(ctx, p.x + 7, p.y + 4, 4, 8, 0.3); ctx.fill();
            ctx.fillStyle = '#6a6a6a';
            ellipse(ctx, p.x + 3, p.y - 4, 6, 4, -0.4); ctx.fill();
          }
          ctx.restore();
        });
      }
    }
  }

  _granny(sc) {
    if (!sc || !sc.granny) return;
    const ctx = this.ctx;
    const s = this._scale('granny');
    if (s <= 0.001) return;
    const g = sc.granny;
    ctx.save();
    ctx.translate(g.x, g.y); ctx.scale(s, s); ctx.translate(-g.x, -g.y);
    ctx.fillStyle = 'rgba(90,70,40,.18)';
    ellipse(ctx, g.x, g.y + 16, 13, 5); ctx.fill();
    ctx.fillStyle = '#7b6a8a';
    ctx.fillRect(g.x - 9, g.y - 6, 18, 24);
    ctx.fillStyle = '#e8cfae';
    circle(ctx, g.x, g.y - 12, 9); ctx.fill();
    ctx.fillStyle = '#9a9a9a';
    ctx.beginPath();
    ctx.arc(g.x, g.y - 14, 9, Math.PI, 0);
    ctx.fill();
    ctx.restore();
  }

  /**
   * 玩法点标记。
   * 有底图时必须画 —— 画上认不出哪棵树能摘，玩家只能瞎走。
   * 季节不对的点画成灰的，等于告诉玩家"秋天再来"。
   */
  _points(game, hasBg) {
    const ctx = this.ctx;
    const sc = game.scene;
    if (!sc) return;
    const bob = Math.sin(game.now / 420) * 3;

    for (const id of game.world.activities) {
      const pts = sc.activityPos[id];
      if (!pts) continue;
      const meta = game.world.activityMeta[id] || { label: id };
      const ok = game.mode !== 'play' || game.seasonOk(id);
      for (const p of pts) {
        ctx.save();
        ctx.globalAlpha = ok ? 0.92 : 0.45;
        // 地面上的一个圈，标出"站这儿能干嘛"
        ctx.strokeStyle = ok ? 'rgba(255,255,255,.85)' : 'rgba(220,220,220,.7)';
        ctx.fillStyle = ok ? 'rgba(255,214,120,.35)' : 'rgba(190,190,190,.25)';
        ctx.lineWidth = 2;
        ellipse(ctx, p.x, p.y + 16, 20, 8); ctx.fill(); ctx.stroke();

        const label = meta.label + (ok ? '' : '（' + (meta.seasons || []).map((s) => (SEASONS.find((x) => x.id === s) || {}).label).filter(Boolean).join('/') + '）');
        ctx.font = '12px ' + FONT;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(255,252,244,.94)';
        rr(ctx, p.x - tw / 2 - 9, p.y - 30 + bob, tw + 18, 22, 11); ctx.fill();
        ctx.strokeStyle = ok ? 'rgba(184,139,71,.75)' : 'rgba(160,160,160,.6)';
        ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = ok ? '#8a5f2a' : '#8a8a8a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, p.x, p.y - 19 + bob);
        ctx.restore();
      }
    }
    if (hasBg && game.mode !== 'play') {
      ctx.save();
      ctx.textAlign = 'right';
      ctx.font = '12px ' + FONT;
      ctx.fillStyle = 'rgba(90,80,60,.65)';
      ctx.fillText(sc.name || '', game.world.width - 18, game.world.height - 18);
      ctx.restore();
    }
  }

  /** 门：一个拱门 + 去向 */
  _doors(game) {
    const ctx = this.ctx;
    const sc = game.scene;
    if (!sc || !sc.doors || !sc.doors.length) return;
    for (const d of sc.doors) {
      const hot = game.nearDoor === d;
      const bob = Math.sin(game.now / 380 + d.x) * 2;
      ctx.save();
      ctx.globalAlpha = hot ? 1 : 0.88;
      // 门洞
      ctx.fillStyle = 'rgba(96,66,40,.9)';
      ctx.beginPath();
      ctx.moveTo(d.x - 20, d.y + 18);
      ctx.lineTo(d.x - 20, d.y - 14);
      ctx.quadraticCurveTo(d.x, d.y - 34, d.x + 20, d.y - 14);
      ctx.lineTo(d.x + 20, d.y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,232,180,' + (hot ? 0.95 : 0.7) + ')';
      ctx.beginPath();
      ctx.moveTo(d.x - 14, d.y + 18);
      ctx.lineTo(d.x - 14, d.y - 11);
      ctx.quadraticCurveTo(d.x, d.y - 28, d.x + 14, d.y - 11);
      ctx.lineTo(d.x + 14, d.y + 18);
      ctx.closePath();
      ctx.fill();

      ctx.font = '12px ' + FONT;
      const tw = ctx.measureText(d.label).width;
      ctx.fillStyle = 'rgba(60,44,26,.9)';
      rr(ctx, d.x - tw / 2 - 8, d.y + 22 + bob, tw + 16, 20, 10); ctx.fill();
      ctx.fillStyle = '#ffe9c2';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.label, d.x, d.y + 33 + bob);
      ctx.restore();
    }
  }

  /* ---------- 知了猴 ---------- */
  _nymphs(game) {
    const ctx = this.ctx;
    game.nymphs.forEach((n) => {
      if (n.taken) return;
      const a = 0.35 + 0.35 * Math.sin(game.now / 300 + n.x);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#f5e07a';
      circle(ctx, n.x, n.y, 9); ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#6b4a2f';
      ellipse(ctx, n.x, n.y + 1, 3.5, 5.5); ctx.fill();
      ctx.restore();
    });
  }

  /* ---------- 玩家 ---------- */
  _player(game) {
    const ctx = this.ctx;
    const p = game.player;
    const t = game.now;
    const swing = p.moving ? Math.sin(t / 90) * 4 : 0;
    ctx.save();
    ctx.fillStyle = 'rgba(90,70,40,.22)';
    ellipse(ctx, p.x, p.y + 16, 12, 5); ctx.fill();
    ctx.strokeStyle = '#4a5a72';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x - 3, p.y + 2); ctx.lineTo(p.x - 3 - swing, p.y + 15);
    ctx.moveTo(p.x + 3, p.y + 2); ctx.lineTo(p.x + 3 + swing, p.y + 15);
    ctx.stroke();
    ctx.fillStyle = '#d9534f';
    ctx.fillRect(p.x - 8, p.y - 10, 16, 14);
    ctx.fillStyle = '#e8c39a';
    circle(ctx, p.x, p.y - 16, 8.5); ctx.fill();
    ctx.fillStyle = '#3a2f22';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 19, 8.5, Math.PI, 0);
    ctx.fill();
    circle(ctx, p.x + p.dir * 3, p.y - 15, 1.4); ctx.fill();
    ctx.restore();
  }

  /* ---------- 昼夜 ---------- */
  _dayNight(game, sc) {
    const ctx = this.ctx;
    const w = game.world;
    const n = nightAmount(game.gameT);
    if (n <= 0.001) return;
    const p = phaseOf(game.gameT);
    ctx.save();
    if (p.name === 'dusk') {
      ctx.fillStyle = 'rgba(240,150,60,' + (0.30 * n) + ')';
      ctx.fillRect(0, 0, w.width, w.height);
    }
    ctx.fillStyle = 'rgba(30,48,92,' + (0.62 * n) + ')';
    ctx.fillRect(0, 0, w.width, w.height);
    ctx.restore();

    // 天黑之后，家里的窗会亮起来
    if (n > 0.5 && sc && sc.house) {
      const h = sc.house;
      ctx.save();
      ctx.globalAlpha = (n - 0.5) * 2;
      ctx.fillStyle = 'rgba(255,206,110,.95)';
      ctx.fillRect(h.x + 16, h.y + 32, 34, 30);
      ctx.fillRect(h.x + h.w - 50, h.y + 32, 34, 30);
      ctx.globalAlpha = (n - 0.5) * 0.5;
      ctx.fillStyle = '#ffd77a';
      circle(ctx, h.x + h.w / 2, h.y + h.h - 24, 60); ctx.fill();
      ctx.restore();
    }
    // 屋里/院子天黑了要更暗一点：这是农村的夜，不是城市的夜
    if (n > 0.6 && sc && sc.id === 'indoor') {
      ctx.save();
      ctx.fillStyle = 'rgba(20,16,30,' + (0.25 * (n - 0.6) / 0.4) + ')';
      ctx.fillRect(0, 0, w.width, w.height);
      ctx.restore();
    }
  }

  /* ---------- HUD ---------- */
  _hud(game) {
    const ctx = this.ctx;
    const w = game.world;
    const p = phaseOf(game.gameT);
    const season = game.season || SEASONS[0];

    const items = [
      ['鱼', game.bag.fish, 'fish'],
      ['果子', game.bag.fruit, 'fruit'],
      ['知了', game.bag.cicada, 'cicada'],
      ['知了猴', game.bag.nymph, 'nymph'],
      ['蛋', game.bag.eggs, 'eggs'],
      ['菜', game.bag.veg, 'garden'],
      ['蚯蚓', game.bag.earthworm, 'worms'],
      ['蚂蚱', game.bag.grasshopper, 'grasshopper'],
      ['烤货', game.bag.baked, 'bake']
    ].filter((it) => w.activities.includes(it[2]));

    ctx.save();
    ctx.font = '13px ' + FONT;
    let inner = 16;
    for (const it of items) inner += it[0].length * 14 + 26;
    const boxW = Math.min(w.width - 28, inner + 96);

    ctx.fillStyle = 'rgba(255,252,244,.92)';
    rr(ctx, 14, 12, boxW, 40, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(180,160,120,.45)';
    ctx.lineWidth = 1; ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    let x = 28;
    items.forEach((it) => {
      ctx.fillStyle = '#8a7c66';
      ctx.fillText(it[0], x, 32);
      ctx.font = '600 14px ' + FONT;
      ctx.fillStyle = '#4a3f2e';
      ctx.fillText(String(it[1]), x + it[0].length * 14 + 3, 32);
      ctx.font = '13px ' + FONT;
      x += it[0].length * 14 + 26;
    });

    // 季节 + 时段（只有全场景地域才有四季）
    if (w.seasonal) {
      ctx.textAlign = 'right';
      ctx.font = '600 13px ' + FONT;
      ctx.fillStyle = '#a05f2a';
      ctx.fillText(season.label, boxW - 2, 32);
      ctx.font = '12px ' + FONT;
      ctx.fillStyle = '#a08e6e';
      ctx.fillText(p.label + ' · TAB 换季', boxW - 40, 32);
    } else {
      ctx.textAlign = 'right';
      ctx.font = '12px ' + FONT;
      ctx.fillStyle = '#a08e6e';
      ctx.fillText(p.label, boxW + 2, 32);
    }
    ctx.restore();

    // 场景名
    if (game.scene && game.scene.name) {
      ctx.save();
      ctx.textAlign = 'left';
      ctx.font = '12px ' + FONT;
      ctx.fillStyle = 'rgba(255,252,244,.9)';
      const sn = game.scene.name;
      const sw = ctx.measureText(sn).width;
      rr(ctx, 14, 58, sw + 22, 24, 8); ctx.fill();
      ctx.fillStyle = '#7a5a20';
      ctx.textBaseline = 'middle';
      ctx.fillText(sn, 25, 71);
      ctx.restore();
    }

    // 靠近时的交互提示
    const h = game.hint;
    let hint = null;
    if (game.nearGranny) hint = '空格 · 听听她喊什么';
    else if (h && h.kind === 'door') hint = '空格 · ' + h.label;
    else if (h && h.kind === 'activity') {
      hint = '空格 · ' + h.label;
      if (h.id === 'nymph' && !game.nymphTime) hint = null;
    }
    if (hint) {
      ctx.save();
      ctx.font = '13px ' + FONT;
      const tw = ctx.measureText(hint).width;
      const px = game.player.x, py = game.player.y;
      ctx.fillStyle = 'rgba(40,32,20,.82)';
      rr(ctx, px - tw / 2 - 10, py - 52, tw + 20, 26, 13); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hint, px, py - 39);
      ctx.restore();
    }

    // Toast
    if (game.toast) {
      const age = (game.now - game.toast.born) / 2600;
      if (age <= 1) {
        ctx.save();
        ctx.globalAlpha = age < 0.75 ? 1 : (1 - age) / 0.25;
        ctx.font = '15px ' + FONT;
        const tw = ctx.measureText(game.toast.text).width;
        ctx.fillStyle = 'rgba(255,252,244,.96)';
        rr(ctx, w.width / 2 - tw / 2 - 16, w.height - 68, tw + 32, 40, 12); ctx.fill();
        ctx.strokeStyle = 'rgba(180,160,120,.5)';
        ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = game.toast.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(game.toast.text, w.width / 2, w.height - 48);
        ctx.restore();
      }
    }

    // 触屏交互按钮
    if (!game.ended) {
      const b = actionButtonRect(w.width, w.height);
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,252,244,.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(180,160,120,.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#8a5f2a';
      ctx.font = '14px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('交互', b.x, b.y);
      ctx.restore();
    }
  }

  /* ---------- 建造阶段：玩法点标记 ---------- */
  _marks(game) {
    const ctx = this.ctx;
    const w = game.world;
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '12px ' + FONT;
    ctx.fillStyle = 'rgba(90,80,60,.65)';
    ctx.fillText('已放置 ' + w.activities.length + ' 个玩法点', w.width - 18, w.height - 18);
    ctx.restore();
  }

  /* ---------- 结算 ---------- */
  _ending(game) {
    const ctx = this.ctx;
    const w = game.world;
    ctx.save();
    ctx.fillStyle = 'rgba(28,24,16,.72)';
    ctx.fillRect(0, 0, w.width, w.height);
    const lines = [];
    if (w.activities.includes('fish')) lines.push('摸了 ' + game.bag.fish + ' 条鱼');
    if (w.activities.includes('fruit')) lines.push('摘了 ' + game.bag.fruit + ' 个果子');
    if (w.activities.includes('cicada')) lines.push('粘了 ' + game.bag.cicada + ' 只知了');
    if (w.activities.includes('nymph')) lines.push('抓了 ' + game.bag.nymph + ' 只知了猴');
    if (w.activities.includes('grasshopper')) lines.push('抓了 ' + game.bag.grasshopper + ' 只蚂蚱');
    if (w.activities.includes('eggs')) lines.push('捡了 ' + game.bag.eggs + ' 个鸡蛋');
    if (w.activities.includes('bake')) lines.push('烤了 ' + game.bag.baked + ' 回东西');
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f6ecd8';
    ctx.font = '600 30px ' + FONT;
    ctx.fillText(w.multi ? '一年过去了' : '天彻底黑了', w.width / 2, 190);
    ctx.font = '16px ' + FONT;
    ctx.fillStyle = '#e2d5bb';
    lines.forEach((l, i) => ctx.fillText(l, w.width / 2, 240 + i * 30));
    ctx.font = '17px ' + FONT;
    ctx.fillStyle = '#f2c98a';
    ctx.fillText('「' + (w.call || '回来吃饭') + '」', w.width / 2, 250 + lines.length * 30 + 26);
    ctx.font = '13px ' + FONT;
    ctx.fillStyle = '#b9ac91';
    ctx.fillText('按 R 再玩一次 · 这个世界会一直在，你什么时候回来它都在', w.width / 2, w.height - 70);
    ctx.restore();
  }
}
