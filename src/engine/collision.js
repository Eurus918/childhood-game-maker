/**
 * 碰撞：世界里的东西都在这儿变成长不大的墙。
 *
 * 这是「玩法点可达性」的唯一真相来源。新增地块或树之后，
 * 务必跑 `npm test`（内含 BFS 可达性校验），
 * 否则很容易出现"玩法点被挡住、玩家永远走不到"的死局。
 */

export const PLAYER_R = 13;

function hitRect(x, y, rc, R) {
  return x + R > rc.x && x - R < rc.x + rc.w && y + R > rc.y && y - R < rc.y + rc.h;
}
function hitCircle(x, y, c, r) {
  const dx = x - c.x, dy = y - c.y;
  return dx * dx + dy * dy < r * r;
}
/** 点到线段的距离（小溪是一条斜穿场景的带子） */
function distToSegment(x, y, L) {
  const vx = L.bx - L.ax, vy = L.by - L.ay;
  const wx = x - L.ax, wy = y - L.ay;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
  return Math.hypot(x - (L.ax + t * vx), y - (L.ay + t * vy));
}

export function createBlocker(scene) {
  const R = PLAYER_R;
  const W = scene.width || 960, H = scene.height || 600;

  return function blocked(x, y) {
    // 顶部留出 HUD 空间
    if (x < R + 1 || x > W - R - 1 || y < 40 || y > H - R - 1) return true;

    if (scene.walk) {
      const k = scene.walk;
      if (x < k.x + R || x > k.x + k.w - R || y < k.y + R || y > k.y + k.h - R) return true;
    }
    for (const o of scene.obstacles || []) {
      if (o.kind === 'circle' ? hitCircle(x, y, o, o.r) : hitRect(x, y, o, R)) return true;
    }
    if (scene.streamLine) {
      const L = scene.streamLine;
      if (distToSegment(x, y, L) < L.r + R) return true;
    }
    // 旧版单场景：水是矩形，树在 aspens/orchard 里
    if (scene.water) {
      const wr = scene.water.type === 'pond'
        ? { x: 640, y: 395, w: 290, h: 165 }
        : { x: 600, y: 410, w: 340, h: 120 };
      if (hitRect(x, y, wr, R)) return true;
    }
    for (const t of scene.orchard || []) {
      if (hitCircle(x, y, t, 34)) return true;
    }
    for (const t of scene.aspens || []) {
      if (hitCircle(x, y, t, 26)) return true;
    }
    return false;
  };
}

export function isStandable(scene, x, y) {
  return !createBlocker(scene)(x, y);
}
