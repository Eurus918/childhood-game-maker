/**
 * 应用入口：把采访、世界生成、游戏、分享串起来。
 */

import { content } from '../content/index.js';
import { Interview } from './interview/index.js';
import { createLLM, buildPrompt } from './interview/llm.js';
import { buildWorld, spawnPlan, emptyWorld } from './world/builder.js';
import { toSave, parseSave, shareUrl, readShareFromLocation } from './world/serialize.js';
import { Game } from './engine/game.js';
import { ChatUI } from './ui/chat.js';
import { Checklist } from './ui/checklist.js';

const $ = (id) => document.getElementById(id);

const canvas = $('cv');
const controls = $('controls');
const titleEl = $('stitle');
const playBtn = $('playBtn');
const shareBox = $('shareBox');
const shareInput = $('shareInput');
const toastBar = $('toastBar');

/* ---------- 可选的 LLM 增强：默认关闭，全离线可跑 ---------- */
const params = new URLSearchParams(location.search);
const llmEndpoint = params.get('llm') || window.CGM_LLM_ENDPOINT || '';
const llm = createLLM({ endpoint: llmEndpoint });

/* ---------- 状态 ---------- */
let interview = new Interview(content, content.defaultQuestionId);
let world = emptyWorld(content);
let game = new Game(canvas, world, { activities: content.activities });
let finished = false;

const checklist = new Checklist($('checklist'), interview.flow.steps.map((s) => ({
  key: s.key,
  label: interview.stepLabel(s.key)
})));

const chat = new ChatUI({
  messagesEl: $('msgs'),
  optionsEl: $('opts'),
  composerEl: $('composer'),
  inputEl: $('input'),
  onPick: (opt) => submit(opt),
  onSubmit: (text) => submit(text)
});

game.start();

/* ---------- 世界刷新 ---------- */
function refreshWorld() {
  world = buildWorld(interview.answers, content);
  const now = performance.now();
  const plan = spawnPlan(world).map((p) => ({ kind: p.kind, born: now + p.born }));
  game.setWorld(world, plan);
  titleEl.textContent = world.title;
}

/** 回答一题 */
function submit(choice) {
  if (finished) return;
  const res = interview.answer(choice);
  if (!res) return;
  chat.clearOptions();
  chat.push(res.userText, 'me');
  checklist.mark(res.stepKey);
  refreshWorld();

  const el = chat.push(res.reply, 'ai');

  // 配了后端代理才用模型改写文案；失败就留着素材原句，绝不打断流程
  if (llm) {
    const step = interview.flow.steps[interview.index - 1];
    const material = res.reply;
    llm.polish(buildPrompt({
      step,
      choiceLabel: typeof choice === 'string' ? choice : choice.t,
      userText: res.userText,
      materialReply: material
    })).then((text) => { if (text && el) el.textContent = text; });
  }

  if (res.done) {
    finish();
  } else {
    setTimeout(() => {
      chat.push(interview.step.q, 'ai');
      chat.setOptions(interview.options());
    }, 700);
  }
}

function finish() {
  finished = true;
  refreshWorld();
  setTimeout(() => chat.push(interview.outro(world.activities.length)[0], 'ai'), 500);
  setTimeout(() => {
    chat.push(interview.outro()[1], 'sys');
    playBtn.disabled = false;
    $('exportBtn').disabled = false;
    $('shareBtn').disabled = false;
    controls.textContent = '点「进去玩」开始 · 也可以先导出存档或复制分享链接';
  }, 1500);
}

/* ---------- 按钮 ---------- */
playBtn.addEventListener('click', () => {
  if (!finished) return;
  if (game.mode === 'play') { game.restart(); }
  else {
    game.enterPlay();
    chat.push('（你已经走进了' + world.title + '）', 'sys');
  }
  playBtn.textContent = '重玩一次';
  controls.textContent = '方向键 / WASD 移动 · 空格 交互 · R 重来 · 手机上是点地面走过去 + 右下角「交互」';
});

$('exportBtn').addEventListener('click', () => {
  const blob = new Blob([toSave(world)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (world.title || 'my-childhood') + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  flash('已导出 ' + a.download);
});

$('shareBtn').addEventListener('click', async () => {
  const url = shareUrl(world);
  shareBox.hidden = false;
  shareInput.value = url;
  shareInput.select();
  let ok = false;
  try {
    await navigator.clipboard.writeText(url);
    ok = true;
  } catch (e) { ok = false; }
  flash(ok ? '分享链接已复制，发给想让他玩的人' : '链接已生成，请手动复制（浏览器不让自动复制）');
});

$('copyBtn').addEventListener('click', () => {
  shareInput.select();
  try { document.execCommand('copy'); flash('已复制'); } catch (e) { flash('请手动复制'); }
});

$('importBtn').addEventListener('click', () => $('importInput').click());
$('importInput').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const answers = parseSave(String(reader.result));
      applyAnswers(answers);
      flash('导入成功：' + world.title);
    } catch (err) {
      flash('这个文件读不出来：' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

$('redoBtn').addEventListener('click', () => {
  interview.reset();
  finished = false;
  checklist.reset();
  $('msgs').innerHTML = '';
  chat.clearOptions();
  shareBox.hidden = true;
  playBtn.disabled = true;
  playBtn.textContent = '进去玩 →';
  $('exportBtn').disabled = true;
  $('shareBtn').disabled = true;
  controls.textContent = '回答左边的问题，右边的世界会长出来';
  titleEl.textContent = '还没起名';
  world = emptyWorld(content);
  game.setWorld(world, []);
  game.mode = 'build';
  interview.flow.intro.forEach((t) => chat.push(t, 'ai'));
  setTimeout(() => {
    chat.push(interview.step.q, 'ai');
    chat.setOptions(interview.options());
  }, 700);
});

/** 从存档/分享链接直接进游戏（跳过采访，但把答案回显一遍，让人知道这是谁的童年） */
function applyAnswers(answers) {
  interview.reset();
  Object.assign(interview.answers, {
    region: answers.region,
    terrain: answers.terrain,
    activity1: answers.activity1,
    activity2: answers.activity2,
    call: answers.call,
    title: answers.title
  });
  interview.index = interview.flow.steps.length;
  finished = true;
  interview.flow.steps.forEach((s) => checklist.mark(s.key));
  refreshWorld();
  playBtn.disabled = false;
  $('exportBtn').disabled = false;
  $('shareBtn').disabled = false;
  chat.push('这是别人做好的一个童年，直接打开就能玩。', 'sys');
  chat.push(world.regionName + ' · ' + world.activities.map((a) => content.activities[a].label).join('、'), 'ai');
  controls.textContent = '点「进去玩」开始';
}

function flash(text) {
  toastBar.textContent = text;
  toastBar.hidden = false;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => { toastBar.hidden = true; }, 3200);
}

/* ---------- 启动 ---------- */
const shared = readShareFromLocation();
if (shared) {
  applyAnswers(shared);
} else {
  interview.flow.intro.forEach((t) => chat.push(t, 'ai'));
  setTimeout(() => {
    chat.push(interview.step.q, 'ai');
    chat.setOptions(interview.options());
  }, 900);
}
