// ぷち戦車 Service Worker
// v1.20: HTMLの更新を反映するため、画面遷移はネットワーク優先にする。
const CACHE_NAME = "puchi-tank-v1.22";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./flowerbed_fields_64k.mp3"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(ASSETS.map(async url => {
      try {
        const response = await fetch(new Request(url, { cache: "reload" }));
        if (response.ok) await cache.put(url, response);
      } catch (e) {
        // 取得できない任意ファイルがあってもインストール全体は失敗させない。
        console.warn("Offline cache skipped:", url);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  // HTMLナビゲーションは必ずネットワークを先に確認し、最新版をキャッシュへ反映。
  // オフラインの場合だけ保存済みHTMLを返す。
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(new Request(request, { cache: "no-store" }));
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
          return response;
        }
      } catch (e) {
        // オフライン時は下のキャッシュにフォールバック。
      }
      return (await caches.match(request))
        || (await caches.match("./index.html"))
        || (await caches.match("./"))
        || Response.error();
    })());
    return;
  }

  // 画像・音声などはキャッシュ優先。未キャッシュならネットワークから取得する。
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.ok && new URL(request.url).origin === self.location.origin) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
