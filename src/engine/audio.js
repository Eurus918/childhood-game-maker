/**
 * 音频：全部用 WebAudio 现场合成，不依赖任何音频文件。
 * 开源项目里这很重要 —— 仓库里不该塞二进制资源，clone 下来就能跑。
 */

let ctx = null;
let master = null;
let cicadaGain = null;
let ambientStarted = false;

function ensure() {
  if (ctx) return ctx;
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch (e) {
    ctx = null;
  }
  return ctx;
}

function resumeIfNeeded() {
  if (ctx && ctx.state === 'suspended' && ctx.resume) ctx.resume();
}

export const audio = {
  /** 浏览器要求用户交互后才能出声，第一次交互时调用 */
  unlock() {
    ensure();
    resumeIfNeeded();
  },

  /** 知了的环境音：高频锯齿波 + 快速振幅调制，白天响、夜里弱 */
  startAmbient() {
    ensure();
    if (!ctx || ambientStarted) return;
    resumeIfNeeded();
    ambientStarted = true;
    try {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 3400;
      const g = ctx.createGain();
      g.gain.value = 0.004;
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 26;
      const lg = ctx.createGain();
      lg.gain.value = 0.0035;
      lfo.connect(lg);
      lg.connect(g.gain);
      osc.connect(g);
      g.connect(master);
      osc.start();
      lfo.start();
      cicadaGain = g;
    } catch (e) { /* 出不了声就算了，不影响玩 */ }
  },

  /** 随昼夜调节知了音量 */
  setCicada(v) {
    if (!cicadaGain || !ctx) return;
    try { cicadaGain.gain.setTargetAtTime(v, ctx.currentTime, 0.4); } catch (e) {}
  },

  blip(freq, dur, type = 'sine', vol = 0.12) {
    ensure();
    if (!ctx) return;
    resumeIfNeeded();
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch (e) {}
  },

  /** 水花：白噪声 + 带通 + 衰减 */
  splash() {
    ensure();
    if (!ctx) return;
    try {
      const len = Math.floor(ctx.sampleRate * 0.35);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
      const s = ctx.createBufferSource();
      s.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1200;
      const g = ctx.createGain();
      g.gain.value = 0.35;
      s.connect(f);
      f.connect(g);
      g.connect(master);
      s.start();
    } catch (e) {}
  },

  good() {
    this.blip(660, 0.09, 'triangle', 0.16);
    setTimeout(() => this.blip(990, 0.12, 'triangle', 0.13), 80);
  },

  miss() {
    this.blip(200, 0.16, 'sine', 0.1);
  },

  /** 知了受惊飞走 */
  fly() {
    this.blip(2600, 0.25, 'sawtooth', 0.05);
    this.miss();
  }
};
