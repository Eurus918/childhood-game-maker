/**
 * 采访引擎：把 content/questions 里的提问流跑起来。
 *
 * 它不知道 Canvas，不知道游戏，只负责「问一句、收一句、给一句回应」。
 * 想换一代人的童年，换一个提问流文件就行。
 */

import { matchByKeywords } from './matcher.js';

const STEP_LABEL = {
  region: '地基与房子',
  terrain: '家门口的地',
  activity1: '玩法 ①',
  activity2: '玩法 ②',
  call: '一句喊话',
  title: '名字'
};

export class Interview {
  constructor(content, questionId) {
    this.content = content;
    this.flow = content.questions[questionId || content.defaultQuestionId];
    if (!this.flow) throw new Error('找不到提问流：' + questionId);
    this.index = 0;
    this.answers = {};
  }

  get step() {
    return this.flow.steps[this.index] || null;
  }
  get done() {
    return this.index >= this.flow.steps.length;
  }
  get era() {
    return this.flow.era || null;
  }

  /** 当前这一步有哪些可选项 */
  options() {
    const s = this.step;
    if (!s) return [];
    if (s.freeform) {
      return (s.options || []).map((o) => ({ t: o.t, kw: o.kw || [], value: o.value }));
    }
    const src = s.from === 'regions' ? this.content.regionList
      : s.from === 'terrains' ? this.content.terrainList
        : s.from === 'activities' ? this.content.activityList
          : [];
    return src
        .filter((item) => !(s.dedupe && this.answers[s.dedupe] === item.id))
        // pickable:false 的素材由地域自带（比如"坐炕上"），不进选项列表凑数
        .filter((item) => item.pickable !== false)
        .map((item) => ({
          t: item.name || item.label,
          kw: item.keywords || [],
          value: item.id,
          reply: item.reply
        }));
  }

  stepLabel(key) {
    return STEP_LABEL[key] || key;
  }

  /**
   * 提交一个选择。
   * @param {object|string} choice 选项对象，或者用户自己敲的一句话
   * @returns {{userText:string, reply:string, stepKey:string, done:boolean, fallback:boolean}}
   */
  answer(choice) {
    const s = this.step;
    if (!s) return null;

    let picked = null;
    let userText = '';
    let fallback = false;

    if (typeof choice === 'string') {
      userText = choice;
      // raw 题（比如"你妈怎么喊你回家"）：用户既然自己打了原话，就用他的原话。
      // 关键词匹配只用来接住"随便""都行"这种短答复，不能把人家的原话劫持成预设。
      const RAW_MIN_LEN = 6;
      if (s.raw && choice.trim().length >= RAW_MIN_LEN) {
        picked = { t: choice, value: choice, kw: [] };
      } else {
        picked = matchByKeywords(choice, this.options());
      }
      if (!picked) {
        fallback = true;
        // 自由输入没匹配上：如果是「允许用原话」的题（比如喊你回家的那句话），
        // 用户说什么就是什么 —— 那句话本来就该是他自己的
        if (s.raw) {
          picked = { t: choice, value: choice, kw: [] };
        } else {
          const first = this.options()[0];
          picked = first ? { ...first, t: first.t } : { t: choice, value: choice, kw: [] };
        }
      }
    } else {
      picked = choice;
      userText = choice.t;
    }

    this.answers[s.key] = picked.value;
    this.index += 1;

    const parts = [];
    if (picked.reply) parts.push(picked.reply);
    if (s.reply) parts.push(s.reply);
    let reply = parts.join(' ');

    if (fallback && !s.raw) {
      reply = '这句我没完全听明白。我先按最常见的给你放上——「' + picked.t + '」。等下你自己改，或者再跟我说具体点。 ' + reply;
    }

    return {
      userText,
      reply: reply.trim(),
      stepKey: s.key,
      value: picked.value,
      done: this.done,
      fallback
    };
  }

  outro(count) {
    return this.flow.outro.map((t) => t.replace('{n}', count));
  }

  reset() {
    this.index = 0;
    this.answers = {};
  }
}
