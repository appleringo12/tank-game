const CACHE_NAME = "puchi-tank-v1-offline";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./flowerbed_fields_64k.mp3"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // BGMなど一部ファイルがまだGitHub側にない場合でも、SW自体の導入を失敗させない。
    await Promise.all(ASSETS.map(async url => {
      try {
        const response = await fetch(url, { cache: "no-cache" });
        if (response.ok) await cache.put(url, response);
      } catch (e) {
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
  if (event.request.method !== "GET") return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok && new URL(event.request.url).origin === self.location.origin) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch (e) {
      // オフライン時にキャッシュが無いリソースだけ失敗する。
      throw e;
    }
  })());
});
