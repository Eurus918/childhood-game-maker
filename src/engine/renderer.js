/**
 * 渲染层：只负责画，不负责规则。
 *
 * 所有颜色都从 world.palette / world.houseKind 来 —— 引擎里不写死任何一个
 * 「童年」相关的常量。换一个地域素材，画出来的就是另一种童年。
 */

import { nightAmount, phaseOf } from './daynight.js';
import { actionButtonRect } from './input.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}
function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}
function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}
function easeBack(t) {
  t = Math.max(0, Math.min(1, t));
  const c = 2.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._spawnUsed = null;
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
    this._now = game.now;
    this._spawnUsed = game.spawned ? game.spawned.map((s) => ({ kind: s.kind, born: s.born, used: false })) : null;

    ctx.clearRect(0, 0, w.width, w.height);
    this._ground(w);
    this._water(w, game.now);
    this._field(w, game.now);
    this._house(w);
    this._trees(w, game);
    this._granny(w);

    if (game.mode === 'play') {
      this._nymphs(game);
      this._player(game);
      this._dayNight(game);
      this._hud(game);
      if (game.ended) this._ending(game);
    } else {
      this._marks(game);
    }
  }

  /* ---------- 地面 ---------- */
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
  _water(w, t) {
    if (!w.water) return;
    const ctx = this.ctx;
    const s = this._scale('water');
    if (s <= 0.001) return;
    const r = w.water.type === 'pond' ? w.layout.pond : w.layout.river;
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
  _field(w, t) {
    if (!w.field || w.field.type !== 'wheat') return;
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
  _house(w) {
    if (!w.house) return;
    const ctx = this.ctx;
    const s = this._scale('house');
    if (s <= 0.001) return;
    const h = w.house;
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

    // 门
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(h.x + h.w / 2 - 20, h.y + h.h - 52, 40, 52);
    ctx.fillStyle = '#e8c86a';
    circle(ctx, h.x + h.w / 2 + 13, h.y + h.h - 28, 3); ctx.fill();

    // 窗
    ctx.fillStyle = w.palette.window;
    ctx.fillRect(h.x + 16, h.y + 32, 34, 30);
    ctx.fillRect(h.x + h.w - 50, h.y + 32, 34, 30);
    ctx.strokeStyle = '#6b4a2f';
    ctx.lineWidth = 2;
    ctx.strokeRect(h.x + 16, h.y + 32, 34, 30);
    ctx.strokeRect(h.x + h.w - 50, h.y + 32, 34, 30);

    // 屋檐下挂的玉米和干辣椒（南北方都有，但南方白墙房子不挂）
    if (w.houseKind !== 'whiteblack') {
      ctx.fillStyle = '#d9a441';
      for (let i = 0; i < 3; i++) {
        ellipse(ctx, h.x + 30 + i * 26, h.y + 14, 5, 12, 0.2); ctx.fill();
      }
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
  _trees(w, game) {
    const ctx = this.ctx;
    const t = game.now;

    if (w.orchard.length) {
      const s = this._scale('tree');
      if (s > 0.001) {
        w.orchard.forEach((p, idx) => {
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

    if (w.aspens.length) {
      const s = this._scale('aspen');
      if (s > 0.001) {
        w.aspens.forEach((p, idx) => {
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

  _granny(w) {
    if (!w.granny) return;
    const ctx = this.ctx;
    const s = this._scale('granny');
    if (s <= 0.001) return;
    const g = w.granny;
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
  _dayNight(game) {
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

    // 天黑之后，家里的窗和门口那盏灯会亮起来
    if (n > 0.5 && w.house) {
      const h = w.house;
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
  }

  /* ---------- HUD ---------- */
  _hud(game) {
    const ctx = this.ctx;
    const w = game.world;
    const p = phaseOf(game.gameT);

    ctx.save();
    ctx.fillStyle = 'rgba(255,252,244,.92)';
    rr(ctx, 14, 12, 500, 40, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(180,160,120,.45)';
    ctx.lineWidth = 1; ctx.stroke();

    ctx.font = '14px -apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const items = [
      ['鱼', game.bag.fish, 'fish'],
      ['果子', game.bag.fruit, 'fruit'],
      ['知了', game.bag.cicada, 'cicada'],
      ['知了猴', game.bag.nymph, 'nymph']
    ];
    let x = 28;
    items.forEach((it) => {
      ctx.globalAlpha = w.activities.includes(it[2]) ? 1 : 0.35;
      ctx.fillStyle = '#8a7c66';
      ctx.fillText(it[0], x, 32);
      ctx.font = '600 15px -apple-system,"PingFang SC",sans-serif';
      ctx.fillStyle = '#4a3f2e';
      ctx.fillText(String(it[1]), x + it[0].length * 15 + 4, 32);
      ctx.font = '14px -apple-system,"PingFang SC",sans-serif';
      x += it[0].length * 15 + 30;
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a08e6e';
    ctx.fillText(p.label, 500, 32);
    ctx.restore();

    // 靠近时的交互提示
    let hint = null;
    if (game.nearGranny) hint = '空格 · 听听她喊什么';
    else if (game.nearActivity) {
      hint = '空格 · ' + game.nearActivity.label;
      if (game.nearActivity.id === 'nymph' && !game.nymphTime) hint = null;
    }
    if (hint) {
      ctx.save();
      ctx.font = '13px -apple-system,"PingFang SC",sans-serif';
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
        ctx.font = '15px -apple-system,"PingFang SC",sans-serif';
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
      ctx.font = '14px -apple-system,"PingFang SC",sans-serif';
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
    w.activities.forEach((id) => {
      const p = w.activityPos[id];
      const meta = w.activityMeta[id];
      if (!p || !meta) return;
      const s = this._scale(id);
      if (s <= 0.001) return;
      const bob = Math.sin(game.now / 420 + p.x) * 3;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.scale(s, s);
      ctx.translate(-p.x, -(p.y + bob));
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#b98b47';
      ctx.lineWidth = 2;
      rr(ctx, p.x - 34, p.y - 14, 68, 28, 14);
      ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#8a5f2a';
      ctx.font = '13px -apple-system,"PingFang SC",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.label, p.x, p.y + 1);
      ctx.restore();
    });
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '12px -apple-system,"PingFang SC",sans-serif';
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
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f6ecd8';
    ctx.font = '600 30px -apple-system,"PingFang SC",sans-serif';
    ctx.fillText('天彻底黑了', w.width / 2, 190);
    ctx.font = '16px -apple-system,"PingFang SC",sans-serif';
    ctx.fillStyle = '#e2d5bb';
    lines.forEach((l, i) => ctx.fillText(l, w.width / 2, 240 + i * 30));
    ctx.font = '17px -apple-system,"PingFang SC",sans-serif';
    ctx.fillStyle = '#f2c98a';
    ctx.fillText('「' + (w.call || '回来吃饭') + '」', w.width / 2, 250 + lines.length * 30 + 26);
    ctx.font = '13px -apple-system,"PingFang SC",sans-serif';
    ctx.fillStyle = '#b9ac91';
    ctx.fillText('按 R 再玩一次 · 这个世界会一直在，你什么时候回来它都在', w.width / 2, w.height - 70);
    ctx.restore();
  }
}
