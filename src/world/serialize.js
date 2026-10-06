/**
 * 存档与分享。
 *
 * 分享是这类产品的命门：做完一个童年，第一反应一定是「发给某个人」。
 * 在小程序能上线之前，最省事的分享方式是把它塞进 URL —— 零后端、零存储、点开即玩。
 */

import { WORLD_VERSION } from './builder.js';

function utf8ToB64(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToUtf8(b) {
  const bin = atob(b);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function toB64Url(s) {
  return utf8ToB64(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64Url(s) {
  let b = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4) b += '=';
  return b64ToUtf8(b);
}

/** 导出存档（不含 layout 这类常量，只存「这个童年是什么」） */
export function toSave(world) {
  const save = {
    version: WORLD_VERSION,
    title: world.title,
    region: world.regionId,
    era: world.era,
    activities: world.activities,
    water: world.water,
    field: world.field,
    call: world.call,
    answers: world.answers,
    savedAt: new Date().toISOString()
  };
  return JSON.stringify(save, null, 2);
}

/** 从存档恢复：只认答案，布局一律用最新的模板重新编译 */
export function parseSave(text) {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== 'object') throw new Error('存档格式不对');
  if (obj.version && obj.version > WORLD_VERSION) throw new Error('存档版本比当前程序新，升级一下再打开');
  const a = obj.answers || obj;
  const region = a.region || obj.region;
  // 缺了地域就没法编译世界 —— 宁可报错，也不要静默生成一个谁都不认识的默认童年
  if (!region) throw new Error('存档里找不到地域信息，格式不对');
  return {
    region,
    terrain: obj.water ? obj.water.type : (obj.field ? obj.field.type : (a.terrain || 'pond')),
    activity1: (a.activity1 || (obj.activities && obj.activities[0])),
    activity2: (a.activity2 || (obj.activities && obj.activities[1])),
    call: a.call || obj.call,
    title: a.title || obj.title,
    era: a.era || obj.era
  };
}

export function encodeShare(world) {
  return toB64Url(JSON.stringify({
    r: world.regionId,
    t: world.water ? world.water.type : (world.field ? world.field.type : null),
    a: world.activities,
    c: world.call,
    n: world.title
  }));
}

export function decodeShare(code) {
  const o = JSON.parse(fromB64Url(code));
  return {
    region: o.r,
    terrain: o.t,
    activity1: o.a && o.a[0],
    activity2: o.a && o.a[1],
    call: o.c,
    title: o.n
  };
}

export function shareUrl(world, base) {
  const u = base || (typeof location !== 'undefined' ? location.href.split('#')[0] : '');
  return u + '#w=' + encodeShare(world);
}

export function readShareFromLocation() {
  if (typeof location === 'undefined') return null;
  const m = location.hash.match(/[#&]w=([A-Za-z0-9\-_]+)/);
  if (!m) return null;
  try { return decodeShare(m[1]); } catch (e) { return null; }
}
