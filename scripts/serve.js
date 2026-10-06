/**
 * 零依赖静态服务器。
 *
 * 这个项目刻意不用打包工具：源码就是产物，clone 下来直接跑。
 * 代价是 ES Module 不能走 file://（浏览器的 CORS 限制），
 * 所以给一个 30 行的服务器 —— 不装任何依赖也能开发。
 *
 *   node scripts/serve.js         # 打开 http://localhost:5173
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
    let filePath = join(ROOT, normalize(urlPath));
    // 别让人跳出项目目录
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('403');
      return;
    }
    const info = await stat(filePath).catch(() => null);
    if (info && info.isDirectory()) filePath = join(filePath, 'index.html');

    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 ' + (req.url || ''));
  }
});

server.listen(PORT, () => {
  console.log('童年游戏制作小助手已启动 → http://localhost:' + PORT);
  console.log('（改 src/ 或 content/ 里的文件，刷新页面即可，不用重启）');
});
