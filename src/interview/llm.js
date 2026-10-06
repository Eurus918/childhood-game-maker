/**
 * 大模型适配器（可选）。
 *
 * ⚠️ 安全红线：API Key 绝对不能出现在前端代码、构建产物或 Git 仓库里。
 * 本模块只接受一个「你自己搭的后端代理地址」（endpoint），
 * Key 放在那个服务上。任何人把 Key 写在前端，等于把钱包密码贴在门上。
 *
 * 而且注意职责边界：模型只被允许改写「话怎么说」，
 * 不允许生成玩法、坐标、规则 —— 那些必须来自 content/ 与引擎。
 * 默认不配置 endpoint 时，整个产品完全离线可跑。
 */

export function createLLM({ endpoint, timeout = 8000 } = {}) {
  if (!endpoint) return null;

  return {
    enabled: true,
    /**
     * 让模型把一句素材文案改得更像在跟这个人说话。
     * 失败或超时就返回 null，调用方用原素材兜底 —— 模型永远不能让流程卡住。
     */
    async polish(promptText) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText }),
          signal: ctrl.signal
        });
        clearTimeout(timer);
        if (!res.ok) return null;
        const data = await res.json();
        const text = (data && (data.text || data.reply || data.content)) || '';
        return typeof text === 'string' && text.trim() ? text.trim() : null;
      } catch (e) {
        return null;
      }
    }
  };
}

/** 拼给模型的提示词：把玩法、文案、用户原话都交代清楚，同时锁死职责 */
export function buildPrompt({ step, choiceLabel, userText, materialReply }) {
  return [
    '你在帮一个用户把他的童年做成一个小游戏。',
    '下面是这一轮的情况：',
    '- 我问的问题：' + (step && step.q ? step.q : ''),
    '- 用户的选择：' + (choiceLabel || userText || ''),
    '- 素材库里准备好的回答：' + (materialReply || ''),
    '',
    '请把这段回答改写成一句更自然、更有画面感的话。要求：',
    '1. 中文，一句话到两句话，不超过 60 个字；',
    '2. 不要凭空发明素材里没有的具体事物；',
    '3. 不要提任何游戏机制、按钮、代码；',
    '4. 语气像一个记得这种小事的老朋友，不要夸张，不要感叹号堆砌。',
    '',
    '只输出改写后的这句话，不要解释。'
  ].join('\n');
}
