/**
 * 输入：键盘 + 触屏。
 *
 * 必须支持触屏 —— 这个产品的目标形态是微信小程序，手机是主战场。
 * 触屏方案是「点地图走过去 + 右下角一个交互按钮」，
 * 不做虚拟摇杆，因为摇杆在这个慢节奏的游戏里既难做又没必要。
 */

export function actionButtonRect(width, height) {
  return { x: width - 64, y: height - 64, r: 40 };
}

export class Input {
  constructor(canvas, { onAction, onRestart, onSeason, onFirstGesture } = {}) {
    this.canvas = canvas;
    this.keys = Object.create(null);
    this.target = null;
    this.enabled = true;
    this._gestured = false;
    this._onAction = onAction || (() => {});
    this._onRestart = onRestart || (() => {});
    this._onSeason = onSeason || (() => {});
    this._onFirstGesture = onFirstGesture || (() => {});

    this._bind();
  }

  _gesture() {
    if (!this._gestured) {
      this._gestured = true;
      this._onFirstGesture();
    }
  }

  _pos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  _bind() {
    const kd = (e) => {
      this._gesture();
      const k = e.key;
      this.keys[k] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(k)) e.preventDefault();
      if (k === ' ' || k === 'j' || k === 'J') this._onAction();
      if (k === 'r' || k === 'R') this._onRestart();
      if (k === 'Tab' || k === 'q' || k === 'Q') this._onSeason();
    };
    const ku = (e) => { this.keys[e.key] = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    const btn = actionButtonRect(this.canvas.width, this.canvas.height);
    const inBtn = (p) => {
      const d = Math.hypot(p.x - btn.x, p.y - btn.y);
      return d < btn.r + 12;
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      this._gesture();
      if (!this.enabled) return;
      const p = this._pos(e);
      if (inBtn(p)) { this._onAction(); return; }
      this.target = { x: p.x, y: p.y };
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.enabled || !e.buttons) return;
      const p = this._pos(e);
      if (!inBtn(p)) this.target = { x: p.x, y: p.y };
    });
  }

  /** 返回归一化的移动方向，没在动就返回 null */
  axis() {
    let vx = 0, vy = 0;
    const k = this.keys;
    if (k['ArrowLeft'] || k['a'] || k['A']) vx -= 1;
    if (k['ArrowRight'] || k['d'] || k['D']) vx += 1;
    if (k['ArrowUp'] || k['w'] || k['W']) vy -= 1;
    if (k['ArrowDown'] || k['s'] || k['S']) vy += 1;
    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      return { x: vx / len, y: vy / len };
    }
    return null;
  }

  clear() {
    this.keys = Object.create(null);
    this.target = null;
  }
}
