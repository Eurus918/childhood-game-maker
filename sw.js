/**
 * Service Worker：让装到桌面的 PWA 能离线打开。
 *
 * 策略刻意保持简单（零依赖、零构建，一眼能看完）：
 *  - 页面导航：网络优先，断网回退到缓存的 index.html —— 分享链接永远先拿最新的；
 *  - 其它同源 GET（模块、画、图标）：缓存优先，后台悄悄更新（stale-while-revalidate）。
 *
 * 改了代码想强制所有人更新：把 CACHE_VER 加一就行。
 */

const CACHE_VER = 'cgm-v2';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/scenes/yard.jpg',
  './assets/scenes/indoor.jpg',
  './assets/scenes/orchard.jpg',
  './assets/scenes/stream.jpg',
  './assets/scenes/field.jpg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_VER);
    // core 里有一个失败就整体不算装好，避免出现半个缓存
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VER).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 别碰别人家的资源

  // 页面导航：网络优先
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_VER);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (err) {
        const cache = await caches.open(CACHE_VER);
        return (await cache.match('./index.html')) || (await cache.match('./')) ||
          new Response('离线中，第一次打开需要联网', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  // 其它同源资源：缓存优先，后台更新
  e.respondWith((async () => {
    const cache = await caches.open(CACHE_VER);
    const hit = await cache.match(req);
    const fresh = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return hit || (await fresh) || new Response('', { status: 504 });
  })());
});
