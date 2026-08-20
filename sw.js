/* =========================================================
   家人档案 · Service Worker
   离线能力：首次访问后缓存全部资源，之后可完全离线使用
   更新方式：改动版本号 CACHE_NAME，重新部署即可
   ========================================================= */
'use strict';

const CACHE_NAME = 'family-profile-v1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

/* 安装：预缓存核心资源 */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(PRECACHE_ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

/* 激活：清理旧缓存 */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

/* 请求：缓存优先，网络兜底，离线时回退到首页 */
self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 只处理同源请求（本地资源）
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 导航请求（打开页面）走 network-first，保证及时拿到最新版
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // 静态资源：缓存优先
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
        }
        return res;
      }).catch(function () { return new Response('', { status: 408, statusText: 'offline' }); });
    })
  );
});
