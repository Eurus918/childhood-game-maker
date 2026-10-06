# 参与贡献

最欢迎的贡献不是代码，是**你自己的童年**。

## 一分钟上手

```bash
git clone https://github.com/Eurus918/childhood-game-maker.git
cd childhood-game-maker
node scripts/serve.js          # 不需要 npm install，没有任何依赖
# 打开 http://localhost:5173
```

改 `src/` 或 `content/` 里的文件，刷新页面就能看到，不用重启、不用打包。

## 三种贡献方式

### 1. 加一份童年素材（新手最推荐，五分钟）

见 [`content/README.md`](content/README.md)。

复制一个现成文件改改，在 `index.js` 里加一行。不需要懂代码。
你的家乡、你小时候玩的那件事，很可能现在库里还没有。

### 2. 加一整代人的提问流

`content/questions/` 里现在是 80/90 后。
如果你是 60/70 后，或者你想给 2010 后的小孩做，复制一份改提问即可 —— 不用动代码。

### 3. 改代码

```bash
node --test test/*.test.js     # 提交前跑一遍
```

代码结构见 [`docs/architecture.md`](docs/architecture.md)。

## 提交前请确认

- [ ] `node --test test/*.test.js` 全绿
- [ ] 如果你改了 `src/world/layout.js`（地图坐标、树的位置），**必须跑测试** ——
      里面有 BFS 可达性校验，会检查每个玩法点玩家能不能走到。
      这类 bug 画面上看不出来，只能靠测。
- [ ] 新素材的 `keywords` 不会和现有素材抢同一个词（抢了会让匹配变随机）
- [ ] 文案里没有"亲爱的用户""快来体验吧"这种机器味的话

## 一条重要的边界

如果你要加一个**新玩法**，注意分工：

- 玩法**机制**（怎么随机、什么时候成功）写在 `src/engine/actions.js`
- 玩法**文案和参数**（说什么话、成功率多少）写在 `content/activities/`

不要试图让 AI 或配置去发明玩法。这是这个项目能跑起来的前提，
详见 README 里的「为什么不让 AI 自己发明玩法」。

## 行为准则

参与前请看 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
简单说：这里聊的是童年，大家温和一点。
