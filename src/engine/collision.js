/**
 * 碰撞：世界里的东西都在这儿变成长不大的墙。
 *
 * 注意 —— 这是「玩法点可达性」的唯一真相来源。
 * 新增地块或树之后，务必跑一次 `npm test`（内含 BFS 可达性校验），
 * 否则很容易出现"玩法点被树的碰撞体挡住、玩家永远走不到"的死局。
 */

export const PLAYER_R = 13;

export function createBlocker(world) {
  const R = PLAYER_R;
  const W = world.width, H = world.height;

  function hitRect(x, y, rc) {
    return x + R > rc.x && x - R < rc.x + rc.w && y + R > rc.y && y - R < rc.y + rc.h;
  }
  function hitCircle(x, y, c, r) {
    const dx = x - c.x, dy = y - c.y;
    return dx * dx + dy * dy < r * r;
  }

  return function blocked(x, y) {
    // 顶部留出 HUD 的空间
    if (x < R + 1 || x > W - R - 1 || y < 40 || y > H - R - 1) return true;
    if (world.house && hitRect(x, y, world.house)) return true;
    if (world.water) {
      const r = world.water.type === 'pond' ? world.layout.pond : world.layout.river;
      if (r && hitRect(x, y, r)) return true;
    }
    for (const t of world.orchard || []) {
      if (hitCircle(x, y, t, 34)) return true;
    }
    for (const t of world.aspens || []) {
      if (hitCircle(x, y, t, 26)) return true;
    }
    return false;
  };
}

/** 一个点能不能站人（用于生成知了猴、检查玩法点是否可达） */
export function isStandable(world, x, y) {
  return !createBlocker(world)(x, y);
}
