/**
 * 本地关键词匹配。
 *
 * 为什么默认不用大模型：一个采访流程只有几十个候选，关键词匹配够准、
 * 零延迟、零成本、离线可跑，而且结果可预期 —— 用户说"村口有棵老槐树"，
 * 必然落到北方农村，不会像模型那样偶尔给你一个美式农场。
 *
 * 模型只在需要"把用户的话改写得更好听"时才用（见 llm.js），
 * 而且永远不参与玩法生成。
 */

export function matchByKeywords(text, options) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  let hit = null;
  let hitLen = 0;
  for (const o of options) {
    for (const k of o.kw || []) {
      if (t.includes(String(k).toLowerCase()) && String(k).length > hitLen) {
        hit = o;
        hitLen = String(k).length;
      }
    }
  }
  return hit;
}

/** 给一句自由输入挑一个最像的选项；挑不出来就返回 null，交给调用方决定 */
export function bestEffort(text, options) {
  return matchByKeywords(text, options);
}
