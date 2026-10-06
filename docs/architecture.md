# 架构

一句话：**引擎是标准化的，内容是个性化的，二者之间只有一层配置。**

## 分层

```
对话输入
   ↓
interview/     采访引擎：问什么、怎么接住用户的回答
   ↓  answers（几个字符串）
world/builder  编译器：把答案查表编译成一个 world 配置对象
   ↓  world（纯数据）
engine/        引擎：渲染、碰撞、昼夜、玩法机制
   ↑
content/       素材库：地域配色、玩法文案、提问流（社区共建）
```

关键：**引擎完全不认识"童年"**。它只认识 `world` 里的数字和颜色。
`src/engine/` 里没有"知了"这两个字 —— 知了只存在于 `content/activities/stick-cicada.js`。

换一份素材，同一个引擎跑出来就是另一种童年。

## 目录

| 路径 | 职责 |
| --- | --- |
| `src/engine/game.js` | 主循环、状态机（build / play）、交互分发 |
| `src/engine/renderer.js` | 只画，不算。所有颜色来自 `world.palette` |
| `src/engine/actions.js` | 玩法机制（怎么随机、何时失败） |
| `src/engine/collision.js` | 碰撞体，也是可达性的唯一真相来源 |
| `src/engine/daynight.js` | 昼夜循环（96 秒一轮） |
| `src/engine/input.js` | 键盘 + 触屏 |
| `src/engine/audio.js` | WebAudio 现场合成，仓库里没有音频文件 |
| `src/world/layout.js` | 固定模板：地图坐标、树的位置 ⚠️ 改这里要跑测试 |
| `src/world/builder.js` | 答案 → world 配置 |
| `src/world/serialize.js` | 存档导出/导入、分享链接编解码 |
| `src/interview/` | 采访流程、关键词匹配、可选 LLM 适配器 |
| `src/ui/` | 对话面板和清单，不含业务逻辑 |
| `content/` | 素材库（CC BY 4.0，社区共建） |

## 为什么不让 AI 自己发明玩法

这是整个项目最重要的一次取舍。

让模型自由生成玩法，结果基本跑不起来：坐标会飘、碰撞会穿、
条件永远不满足。而这类产品的用户是普通人，跑不起来就等于没做。

所以：

- **玩法机制写死在代码里**（`actions.js`），模型碰不到
- **素材和文案在 content 里**，模型最多改改写的话（`llm.js`）
- **地图布局写死在 `layout.js`**，一个像素都不让模型动

代价是全世界长一个样。我们选这个代价，因为这个产品的价值在
"像不像我的童年"，不在"关卡设计多精巧"。

## 关于 API Key

`src/interview/llm.js` 只接受一个你自己搭的后端代理地址，**不接受 Key**。

浏览器里的任何字符串都会被看到。把 Key 写进前端，等于把钱包密码贴门上。
默认不配置 endpoint 时，整个产品完全离线可跑。

## 测试策略

`npm test` 里有一类特别的测试：**可达性校验**（`test/reach.test.js`）。

它把所有「地域 × 地形 × 玩法」的组合都跑一遍 BFS，
确认玩家从出生点能走到每个玩法点。

原因是：新增一棵树、挪一下池塘，很容易把某个玩法点堵死。
这种 bug 画面上完全看不出来 —— 地图照常显示，玩家却永远走不过去。
只能靠测。
